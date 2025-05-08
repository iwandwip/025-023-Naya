from flask import Flask, render_template, Response, jsonify
from flask_socketio import SocketIO
import cv2
import threading
import time
import detection

app = Flask(__name__)
socketio = SocketIO(app)

detector = None
output_frame = None
frame_lock = threading.Lock()


def initialize_detector():
    global detector
    model_path = "models/yolov5s.pt"
    config_path = "products.yaml"
    detector = detection.ProductDetector(model_path=model_path, config_path=config_path)


def generate_frames():
    global output_frame
    while True:
        with frame_lock:
            if output_frame is None:
                continue
            (flag, encoded_image) = cv2.imencode(".jpg", output_frame)
            if not flag:
                continue
            yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' +
                   bytearray(encoded_image) + b'\r\n')
        time.sleep(0.05)


def detection_loop():
    global detector, output_frame

    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    zone_start_percent = 70
    zone_width_percent = 20

    try:
        while True:
            success, frame = cap.read()
            if not success:
                time.sleep(0.1)
                continue

            counting_zone_x = int(frame_width * zone_start_percent / 100)
            counting_zone_width = int(frame_width * zone_width_percent / 100)

            if detector.is_running:
                processed_frame, detected_objects = detector.detect_objects(frame)

                current_time = time.time()
                current_objects = set()

                for obj in detected_objects:
                    label = obj['label']
                    box = obj['box']
                    center_x = obj['center'][0]
                    object_id = f"{label}_{box[0]}_{box[1]}"
                    current_objects.add(object_id)

                    if center_x > counting_zone_x and center_x < counting_zone_x + counting_zone_width and object_id not in detector.counted_objects:
                        detector.add_to_cart(label)
                        detector.counted_objects[object_id] = True

                        socketio.emit('cart_update', {
                            'cart': detector.get_cart(),
                            'total': detector.calculate_total()
                        })
            else:
                processed_frame = frame.copy()

            zone_start = (counting_zone_x, 0)
            zone_end = (counting_zone_x, frame_height)

            zone_end_right = (counting_zone_x + counting_zone_width, 0)
            zone_start_right = (counting_zone_x + counting_zone_width, frame_height)

            overlay = processed_frame.copy()
            cv2.rectangle(overlay, (counting_zone_x, 0), (counting_zone_x + counting_zone_width, frame_height), (0, 0, 255), -1)
            cv2.addWeighted(overlay, 0.2, processed_frame, 0.8, 0, processed_frame)

            cv2.line(processed_frame, zone_start, zone_end, (0, 0, 255), 2)
            cv2.line(processed_frame, zone_end_right, zone_start_right, (0, 0, 255), 2)

            zone_text = "COUNTING ZONE"
            text_size = cv2.getTextSize(zone_text, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)[0]
            text_x = counting_zone_x + (counting_zone_width - text_size[0]) // 2
            text_y = 30

            cv2.rectangle(processed_frame, (text_x - 5, text_y - text_size[1] - 5),
                          (text_x + text_size[0] + 5, text_y + 5), (0, 0, 255), -1)
            cv2.putText(processed_frame, zone_text, (text_x, text_y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

            settings_text = f"Zone Start: {zone_start_percent}%, Width: {zone_width_percent}%"
            cv2.putText(processed_frame, settings_text, (10, frame_height - 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

            with frame_lock:
                output_frame = processed_frame.copy()
    finally:
        cap.release()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


@socketio.on('connect')
def handle_connect():
    print('Client connected')


@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')


@socketio.on('start_scanning')
def handle_start_scanning(data):
    global detector
    detector.clear_cart()
    detector.is_running = True
    print(f"Scanning started with zone start: {data['zone_start']}%, width: {data['zone_width']}%")


@socketio.on('stop_scanning')
def handle_stop_scanning():
    global detector
    detector.is_running = False
    socketio.emit('scanning_complete', {
        'cart': detector.get_cart(),
        'total': detector.calculate_total()
    })
    print("Scanning stopped")


@socketio.on('update_zone')
def handle_update_zone(data):
    global zone_start_percent, zone_width_percent
    zone_start_percent = data['zone_start']
    zone_width_percent = data['zone_width']
    print(f"Zone updated - start: {zone_start_percent}%, width: {zone_width_percent}%")


if __name__ == '__main__':
    initialize_detector()
    detection_thread = threading.Thread(target=detection_loop)
    detection_thread.daemon = True
    detection_thread.start()
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
