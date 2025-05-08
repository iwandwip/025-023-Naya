from flask import Flask, render_template, Response, jsonify
from flask_socketio import SocketIO
import cv2
import threading
import time
import detection
import numpy as np
import yaml
import os


class Camera:
    def __init__(self, camera_id=0):
        self.camera_id = camera_id
        self.cap = None
        self.is_running = False
        self.frame = None
        self.lock = threading.Lock()
        self.frame_width = 640
        self.frame_height = 480

    def start(self):
        if self.is_running:
            return False

        try:
            self.cap = cv2.VideoCapture(self.camera_id, cv2.CAP_DSHOW)
            if not self.cap.isOpened():
                self.cap = cv2.VideoCapture(self.camera_id)

            if not self.cap.isOpened():
                print(f"Error: Could not open camera with index {self.camera_id}")
                return False

            self.frame_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            self.frame_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            self.is_running = True
            return True
        except Exception as e:
            print(f"Error starting camera: {e}")
            return False

    def stop(self):
        self.is_running = False
        if self.cap and self.cap.isOpened():
            self.cap.release()
            self.cap = None
        return True

    def read(self):
        if not self.is_running or not self.cap or not self.cap.isOpened():
            return False, None

        return self.cap.read()

    def get_dimensions(self):
        return (self.frame_width, self.frame_height)


class ProductManager:
    def __init__(self, config_path="products.yaml"):
        self.config_path = config_path
        self.products = {}
        self.load_products()

    def load_products(self):
        if os.path.exists(self.config_path):
            with open(self.config_path, 'r') as file:
                config = yaml.safe_load(file)
                if config and 'products' in config:
                    for product, details in config['products'].items():
                        self.products[product.lower()] = details['price']
                    print(f"Loaded {len(self.products)} products from config")
                else:
                    self.products = {}
                    print("No products found in config, using empty catalog")
        else:
            self.products = {}
            print(f"Config file {self.config_path} not found, using empty catalog")
            self.save_products()

    def save_products(self):
        config = {"products": {}}
        for product, price in self.products.items():
            config["products"][product] = {"price": price}

        with open(self.config_path, 'w') as file:
            yaml.dump(config, file, default_flow_style=False)
        print(f"Saved {len(self.products)} products to config")

    def get_products(self):
        return self.products

    def add_product(self, name, price):
        name_lower = name.lower()
        self.products[name_lower] = price
        self.save_products()
        return {"name": name_lower, "price": price}

    def update_product(self, name, price):
        name_lower = name.lower()
        if name_lower in self.products:
            self.products[name_lower] = price
            self.save_products()
            return {"name": name_lower, "price": price}
        return None

    def delete_product(self, name):
        name_lower = name.lower()
        if name_lower in self.products:
            del self.products[name_lower]
            self.save_products()
            return {"name": name_lower}
        return None


class DetectorManager:
    def __init__(self, model_path, product_manager):
        self.detector = detection.ProductDetector(model_path=model_path, config_path=product_manager.config_path)
        self.product_manager = product_manager
        self.is_scanning = False
        self.lock = threading.Lock()
        self.zone_start_percent = 70
        self.zone_width_percent = 20

    def set_zone_parameters(self, start_percent, width_percent):
        self.zone_start_percent = start_percent
        self.zone_width_percent = width_percent

    def start_scanning(self):
        with self.lock:
            self.detector.clear_cart()
            self.is_scanning = True

    def stop_scanning(self):
        with self.lock:
            self.is_scanning = False

    def process_frame(self, frame, frame_width, frame_height):
        if frame is None:
            blank = np.zeros((480, 640, 3), dtype=np.uint8)
            return blank

        counting_zone_x = int(frame_width * self.zone_start_percent / 100)
        counting_zone_width = int(frame_width * self.zone_width_percent / 100)

        if self.is_scanning:
            self.detector.product_catalog = self.product_manager.get_products()
            processed_frame, detected_objects = self.detector.detect_objects(frame)

            current_time = time.time()
            current_objects = set()

            for obj in detected_objects:
                label = obj['label']
                box = obj['box']
                center_x = obj['center'][0]
                object_id = f"{label}_{box[0]}_{box[1]}"
                current_objects.add(object_id)

                if center_x > counting_zone_x and center_x < counting_zone_x + counting_zone_width and object_id not in self.detector.counted_objects:
                    self.detector.add_to_cart(label)
                    self.detector.counted_objects[object_id] = True
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

        settings_text = f"Zone Start: {self.zone_start_percent}%, Width: {self.zone_width_percent}%"
        cv2.putText(processed_frame, settings_text, (10, frame_height - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        return processed_frame

    def get_cart(self):
        return self.detector.get_cart()

    def calculate_total(self):
        return self.detector.calculate_total()

    def clear_cart(self):
        self.detector.clear_cart()


class SelfCheckoutApp:
    def __init__(self, host='0.0.0.0', port=5000):
        self.app = Flask(__name__)
        self.socketio = SocketIO(self.app)
        self.camera = Camera()
        self.product_manager = ProductManager(config_path="products.yaml")
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
    app = SelfCheckoutApp()
    app.run()
