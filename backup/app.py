from flask_socketio import SocketIO
from io import BytesIO
import base64
import cv2
import pathlib
from flask import Flask, render_template, request, jsonify
import torch
from PIL import Image
import io
import threading
import time

import firebase_admin
from firebase_admin import credentials, firestore

# Inisialisasi Firebase
cred = credentials.Certificate(r"D:\Downloads\YOLOV5-TEST-LAGI-BISSMILAH\yolov5\credentials.json")
firebase_admin.initialize_app(cred)

# Akses Firestore
db = firestore.client()

app = Flask(__name__)


# Tambahkan agar PosixPath bisa dibaca di Windows
pathlib.PosixPath = pathlib.WindowsPath

# Load model YOLO
model = torch.hub.load('ultralytics/yolov5', 'custom', path='models/nayol_fixed.pt', force_reload=True)
# model = torch.hub.load('ultralytics/yolov5', 'custom', path='models/nayol_fixed.pt', force_reload=True)

# Data belanja
cart = {}  # format: {nama_produk: {'jumlah': x, 'harga': y}}

# Status scanning
scanning = False

# Fungsi deteksi barang menggunakan OpenCV


def encode_frame(frame):
    """Mengonversi frame OpenCV menjadi base64 agar bisa dikirim ke web."""
    _, buffer = cv2.imencode('.jpg', frame)
    jpg_as_text = base64.b64encode(buffer).decode('utf-8')
    return jpg_as_text


def scan_loop():
    global scanning, cart
    cap = cv2.VideoCapture(0)
    cap.set(3, 640)
    cap.set(4, 480)

    while scanning:
        ret, frame = cap.read()
        if not ret:
            continue

        # Konversi BGR ke RGB, lalu ke Image
        img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        results = model(img, size=640)
        labels = results.pandas().xyxy[0]['name'].tolist()

        print("Deteksi:", labels)  # Menambahkan log untuk hasil deteksi

        for label in labels:
            if label == "Indomie":
                add_to_cart("Indomie", 3200)
            elif label == "Sabun":
                add_to_cart("Sabun", 4000)
            elif label == "Indomilk":
                add_to_cart("Indomilk", 5250)
            elif label == "Keju":
                add_to_cart("Keju", 16600)
            elif label == "Kecap":
                add_to_cart("Kecap", 4000)

        time.sleep(3)

        # Loop untuk menggambar bounding box
        for label, x1, y1, x2, y2 in zip(results.pandas().xyxy[0]['name'], results.pandas().xyxy[0]['xmin'], results.pandas().xyxy[0]['ymin'], results.pandas().xyxy[0]['xmax'], results.pandas().xyxy[0]['ymax']):
            if label == "Indomie":
                add_to_cart("Indomie", 3200)
            elif label == "Sabun":
                add_to_cart("Sabun", 4000)
            elif label == "Indomilk":
                add_to_cart("Indomilk", 5250)
            elif label == "Keju":
                add_to_cart("Keju", 16600)
            elif label == "Kecap":
                add_to_cart("Kecap", 4000)

            # Menambahkan visual bounding box
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
            cv2.putText(frame, label, (int(x1), int(y1)-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 0, 0), 2)

        # Mengonversi frame ke base64
        encoded_frame = encode_frame(frame)

        # Kirim gambar ke frontend dengan Flask
        # Kirimkan data ke frontend (misalnya melalui Flask-SocketIO atau sebagai response HTTP)
        # Kamu bisa menggunakan Flask-SocketIO untuk mengirim gambar secara real-time
        socketio.emit('frame', encoded_frame)  # Jika menggunakan Flask-SocketIO

    cap.release()


def add_to_cart(name, price):
    if name in cart:
        cart[name]['jumlah'] += 1
    else:
        cart[name] = {'jumlah': 1, 'harga': price}


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/start_scan', methods=['POST'])
def start_scan():
    global scanning, cart
    cart = {}  # reset keranjang
    scanning = True
    thread = threading.Thread(target=scan_loop)
    thread.start()
    return jsonify({'status': 'Scanning dimulai'})


@app.route('/stop_scan', methods=['POST'])
def stop_scan():
    global scanning
    scanning = False
    time.sleep(1)  # beri waktu thread selesai

    items = []
    for name, item in cart.items():
        items.append({
            'name': name,
            'price': item['harga'],
            'qty': item['jumlah']
        })
    return jsonify({'products': items})


@app.route('/detect', methods=['POST'])
def detect():
    if 'file' not in request.files:
        return jsonify([])

    file = request.files['file']
    img_bytes = file.read()
    img = Image.open(io.BytesIO(img_bytes)).convert('RGB')

    results = model(img, size=640)
    labels = results.pandas().xyxy[0]['name'].tolist()

    detected_products = []
    for label in labels:
        if label == "Indomie":
            detected_products.append({'name': 'Indomie', 'price': 3200})
        elif label == "Sabun":
            detected_products.append({'name': 'Sabun', 'price': 4000})
        elif label == "Indomilk":
            detected_products.append({'name': 'Indomilk', 'price': 5250})
        elif label == "Keju":
            detected_products.append({'name': 'Keju', 'price': 16600})
        elif label == "Kecap":
            detected_products.append({'name': 'Kecap', 'price': 4000})

    return jsonify(detected_products)


@app.route('/save_transaction', methods=['POST'])
def save_transaction():
    data = request.get_json()
    products = data['products']
    total = data['total']

    transaction_ref = db.collection('transactions').document()
    transaction_ref.set({
        'products': products,
        'total': total,
        'timestamp': firestore.SERVER_TIMESTAMP
    })

    return jsonify({'status': 'success', 'message': 'Transaction saved successfully'})


# Inisialisasi Flask-SocketIO
socketio = SocketIO(app)

# Modifikasi fungsi scan_loop untuk mengirimkan gambar secara real-time ke frontend
# (Kode scan_loop sudah diubah seperti pada langkah pertama)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
