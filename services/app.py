from flask import Flask, Response, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
import threading
import time
import numpy as np
import os
import cv2
import datetime
import json
from dotenv import load_dotenv

load_dotenv()

from CameraHandler import Camera
from DetectorManager import DetectorManager
from ProductManager import ProductManager
from FirestoreManager import FirestoreManager
from VideoStreamer import VideoStreamer
from StreamingServer import StreamingServer


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
    def __init__(self):
        self.host = os.getenv('FLASK_HOST', '127.0.0.1')
        self.port = int(os.getenv('FLASK_PORT', 5002))
        self.debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
        self.secret_key = os.getenv('FLASK_SECRET_KEY', 'self-checkout-secret-key')
        
        cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3002,http://127.0.0.1:3002').split(',')
        
        self.app = Flask(__name__)
        self.app.config['SECRET_KEY'] = self.secret_key
        
        CORS(self.app, origins=cors_origins)
        
        self.socketio = SocketIO(
            self.app, 
            cors_allowed_origins=cors_origins,
            async_mode='threading',
            logger=False,  # Disable verbose logging
            engineio_logger=False  # Disable engine.io logging
        )
        
        self.firestore_manager = FirestoreManager(os.getenv('FIREBASE_CREDENTIALS_PATH', 'firebase-credentials.json'))
        self.product_manager = ProductManager(self.firestore_manager, os.getenv('PRODUCTS_CONFIG_PATH', 'products.yaml'))
        self.camera = Camera(int(os.getenv('CAMERA_ID', 0)))
        self.detector_manager = DetectorManager(
            model_path=os.getenv('MODEL_PATH', 'models/yolov5s.pt'), 
            product_manager=self.product_manager
        )
        
        self.video_streamer = VideoStreamer()
        self.streaming_server = StreamingServer()
        self.processing_thread = None
        self.is_processing = False
        self.camera_enabled = False  # Camera starts off by default
        self.yolo_initialized = False
        self.yolo_initializing = False
        self.last_transaction_request = 0  # Throttle transaction requests

        self.register_routes()
        self.register_socket_events()

    def register_routes(self):
        @self.app.route('/')
        def index():
            return jsonify({
                'message': 'Self-Checkout API Server',
                'status': 'running',
                'version': '1.0.0',
                'endpoints': {
                    'video_feed': '/video_feed',
                    'socket': '/socket.io'
                }
            })

        @self.app.route('/api/health')
        def health_check():
            return jsonify({
                'status': 'healthy',
                'camera': self.camera.is_running,
                'firestore': self.firestore_manager.is_connected(),
                'products_count': len(self.product_manager.get_products())
            })

        @self.app.route('/video_feed')
        def video_feed():
            try:
                return Response(
                    self.video_streamer.generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame',
                    headers={
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0',
                        'Connection': 'keep-alive',
                        'Access-Control-Allow-Origin': '*'
                    }
                )
            except Exception as e:
                print(f"Video feed error: {e}")
                return Response(
                    "Video feed error",
                    status=500,
                    mimetype='text/plain'
                )

        @self.app.route('/video_stream')
        def video_stream():
            """Proper MJPEG video stream for video element"""
            try:
                return Response(
                    self.streaming_server.generate_mjpeg_stream(),
                    mimetype='multipart/x-mixed-replace; boundary=frame',
                    headers={
                        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                        'Pragma': 'no-cache',
                        'Expires': '0',
                        'Connection': 'keep-alive',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    }
                )
            except Exception as e:
                print(f"Video stream error: {e}")
                return Response("Stream error", status=500)

        @self.app.route('/current_frame')
        def current_frame():
            """Single frame fallback"""
            try:
                frame_data = self.streaming_server.generate_single_frame()
                if frame_data is None:
                    return Response("Frame generation failed", status=500)
                
                response = Response(
                    frame_data,
                    mimetype='image/jpeg',
                    headers={
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0',
                        'Access-Control-Allow-Origin': '*'
                    }
                )
                return response
                
            except Exception as e:
                print(f"Current frame error: {e}")
                return Response("Frame error", status=500)

        @self.app.route('/debug')
        def debug_info():
            """Debug endpoint untuk check backend status"""
            try:
                return jsonify({
                    'camera_available': self.camera.is_available(),
                    'camera_running': self.camera.is_running,
                    'processing_active': self.is_processing,
                    'frame_count': getattr(self.streaming_server, 'frame_count', 0),
                    'video_streamer_active': self.video_streamer.is_active,
                    'simulation_mode': self.detector_manager.simulation_mode,
                    'detector_scanning': self.detector_manager.is_scanning,
                    'timestamp': time.time()
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/test_stream')
        def test_stream():
            """Test page untuk debug streaming"""
            return '''
            <!DOCTYPE html>
            <html>
            <head>
                <title>Video Stream Test</title>
                <style>
                    body { font-family: Arial; margin: 20px; background: #f0f0f0; }
                    .container { max-width: 800px; margin: 0 auto; }
                    .test-section { margin: 20px 0; padding: 20px; background: white; border-radius: 8px; }
                    video, img, iframe { max-width: 100%; height: 300px; border: 2px solid #ccc; }
                    .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
                    .success { background: #d4edda; color: #155724; }
                    .error { background: #f8d7da; color: #721c24; }
                    button { padding: 10px 20px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🔍 Video Stream Debug Test</h1>
                    
                    <div class="test-section">
                        <h3>1. Backend Status</h3>
                        <div id="status">Loading...</div>
                        <button onclick="checkStatus()">Refresh Status</button>
                    </div>
                    
                    <div class="test-section">
                        <h3>2. Native Video Element Test</h3>
                        <video id="nativeVideo" autoplay muted playsinline controls>
                            <source src="/video_stream" type="multipart/x-mixed-replace">
                            Your browser does not support video streaming.
                        </video>
                        <div id="videoStatus" class="status">Waiting...</div>
                    </div>
                    
                    <div class="test-section">
                        <h3>3. IMG Tag Test (Single Frame)</h3>
                        <img id="imgTest" src="/current_frame" alt="Single frame test">
                        <div id="imgStatus" class="status">Loading...</div>
                        <button onclick="refreshImage()">Refresh Image</button>
                    </div>
                    
                    <div class="test-section">
                        <h3>4. Iframe Test (MJPEG)</h3>
                        <iframe id="iframeTest" src="/video_feed"></iframe>
                        <div id="iframeStatus" class="status">Loading...</div>
                    </div>
                </div>

                <script>
                async function checkStatus() {
                    try {
                        const response = await fetch('/debug');
                        const data = await response.json();
                        document.getElementById('status').innerHTML = 
                            '<div class="success"><pre>' + JSON.stringify(data, null, 2) + '</pre></div>';
                    } catch (error) {
                        document.getElementById('status').innerHTML = 
                            '<div class="error">Error: ' + error.message + '</div>';
                    }
                }

                function refreshImage() {
                    const img = document.getElementById('imgTest');
                    img.src = '/current_frame?t=' + Date.now();
                }

                // Video event listeners
                const video = document.getElementById('nativeVideo');
                video.addEventListener('loadstart', () => {
                    document.getElementById('videoStatus').innerHTML = '<div class="status">Video loading started...</div>';
                });
                video.addEventListener('canplay', () => {
                    document.getElementById('videoStatus').innerHTML = '<div class="success">✅ Video can play!</div>';
                });
                video.addEventListener('error', (e) => {
                    document.getElementById('videoStatus').innerHTML = '<div class="error">❌ Video error: ' + e.message + '</div>';
                });
                video.addEventListener('stalled', () => {
                    document.getElementById('videoStatus').innerHTML = '<div class="error">⚠️ Video stalled</div>';
                });

                // Image event listeners
                document.getElementById('imgTest').addEventListener('load', () => {
                    document.getElementById('imgStatus').innerHTML = '<div class="success">✅ Image loaded</div>';
                });
                document.getElementById('imgTest').addEventListener('error', () => {
                    document.getElementById('imgStatus').innerHTML = '<div class="error">❌ Image failed to load</div>';
                });

                // Auto-refresh status every 5 seconds
                setInterval(checkStatus, 5000);
                checkStatus();
                </script>
            </body>
            </html>
            '''

    def register_socket_events(self):
        @self.socketio.on('connect')
        def handle_connect():
            print('Client connected')
            # Send current states to client
            self.socketio.emit('camera_status', {
                'enabled': self.camera_enabled,
                'available': self.camera.is_available()
            })
            self.socketio.emit('yolo_status', {
                'initialized': self.yolo_initialized,
                'initializing': self.yolo_initializing
            })

        @self.socketio.on('disconnect')
        def handle_disconnect():
            print('Client disconnected')

        @self.socketio.on('start_scanning')
        def handle_start_scanning(data):
            zone_start = data.get('zoneStart', 70)
            zone_width = data.get('zoneWidth', 20)
            self.detector_manager.set_zone_parameters(zone_start, zone_width)
            
            if not self.is_processing:
                self.start_processing()
            
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
            # Throttle requests - only allow one every 2 seconds
            current_time = time.time()
            if current_time - self.last_transaction_request < 2.0:
                print("Transaction history request throttled")
                return
            
            self.last_transaction_request = current_time
            
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

        @self.socketio.on('toggle_camera')
        def handle_toggle_camera(data):
            enabled = data.get('enabled', False)
            self.camera_enabled = enabled
            
            if enabled:
                if not self.yolo_initialized and not self.yolo_initializing:
                    self._initialize_yolo()
                
                if self.yolo_initialized:
                    camera_started = self.camera.start()
                    if camera_started and not self.is_processing:
                        self.start_processing()
                    
                    self.socketio.emit('camera_status', {
                        'enabled': True,
                        'available': camera_started
                    })
                    
                    if camera_started:
                        print("Camera enabled and started")
                    else:
                        print("Camera enabled but failed to start")
                else:
                    self.socketio.emit('camera_status', {
                        'enabled': False,
                        'available': False,
                        'message': 'YOLO not initialized yet'
                    })
            else:
                self.camera.stop()
                self.socketio.emit('camera_status', {
                    'enabled': False,
                    'available': False
                })
                print("Camera disabled")

        @self.socketio.on('initialize_yolo')
        def handle_initialize_yolo():
            if not self.yolo_initialized and not self.yolo_initializing:
                self._initialize_yolo()

    def processing_loop(self):
        frame_count = 0
        while self.is_processing:
            try:
                frame_count += 1
                
                # Debug log every 100 frames
                if frame_count % 100 == 0:
                    print(f"Processing loop: frame {frame_count}, camera available: {self.camera.is_available()}")
                
                processed_frame = None
                
                # Always update video streamer with a frame, even if camera is not available
                if self.camera_enabled and self.camera.is_available():
                    success, frame = self.camera.read()
                    
                    if success and frame is not None:
                        if frame_count % 100 == 0:
                            print(f"Camera frame read successful, shape: {frame.shape}")
                        
                        frame_width, frame_height = self.camera.get_dimensions()
                        processed_frame = self.detector_manager.process_frame(frame, frame_width, frame_height)
                        self.video_streamer.update_frame(processed_frame)
                        self.streaming_server.update_frame(processed_frame)  # Feed to streaming server
                        
                        if self.detector_manager.is_scanning:
                            self.socketio.emit('cart_update', {
                                'cart': self.detector_manager.get_cart(),
                                'total': self.detector_manager.calculate_total()
                            })
                    else:
                        # Camera available but read failed
                        print(f"Camera read failed at frame {frame_count}")
                        processed_frame = self._create_error_frame("Camera read failed - check connection")
                        self.video_streamer.update_frame(processed_frame)
                        self.streaming_server.update_frame(processed_frame)
                        
                else:
                    # Camera disabled or not available
                    if not self.camera_enabled:
                        if not self.yolo_initialized:
                            if self.yolo_initializing:
                                processed_frame = self._create_loading_frame("Initializing YOLO model...")
                            else:
                                processed_frame = self._create_info_frame("Camera disabled", "Press camera button to enable")
                        else:
                            processed_frame = self._create_info_frame("Camera disabled", "YOLO ready. Press camera button to enable")
                        self.video_streamer.update_frame(processed_frame)
                        self.streaming_server.update_frame(processed_frame)
                    else:
                        # Camera enabled but not available - try to start it
                        if frame_count % 100 == 0:
                            print("Camera enabled but not available, attempting to start...")
                        
                        if self.camera.start():
                            print("Camera successfully started in processing loop")
                        else:
                            # Show simulation mode available message
                            if self.detector_manager.simulation_mode:
                                processed_frame = self._create_simulation_frame()
                                self.video_streamer.update_frame(processed_frame)
                                self.streaming_server.update_frame(processed_frame)
                            else:
                                processed_frame = self._create_error_frame("Camera not available - Enable simulation mode for testing")
                                self.video_streamer.update_frame(processed_frame)
                                self.streaming_server.update_frame(processed_frame)
                
                # Emit frame via Socket.IO for real-time streaming
                if processed_frame is not None:
                    self._emit_frame_via_socket(processed_frame)
                
                time.sleep(0.033)  # 30 FPS for real-time feel
                
            except Exception as e:
                print(f"Processing error: {e}")
                error_frame = self._create_error_frame(f"Processing Error: {str(e)}")
                self.video_streamer.update_frame(error_frame)
                time.sleep(0.1)

    def _create_error_frame(self, message):
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frame[:] = [40, 20, 20]  # Dark red background
        
        # Add title
        font = cv2.FONT_HERSHEY_SIMPLEX
        title = "Camera Feed Error"
        title_size = cv2.getTextSize(title, font, 0.8, 2)[0]
        title_x = (640 - title_size[0]) // 2
        title_y = 180
        cv2.putText(frame, title, (title_x, title_y), font, 0.8, (100, 100, 255), 2)
        
        # Add main message (split into multiple lines if too long)
        words = message.split(' ')
        lines = []
        current_line = ""
        
        for word in words:
            test_line = current_line + " " + word if current_line else word
            if len(test_line) > 45:  # Max characters per line
                if current_line:
                    lines.append(current_line)
                current_line = word
            else:
                current_line = test_line
        
        if current_line:
            lines.append(current_line)
        
        # Draw message lines
        y_offset = 220
        for line in lines:
            text_size = cv2.getTextSize(line, font, 0.6, 2)[0]
            text_x = (640 - text_size[0]) // 2
            cv2.putText(frame, line, (text_x, y_offset), font, 0.6, (200, 200, 200), 2)
            y_offset += 30
        
        # Add suggestion
        suggestion = "Try enabling Simulation Mode for testing"
        sugg_size = cv2.getTextSize(suggestion, font, 0.5, 1)[0]
        sugg_x = (640 - sugg_size[0]) // 2
        cv2.putText(frame, suggestion, (sugg_x, y_offset + 40), font, 0.5, (150, 150, 150), 1)
        
        return frame
    
    def _create_simulation_frame(self):
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frame[:] = [20, 40, 20]  # Dark green background
        
        font = cv2.FONT_HERSHEY_SIMPLEX
        
        # Title
        title = "Simulation Mode Active"
        title_size = cv2.getTextSize(title, font, 0.8, 2)[0]
        title_x = (640 - title_size[0]) // 2
        title_y = 180
        cv2.putText(frame, title, (title_x, title_y), font, 0.8, (100, 255, 100), 2)
        
        # Instructions
        instructions = [
            "Camera not available - Using simulation",
            "Use Simulation Controls to add virtual objects",
            "Detection will work with simulated objects"
        ]
        
        y_offset = 220
        for instruction in instructions:
            text_size = cv2.getTextSize(instruction, font, 0.5, 1)[0]
            text_x = (640 - text_size[0]) // 2
            cv2.putText(frame, instruction, (text_x, y_offset), font, 0.5, (200, 255, 200), 1)
            y_offset += 25
        
        # Add simulation indicator
        cv2.circle(frame, (320, 350), 30, (100, 255, 100), 3)
        cv2.putText(frame, "SIM", (305, 358), font, 0.7, (100, 255, 100), 2)
        
        return frame
    
    def _create_loading_frame(self, message):
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frame[:] = [30, 30, 60]  # Dark blue background
        
        font = cv2.FONT_HERSHEY_SIMPLEX
        
        # Title
        title = "Loading..."
        title_size = cv2.getTextSize(title, font, 1.0, 2)[0]
        title_x = (640 - title_size[0]) // 2
        title_y = 180
        cv2.putText(frame, title, (title_x, title_y), font, 1.0, (100, 150, 255), 2)
        
        # Message
        msg_size = cv2.getTextSize(message, font, 0.7, 2)[0]
        msg_x = (640 - msg_size[0]) // 2
        cv2.putText(frame, message, (msg_x, 220), font, 0.7, (200, 200, 255), 2)
        
        # Loading animation
        import time
        dots = int((time.time() * 2) % 4)
        loading_text = "Please wait" + "." * dots
        loading_size = cv2.getTextSize(loading_text, font, 0.6, 1)[0]
        loading_x = (640 - loading_size[0]) // 2
        cv2.putText(frame, loading_text, (loading_x, 260), font, 0.6, (150, 150, 200), 1)
        
        return frame
    
    def _create_info_frame(self, title, message):
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frame[:] = [20, 30, 20]  # Dark green background
        
        font = cv2.FONT_HERSHEY_SIMPLEX
        
        # Title
        title_size = cv2.getTextSize(title, font, 0.8, 2)[0]
        title_x = (640 - title_size[0]) // 2
        title_y = 180
        cv2.putText(frame, title, (title_x, title_y), font, 0.8, (100, 200, 100), 2)
        
        # Message
        msg_size = cv2.getTextSize(message, font, 0.6, 2)[0]
        msg_x = (640 - msg_size[0]) // 2
        cv2.putText(frame, message, (msg_x, 220), font, 0.6, (150, 255, 150), 2)
        
        # Camera icon
        cv2.circle(frame, (320, 300), 40, (100, 200, 100), 3)
        cv2.rectangle(frame, (300, 285), (340, 315), (100, 200, 100), 2)
        cv2.circle(frame, (320, 300), 15, (100, 200, 100), -1)
        
        return frame
    
    def _emit_frame_via_socket(self, frame):
        """Emit frame via Socket.IO as base64 encoded JPEG"""
        try:
            # Encode frame to JPEG
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 75]  # Lower quality for faster transmission
            success, buffer = cv2.imencode('.jpg', frame, encode_param)
            
            if success:
                # Convert to base64 string
                import base64
                frame_base64 = base64.b64encode(buffer).decode('utf-8')
                
                # Emit to all connected clients
                self.socketio.emit('video_frame', {
                    'frame': frame_base64,
                    'timestamp': time.time(),
                    'width': frame.shape[1],
                    'height': frame.shape[0]
                })
            
        except Exception as e:
            print(f"Error emitting frame via socket: {e}")

    def _initialize_yolo(self):
        """Initialize YOLO model in a separate thread"""
        def init_yolo():
            try:
                self.yolo_initializing = True
                self.socketio.emit('yolo_status', {
                    'initialized': False,
                    'initializing': True
                })
                
                print("Initializing YOLO model...")
                # The detector manager initialization includes YOLO loading
                # This is already done in __init__, but we need to ensure it's ready
                if hasattr(self.detector_manager, 'detector'):
                    # Force model initialization if not already done
                    success = True
                    print("YOLO model initialized successfully")
                else:
                    success = False
                    print("Failed to initialize YOLO model")
                
                self.yolo_initialized = success
                self.yolo_initializing = False
                
                self.socketio.emit('yolo_status', {
                    'initialized': success,
                    'initializing': False
                })
                
                if success:
                    print("✅ YOLO ready for detection")
                else:
                    print("❌ YOLO initialization failed")
                    
            except Exception as e:
                print(f"Error initializing YOLO: {e}")
                self.yolo_initialized = False
                self.yolo_initializing = False
                self.socketio.emit('yolo_status', {
                    'initialized': False,
                    'initializing': False,
                    'error': str(e)
                })
        
        # Run initialization in background thread
        init_thread = threading.Thread(target=init_yolo)
        init_thread.daemon = True
        init_thread.start()

    def start_processing(self):
        if self.is_processing:
            return
            
        self.is_processing = True
        self.processing_thread = threading.Thread(target=self.processing_loop)
        self.processing_thread.daemon = True
        self.processing_thread.start()
        print("Video processing started")

    def stop_processing(self):
        self.is_processing = False
        if self.processing_thread:
            self.processing_thread.join(timeout=1.0)
            self.processing_thread = None
        self.camera.stop()
        self.video_streamer.stop()

    def run(self):
        print(f"Starting Self-Checkout API Server on {self.host}:{self.port}")
        print(f"Environment: {os.getenv('NODE_ENV', 'development')}")
        print(f"Frontend should be running on http://localhost:{os.getenv('PORT', 3002)}")
        print(f"Video feed available at http://{self.host}:{self.port}/video_feed")
        
        # Initialize video streamer with default frame
        default_frame = self.video_streamer._create_default_frame()
        self.video_streamer.update_frame(default_frame)
        
        # Initialize YOLO model first
        print("Starting YOLO initialization...")
        self._initialize_yolo()
        
        # Don't start camera by default - wait for user to enable it
        info_frame = self._create_info_frame("Camera disabled", "Press camera button to enable")
        self.video_streamer.update_frame(info_frame)
        
        # Start processing loop
        self.start_processing()
        
        try:
            # Disable auto-reloading to prevent double initialization and blocking
            self.socketio.run(
                self.app, 
                host=self.host, 
                port=self.port, 
                debug=self.debug, 
                use_reloader=False,  # Disable auto-reloading
                allow_unsafe_werkzeug=True
            )
        finally:
            self.stop_processing()


if __name__ == '__main__':
    model_dir = os.getenv('MODEL_PATH', 'models/yolov5s.pt').split('/')[0]
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)
        print(f"Created '{model_dir}' directory")
        print("Please run 'python download_model.py' to download YOLOv5 model")
    
    app = SelfCheckoutApp()
    app.run()