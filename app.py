from flask import Flask, render_template, request, jsonify
import torch
from PIL import Image
import io
import threading
import time
import firebase_admin
from firebase_admin import credentials, firestore
import pathlib
import cv2
import base64
from flask_socketio import SocketIO


class ProductDetector:
    def __init__(self, model_path):
        pathlib.PosixPath = pathlib.WindowsPath
        self.model = torch.hub.load('ultralytics/yolov5', 'custom', path=model_path, force_reload=True)

    def detect_from_image(self, image):
        results = self.model(image, size=640)
        return results

    def detect_from_file(self, file_bytes):
        img = Image.open(io.BytesIO(file_bytes)).convert('RGB')
        return self.detect_from_image(img)


class ShoppingCart:
    def __init__(self):
        self.cart = {}
        self.product_prices = {
            "Indomie": 3200,
            "Sabun": 4000,
            "Indomilk": 5250,
            "Keju": 16600,
            "Kecap": 4000
        }

    def add_product(self, name):
        if name in self.product_prices:
            if name in self.cart:
                self.cart[name]['jumlah'] += 1
            else:
                self.cart[name] = {'jumlah': 1, 'harga': self.product_prices[name]}

    def clear(self):
        self.cart = {}

    def get_items(self):
        items = []
        for name, item in self.cart.items():
            items.append({
                'name': name,
                'price': item['harga'],
                'qty': item['jumlah']
            })
        return items


class FirebaseManager:
    def __init__(self, credential_path):
        cred = credentials.Certificate(credential_path)
        firebase_admin.initialize_app(cred)
        self.db = firestore.client()

    def save_transaction(self, products, total):
        transaction_ref = self.db.collection('transactions').document()
        transaction_ref.set({
            'products': products,
            'total': total,
            'timestamp': firestore.SERVER_TIMESTAMP
        })
        return True


class CameraScanner:
    def __init__(self, detector, cart, socketio):
        self.detector = detector
        self.cart = cart
        self.socketio = socketio
        self.scanning = False

    def encode_frame(self, frame):
        _, buffer = cv2.imencode('.jpg', frame)
        jpg_as_text = base64.b64encode(buffer).decode('utf-8')
        return jpg_as_text

    def scan_loop(self):
        cap = cv2.VideoCapture(0)
        cap.set(3, 640)
        cap.set(4, 480)

        while self.scanning:
            ret, frame = cap.read()
            if not ret:
                continue

            img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            results = self.detector.detect_from_image(img)
            labels = results.pandas().xyxy[0]['name'].tolist()

            for label in labels:
                self.cart.add_product(label)

            for label, x1, y1, x2, y2 in zip(
                    results.pandas().xyxy[0]['name'],
                    results.pandas().xyxy[0]['xmin'],
                    results.pandas().xyxy[0]['ymin'],
                    results.pandas().xyxy[0]['xmax'],
                    results.pandas().xyxy[0]['ymax']):

                cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                cv2.putText(frame, label, (int(x1), int(y1)-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 0, 0), 2)

            encoded_frame = self.encode_frame(frame)
            self.socketio.emit('frame', encoded_frame)

            time.sleep(3)

        cap.release()

    def start(self):
        self.cart.clear()
        self.scanning = True
        thread = threading.Thread(target=self.scan_loop)
        thread.start()

    def stop(self):
        self.scanning = False
        time.sleep(1)
        return self.cart.get_items()


class SmartCheckoutApp:
    def __init__(self):
        self.app = Flask(__name__)
        self.socketio = SocketIO(self.app)

        self.detector = ProductDetector(model_path='models/nayol_fixed.pt')
        self.cart = ShoppingCart()
        self.firebase = FirebaseManager(credential_path=r"D:\Downloads\YOLOV5-TEST-LAGI-BISSMILAH\yolov5\credentials.json")
        self.scanner = CameraScanner(self.detector, self.cart, self.socketio)

        self.setup_routes()

    def setup_routes(self):
        @self.app.route('/')
        def home():
            return render_template('index.html')

        @self.app.route('/start_scan', methods=['POST'])
        def start_scan():
            self.scanner.start()
            return jsonify({'status': 'Scanning dimulai'})

        @self.app.route('/stop_scan', methods=['POST'])
        def stop_scan():
            items = self.scanner.stop()
            return jsonify({'products': items})

        @self.app.route('/detect', methods=['POST'])
        def detect():
            if 'file' not in request.files:
                return jsonify([])

            file = request.files['file']
            img_bytes = file.read()

            results = self.detector.detect_from_file(img_bytes)
            labels = results.pandas().xyxy[0]['name'].tolist()

            detected_products = []
            for label in labels:
                if label in self.cart.product_prices:
                    detected_products.append({
                        'name': label,
                        'price': self.cart.product_prices[label]
                    })

            return jsonify(detected_products)

        @self.app.route('/save_transaction', methods=['POST'])
        def save_transaction():
            data = request.get_json()
            products = data['products']
            total = data['total']

            self.firebase.save_transaction(products, total)
            return jsonify({'status': 'success', 'message': 'Transaction saved successfully'})

    def run(self, host='0.0.0.0', port=5000):
        self.socketio.run(self.app, host=host, port=port)


if __name__ == '__main__':
    app = SmartCheckoutApp()
    app.run()
