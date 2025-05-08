from flask import Flask, render_template, Response, jsonify
from flask_socketio import SocketIO
import threading
import time
import numpy as np
import os

from CameraHandler import Camera
from DetectorManager import DetectorManager
from ProductManager import ProductManager


class SelfCheckoutApp:
    def __init__(self, host='0.0.0.0', port=5000):
        self.app = Flask(__name__)
        self.socketio = SocketIO(self.app)
        self.product_manager = ProductManager(config_path="products.yaml")
        self.camera = Camera()
        self.detector_manager = DetectorManager(model_path="models/yolov5s.pt", product_manager=self.product_manager)
        self.frame_lock = threading.Lock()
        self.output_frame = None
        self.host = host
        self.port = port
        self.register_routes()
        self.register_socket_events()
        self.processing_thread = None
        self.is_processing = False
        self.processing_lock = threading.Lock()

    def register_routes(self):
        @self.app.route('/')
        def index():
            return render_template('index.html')

        @self.app.route('/video_feed')
        def video_feed():
            return Response(self.generate_frames(),
                            mimetype='multipart/x-mixed-replace; boundary=frame')

    def register_socket_events(self):
        @self.socketio.on('connect')
        def handle_connect():
            print('Client connected')

        @self.socketio.on('disconnect')
        def handle_disconnect():
            print('Client disconnected')

        @self.socketio.on('start_scanning')
        def handle_start_scanning(data):
            self.detector_manager.set_zone_parameters(data['zone_start'], data['zone_width'])
            self.start_camera_processing()
            self.detector_manager.start_scanning()
            print(f"Scanning started with zone start: {data['zone_start']}%, width: {data['zone_width']}%")

        @self.socketio.on('stop_scanning')
        def handle_stop_scanning():
            self.detector_manager.stop_scanning()
            self.socketio.emit('scanning_complete', {
                'cart': self.detector_manager.get_cart(),
                'total': self.detector_manager.calculate_total()
            })
            print("Scanning stopped")

        @self.socketio.on('update_zone')
        def handle_update_zone(data):
            self.detector_manager.set_zone_parameters(data['zone_start'], data['zone_width'])
            print(f"Zone updated - start: {data['zone_start']}%, width: {data['zone_width']}%")

        @self.socketio.on('clear_cart')
        def handle_clear_cart():
            self.detector_manager.clear_cart()
            self.socketio.emit('cart_update', {
                'cart': {},
                'total': 0
            })
            print("Cart cleared")

        @self.socketio.on('get_products')
        def handle_get_products():
            products = self.product_manager.get_products()
            self.socketio.emit('products_list', products)
            print(f"Sent {len(products)} products to client")

        @self.socketio.on('add_product')
        def handle_add_product(data):
            result = self.product_manager.add_product(data['name'], data['price'])
            self.socketio.emit('product_added', result)
            print(f"Added product: {result['name']} - Rp {result['price']}")

        @self.socketio.on('update_product')
        def handle_update_product(data):
            result = self.product_manager.update_product(data['name'], data['price'])
            if result:
                self.socketio.emit('product_updated', result)
                print(f"Updated product: {result['name']} - Rp {result['price']}")

        @self.socketio.on('delete_product')
        def handle_delete_product(data):
            result = self.product_manager.delete_product(data['name'])
            if result:
                self.socketio.emit('product_deleted', result)
                print(f"Deleted product: {result['name']}")

    def processing_loop(self):
        try:
            while self.is_processing:
                success, frame = self.camera.read()

                if not success:
                    blank_frame = np.zeros((480, 640, 3), dtype=np.uint8)
                    text = "Camera not available"
                    font = cv2.FONT_HERSHEY_SIMPLEX
                    textsize = cv2.getTextSize(text, font, 1, 2)[0]
                    textX = (blank_frame.shape[1] - textsize[0]) // 2
                    textY = (blank_frame.shape[0] + textsize[1]) // 2
                    cv2.putText(blank_frame, text, (textX, textY), font, 1, (255, 255, 255), 2)

                    with self.frame_lock:
                        self.output_frame = blank_frame.copy()
                    time.sleep(0.5)
                    continue

                frame_width, frame_height = self.camera.get_dimensions()
                processed_frame = self.detector_manager.process_frame(frame, frame_width, frame_height)

                with self.frame_lock:
                    self.output_frame = processed_frame.copy()

                if self.detector_manager.is_scanning:
                    self.socketio.emit('cart_update', {
                        'cart': self.detector_manager.get_cart(),
                        'total': self.detector_manager.calculate_total()
                    })

                time.sleep(0.03)
        finally:
            self.camera.stop()

    def start_camera_processing(self):
        with self.processing_lock:
            if self.is_processing:
                return

            if self.camera.start():
                self.is_processing = True
                self.processing_thread = threading.Thread(target=self.processing_loop)
                self.processing_thread.daemon = True
                self.processing_thread.start()
            else:
                print("Failed to start camera")

    def stop_camera_processing(self):
        with self.processing_lock:
            self.is_processing = False
            if self.processing_thread:
                self.processing_thread.join(timeout=1.0)
                self.processing_thread = None
            self.camera.stop()

    def generate_frames(self):
        import cv2
        blank_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        text = "Press 'Start Scanning' to begin"
        font = cv2.FONT_HERSHEY_SIMPLEX
        textsize = cv2.getTextSize(text, font, 1, 2)[0]
        textX = (blank_frame.shape[1] - textsize[0]) // 2
        textY = (blank_frame.shape[0] + textsize[1]) // 2
        cv2.putText(blank_frame, text, (textX, textY), font, 1, (255, 255, 255), 2)

        with self.frame_lock:
            self.output_frame = blank_frame.copy()

        while True:
            with self.frame_lock:
                if self.output_frame is None:
                    continue

                _, encoded_image = cv2.imencode(".jpg", self.output_frame)

            yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' +
                   bytearray(encoded_image) + b'\r\n')

            time.sleep(0.03)

    def run(self):
        self.socketio.run(self.app, host=self.host, port=self.port, debug=False, allow_unsafe_werkzeug=True)


if __name__ == '__main__':
    import cv2
    app = SelfCheckoutApp()
    app.run()
