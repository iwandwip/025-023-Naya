from flask import Flask, render_template, Response, jsonify
from flask_socketio import SocketIO
import threading
import time
import numpy as np
import os
import cv2
import datetime
import json

from CameraHandler import Camera
from DetectorManager import DetectorManager
from ProductManager import ProductManager
from FirestoreManager import FirestoreManager


def format_transaction_for_json(transaction):
    formatted_transaction = transaction.copy()

    if 'timestamp' in formatted_transaction and formatted_transaction['timestamp']:
        timestamp = formatted_transaction['timestamp']
        if hasattr(timestamp, 'isoformat'):
            formatted_transaction['timestamp'] = timestamp.isoformat()
        elif hasattr(timestamp, 'timestamp'):
            formatted_transaction['timestamp'] = timestamp.timestamp()

    return formatted_transaction


class SelfCheckoutApp:
    def __init__(self, host='0.0.0.0', port=5000):
        self.app = Flask(__name__)
        self.socketio = SocketIO(self.app)
        self.firestore_manager = FirestoreManager()
        self.product_manager = ProductManager(self.firestore_manager)
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
            zone_start = data.get('zoneStart', 70)
            zone_width = data.get('zoneWidth', 20)
            self.detector_manager.set_zone_parameters(zone_start, zone_width)
            self.start_camera_processing()
            self.detector_manager.start_scanning()
            print(f"Scanning started with zone start: {zone_start}%, width: {zone_width}%")

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

        @self.socketio.on('remove_item')
        def handle_remove_item(data):
            result = self.detector_manager.remove_item(data['name'])
            if result:
                self.socketio.emit('cart_update', {
                    'cart': self.detector_manager.get_cart(),
                    'total': self.detector_manager.calculate_total()
                })
                self.socketio.emit('item_removed', {
                    'success': True,
                    'name': data['name']
                })
                print(f"Removed item: {data['name']} from cart")
            else:
                self.socketio.emit('item_removed', {
                    'success': False,
                    'name': data['name']
                })
                print(f"Failed to remove item: {data['name']} (not found)")

        @self.socketio.on('checkout_complete')
        def handle_checkout_complete(data=None):
            cart = self.detector_manager.get_cart()
            total = self.detector_manager.calculate_total()

            if self.firestore_manager.is_connected():
                transaction = self.firestore_manager.save_transaction(cart, total)
                if transaction:
                    print(f"Transaction saved to Firestore with ID: {transaction['id']}")

            self.detector_manager.clear_cart()
            self.socketio.emit('cart_update', {
                'cart': {},
                'total': 0
            })
            print("Checkout completed and cart cleared")

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

        @self.socketio.on('get_transaction_history')
        def handle_get_transaction_history(data=None):
            if not self.firestore_manager.is_connected():
                self.socketio.emit('transaction_history', [])
                return

            limit = data.get('limit', 20) if data else 20
            transactions = self.firestore_manager.get_transactions(limit=limit)

            formatted_transactions = []
            for transaction in transactions:
                formatted_transaction = format_transaction_for_json(transaction)

                if formatted_transaction.get('timestamp'):
                    timestamp = transaction.get('timestamp')
                    if hasattr(timestamp, 'strftime'):
                        formatted_transaction['formatted_date'] = timestamp.strftime('%Y-%m-%d %H:%M:%S')
                    else:
                        formatted_transaction['formatted_date'] = str(timestamp)

                formatted_transactions.append(formatted_transaction)

            self.socketio.emit('transaction_history', formatted_transactions)
            print(f"Sent {len(formatted_transactions)} transactions to client")

        @self.socketio.on('get_transactions_by_date')
        def handle_get_transactions_by_date(data):
            if not self.firestore_manager.is_connected():
                self.socketio.emit('transaction_history', [])
                return

            start_date = data.get('start_date')
            end_date = data.get('end_date')

            if not start_date or not end_date:
                transactions = self.firestore_manager.get_transactions()
            else:
                transactions = self.firestore_manager.get_transactions_by_date_range(start_date, end_date)

            formatted_transactions = []
            for transaction in transactions:
                formatted_transaction = format_transaction_for_json(transaction)

                if formatted_transaction.get('timestamp'):
                    timestamp = transaction.get('timestamp')
                    if hasattr(timestamp, 'strftime'):
                        formatted_transaction['formatted_date'] = timestamp.strftime('%Y-%m-%d %H:%M:%S')
                    else:
                        formatted_transaction['formatted_date'] = str(timestamp)

                formatted_transactions.append(formatted_transaction)

            self.socketio.emit('transaction_history', formatted_transactions)
            print(f"Sent {len(formatted_transactions)} transactions by date range to client")

        @self.socketio.on('delete_transaction')
        def handle_delete_transaction(data):
            if not self.firestore_manager.is_connected():
                self.socketio.emit('transaction_deleted', {
                    'success': False,
                    'message': 'Firestore not connected'
                })
                return

            transaction_id = data.get('id')
            if not transaction_id:
                self.socketio.emit('transaction_deleted', {
                    'success': False,
                    'message': 'No transaction ID provided'
                })
                return

            result = self.firestore_manager.delete_transaction(transaction_id)
            if result:
                self.socketio.emit('transaction_deleted', {
                    'success': True,
                    'id': transaction_id
                })
                print(f"Deleted transaction with ID: {transaction_id}")
            else:
                self.socketio.emit('transaction_deleted', {
                    'success': False,
                    'message': 'Failed to delete transaction'
                })

        @self.socketio.on('toggle_simulation')
        def handle_toggle_simulation(data):
            enabled = data.get('enabled', False)
            self.detector_manager.toggle_simulation_mode(enabled)
            self.socketio.emit('simulation_toggled', {
                'enabled': enabled,
                'message': 'Simulation mode enabled' if enabled else 'Real detection mode enabled'
            })
            print(f"Simulation mode: {'ON' if enabled else 'OFF'}")

        @self.socketio.on('add_simulated_object')
        def handle_add_simulated_object(data):
            label = data.get('label', 'person')
            x = int(data.get('x', 100))
            y = int(data.get('y', 100))
            width = int(data.get('width', 100))
            height = int(data.get('height', 100))

            obj_id = self.detector_manager.add_simulated_object(label, x, y, width, height)

            self.socketio.emit('simulated_object_added', {
                'success': True,
                'obj_id': obj_id,
                'label': label,
                'x': x,
                'y': y,
                'width': width,
                'height': height
            })
            print(f"Added simulated object: {label} at ({x}, {y})")

        @self.socketio.on('update_simulated_object')
        def handle_update_simulated_object(data):
            obj_id = data.get('obj_id')
            x = data.get('x')
            y = data.get('y')
            width = data.get('width')
            height = data.get('height')
            label = data.get('label')

            success = self.detector_manager.update_simulated_object(
                obj_id, x=x, y=y, width=width, height=height, label=label
            )

            self.socketio.emit('simulated_object_updated', {
                'success': success,
                'obj_id': obj_id
            })

            if success:
                print(f"Updated simulated object {obj_id}")

        @self.socketio.on('remove_simulated_object')
        def handle_remove_simulated_object(data):
            obj_id = data.get('obj_id')
            success = self.detector_manager.remove_simulated_object(obj_id)

            self.socketio.emit('simulated_object_removed', {
                'success': success,
                'obj_id': obj_id
            })

            if success:
                print(f"Removed simulated object {obj_id}")

        @self.socketio.on('get_simulated_objects')
        def handle_get_simulated_objects():
            objects = self.detector_manager.get_simulated_objects()
            self.socketio.emit('simulated_objects_list', objects)

        @self.socketio.on('move_simulated_object')
        def handle_move_simulated_object(data):
            obj_id = data.get('obj_id')
            direction = data.get('direction')
            step = data.get('step', 10)

            objects = self.detector_manager.get_simulated_objects()
            if obj_id in objects:
                obj = objects[obj_id]
                x, y = obj['x'], obj['y']

                if direction == 'left':
                    x = max(0, x - step)
                elif direction == 'right':
                    x = min(600, x + step)
                elif direction == 'up':
                    y = max(0, y - step)
                elif direction == 'down':
                    y = min(400, y + step)

                self.detector_manager.update_simulated_object(obj_id, x=x, y=y)

                self.socketio.emit('simulated_object_moved', {
                    'success': True,
                    'obj_id': obj_id,
                    'x': x,
                    'y': y
                })

        @self.socketio.on('preset_move_to_zone')
        def handle_preset_move_to_zone(data):
            obj_id = data.get('obj_id')

            frame_width = 640
            zone_start_percent = self.detector_manager.zone_start_percent
            zone_width_percent = self.detector_manager.zone_width_percent

            counting_zone_x = int(frame_width * zone_start_percent / 100)
            counting_zone_width = int(frame_width * zone_width_percent / 100)
            zone_center_x = counting_zone_x + (counting_zone_width // 2)

            y_pos = 150

            success = self.detector_manager.update_simulated_object(
                obj_id, x=zone_center_x - 50, y=y_pos
            )

            self.socketio.emit('simulated_object_moved_to_zone', {
                'success': success,
                'obj_id': obj_id,
                'x': zone_center_x - 50,
                'y': y_pos
            })

            if success:
                print(f"Moved simulated object {obj_id} to counting zone")

        @self.socketio.on('simulate_conveyor_movement')
        def handle_simulate_conveyor_movement(data):
            obj_id = data.get('obj_id')
            speed = data.get('speed', 5)

            self.socketio.emit('conveyor_simulation_started', {
                'obj_id': obj_id,
                'speed': speed
            })

            print(f"Started conveyor simulation for {obj_id}")

        @self.socketio.on('update_detection_config')
        def handle_update_detection_config(data):
            success = self.detector_manager.apply_detection_config(data)
            self.socketio.emit('config_updated', {
                'success': success,
                'type': 'detection',
                'config': data
            })
            if success:
                print(f"Updated detection config: {data}")

        @self.socketio.on('update_visual_config')
        def handle_update_visual_config(data):
            success = self.detector_manager.apply_visual_config(data)
            self.socketio.emit('config_updated', {
                'success': success,
                'type': 'visual',
                'config': data
            })
            if success:
                print(f"Updated visual config: {data}")

        @self.socketio.on('update_advanced_config')
        def handle_update_advanced_config(data):
            success = self.detector_manager.apply_advanced_config(data)
            self.socketio.emit('config_updated', {
                'success': success,
                'type': 'advanced',
                'config': data
            })
            if success:
                print(f"Updated advanced config: {data}")

        @self.socketio.on('apply_preset_config')
        def handle_apply_preset_config(data):
            preset = data
            success = self.detector_manager.apply_preset_config(preset)
            self.socketio.emit('config_applied', {
                'success': success,
                'preset': preset
            })
            if success:
                print(f"Applied preset config: {preset}")

        @self.socketio.on('apply_full_config')
        def handle_apply_full_config(data):
            success = self.detector_manager.apply_full_config(data)
            self.socketio.emit('config_applied', {
                'success': success,
                'config': data
            })
            if success:
                print(f"Applied full configuration")

        @self.socketio.on('save_config')
        def handle_save_config(data):
            success = self.detector_manager.save_config(data)
            self.socketio.emit('config_saved', {
                'success': success
            })
            if success:
                print("Configuration saved")

        @self.socketio.on('load_config')
        def handle_load_config():
            config = self.detector_manager.load_config()
            self.socketio.emit('config_loaded', {
                'success': config is not None,
                'config': config
            })
            print("Configuration loaded")

        @self.socketio.on('reset_config')
        def handle_reset_config():
            success = self.detector_manager.reset_config()
            self.socketio.emit('config_reset', {
                'success': success
            })
            if success:
                print("Configuration reset to defaults")

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
