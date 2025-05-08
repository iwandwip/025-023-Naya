# detection.py
import cv2
import torch
import numpy as np
from PIL import Image
import time
import threading
import yaml
import os


class ProductDetector:
    def __init__(self, model_path, config_path="products.yaml", camera_id=0):
        self.model_path = model_path
        self.config_path = config_path
        self.camera_id = camera_id
        self.model = None
        self.is_running = False
        self.detection_thread = None
        self.cart = {}
        self.frame = None
        self.product_catalog = {}
        self.load_config()
        self.load_model()

    def load_config(self):
        if os.path.exists(self.config_path):
            with open(self.config_path, 'r') as file:
                config = yaml.safe_load(file)
                if config and 'products' in config:
                    for product, details in config['products'].items():
                        self.product_catalog[product] = details['price']
                    print(f"Loaded {len(self.product_catalog)} products from config")
                else:
                    print("No products found in config, using empty catalog")
        else:
            print(f"Config file {self.config_path} not found, using empty catalog")

    def load_model(self):
        self.model = torch.hub.load('ultralytics/yolov5', 'custom', path=self.model_path, force_reload=True)

    def add_to_cart(self, product_name):
        if product_name in self.product_catalog:
            price = self.product_catalog[product_name]
            if product_name in self.cart:
                self.cart[product_name]["quantity"] += 1
            else:
                self.cart[product_name] = {
                    "price": price,
                    "quantity": 1
                }
            print(f"Added {product_name} to cart. Current cart: {self.cart}")
            return True
        return False

    def get_cart(self):
        return self.cart

    def clear_cart(self):
        self.cart = {}

    def calculate_total(self):
        total = 0
        for product, details in self.cart.items():
            total += details["price"] * details["quantity"]
        return total

    def format_cart_for_display(self):
        display_items = []
        for product, details in self.cart.items():
            display_items.append({
                "name": product,
                "price": details["price"],
                "quantity": details["quantity"],
                "subtotal": details["price"] * details["quantity"]
            })
        return display_items

    def detect_objects(self, frame):
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = Image.fromarray(rgb_frame)
        results = self.model(img, size=640)

        detected_products = []

        for i, row in results.pandas().xyxy[0].iterrows():
            label = row['name']
            confidence = row['confidence']
            x1, y1, x2, y2 = int(row['xmin']), int(row['ymin']), int(row['xmax']), int(row['ymax'])

            if confidence > 0.5 and label in self.product_catalog:
                detected_products.append(label)

                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

                text = f"{label}: {confidence:.2f}"
                cv2.putText(frame, text, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        return frame, detected_products

    def start_detection(self):
        if self.is_running:
            return False

        self.is_running = True
        self.detection_thread = threading.Thread(target=self._detection_loop)
        self.detection_thread.daemon = True
        self.detection_thread.start()
        return True

    def stop_detection(self):
        self.is_running = False
        if self.detection_thread:
            self.detection_thread.join(timeout=1.0)
            self.detection_thread = None
        return True

    def _detection_loop(self):
        cap = cv2.VideoCapture(self.camera_id)
        cap.set(3, 640)
        cap.set(4, 480)

        cooldown_time = {}

        try:
            while self.is_running:
                ret, frame = cap.read()
                if not ret:
                    time.sleep(0.1)
                    continue

                processed_frame, detected_products = self.detect_objects(frame)
                self.frame = processed_frame

                current_time = time.time()

                for product in detected_products:
                    if product not in cooldown_time or (current_time - cooldown_time[product]) > 3:
                        self.add_to_cart(product)
                        cooldown_time[product] = current_time

                time.sleep(0.05)
        finally:
            cap.release()

    def get_current_frame(self):
        return self.frame

    def encode_frame_jpg(self):
        if self.frame is None:
            return None

        _, buffer = cv2.imencode('.jpg', self.frame)
        return buffer.tobytes()


if __name__ == "__main__":
    MODEL_PATH = "models/yolov5s.pt"
    CONFIG_PATH = "products.yaml"

    detector = ProductDetector(model_path=MODEL_PATH, config_path=CONFIG_PATH)

    print("Starting product detection...")
    detector.start_detection()

    try:
        while True:
            frame = detector.get_current_frame()

            if frame is not None:
                cv2.imshow("Product Detection", frame)

                cart_items = detector.format_cart_for_display()

                total = detector.calculate_total()
                print(f"\rTotal: Rp {total}", end="")

                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('c'):
                    detector.clear_cart()
                    print("\nCart cleared!")
    except KeyboardInterrupt:
        print("\nDetection stopped by user.")
    finally:
        detector.stop_detection()
        cv2.destroyAllWindows()

        print("\n--- Shopping Cart Summary ---")
        cart_items = detector.format_cart_for_display()
        for item in cart_items:
            print(f"{item['name']} x{item['quantity']} - Rp {item['price']} each = Rp {item['subtotal']}")

        print(f"Total: Rp {detector.calculate_total()}")
        print("----------------------------")
