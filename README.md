# Self-Checkout System with Firestore Integration

A computer vision-based self-checkout system that can detect products, manage inventory, process transactions, and track sales history using Firebase Firestore.

## Features

- Product detection using YOLOv5 (computer vision)
- Configurable detection zone for product scanning
- Shopping cart and checkout functionality
- QR code generation for payment
- Product management (add, edit, delete)
- Transaction history with date filtering
- Firestore integration for cloud data storage

## Prerequisites

- Python 3.8+
- OpenCV
- Flask
- Firebase account
- YOLOv5 model

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/self-checkout-system.git
cd self-checkout-system
```

2. Install required packages:
```bash
pip install flask flask-socketio opencv-python firebase-admin torch pillow pyyaml
```

3. Set up Firebase:
   - Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/)
   - Set up Firestore Database in your project
   - Generate a service account key (Project Settings > Service accounts > Generate new private key)
   - Save the JSON key file as `firebase-credentials.json` in the project directory

## Project Structure

```
self_checkout_system/
│
├── App.py                  # Main application file
├── CameraHandler.py        # Camera handling
├── DetectorManager.py      # Detection manager
├── ProductDetector.py      # Product detection logic
├── ProductManager.py       # Product management
├── FirestoreManager.py     # Firestore integration
├── seed_data.py            # Script to populate initial data
│
├── static/                 
│   ├── css/
│   │   └── style.css       
│   └── js/
│       └── main.js         
│
├── templates/
│   └── index.html          
│
├── models/                 
│   └── yolov5s.pt          # YOLOv5 model
│
└── firebase-credentials.json  # Firebase credentials
```

## Running the Application

1. Populate initial data in Firestore (optional):
```bash
python seed_data.py
```

2. Start the application:
```bash
python App.py
```

3. Open your browser and navigate to:
```
http://localhost:5000
```

## Usage

### Scanning Products
1. Click "Start Scanning"
2. Place products in front of the camera within the red counting zone
3. Products will be automatically detected and added to cart
4. Click "Stop Scanning" when finished

### Checkout
1. Review items in cart
2. Click "Checkout"
3. Scan the QR code for payment
4. Click "Complete Payment"

### Managing Products
1. Click "Manage Products"
2. View, add, edit, or delete products

### Viewing Transaction History
1. Click "Transaction History"
2. Filter transactions by date range if needed
3. Click "View" on any transaction to see details

## Customization

- Modify `products.yaml` to add default products
- Adjust detection parameters in `DetectorManager.py`
- Update styling in `static/css/style.css`

## License

[MIT License](LICENSE)