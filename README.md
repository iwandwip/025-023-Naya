# 025-023-Naya
Rancang Bangun Sistem Self Checkout Pada Minimarket Menggunakan Yolov5

Project Structure
```
self_checkout_system/
│
├── app.py                  # File utama Flask app dan route
├── camera.py               # Kelas Camera
├── detector.py             # Kelas DetectorManager
├── product.py              # Kelas ProductManager
│
├── static/                 # Aset statis
│   ├── css/
│   │   └── style.css       # Semua CSS
│   └── js/
│       └── main.js         # Semua JavaScript
│
├── templates/
│   └── index.html          # Template HTML utama
│
├── models/                 # Model YOLOv5
│   └── yolov5s.pt
│
└── products.yaml           # Data produk
```
