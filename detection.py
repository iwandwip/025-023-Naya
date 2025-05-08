# detection.py
import cv2
import torch
import numpy as np
from PIL import Image
import time
import threading
import yaml
import os
import warnings
import inquirer
import sys
from pynput import keyboard

warnings.filterwarnings("ignore", category=FutureWarning)


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
        self.stop_flag = threading.Event()

    def load_config(self):
        if os.path.exists(self.config_path):
            with open(self.config_path, 'r') as file:
                config = yaml.safe_load(file)
                if config and 'products' in config:
                    for product, details in config['products'].items():
                        self.product_catalog[product.lower()] = details['price']
                    print(f"Loaded {len(self.product_catalog)} products from config")
                else:
                    print("No products found in config, using empty catalog")
        else:
            print(f"Config file {self.config_path} not found, using empty catalog")

    def load_model(self):
        self.model = torch.hub.load('ultralytics/yolov5', 'custom', path=self.model_path, force_reload=True)

    def add_to_cart(self, product_name):
        product_lower = product_name.lower()
        if product_lower in self.product_catalog:
            price = self.product_catalog[product_lower]
            if product_lower in self.cart:
                self.cart[product_lower]["quantity"] += 1
            else:
                self.cart[product_lower] = {
                    "price": price,
                    "quantity": 1
                }
            print(f"Added {product_name} to cart")
            return True
        return False

    def get_cart(self):
        return self.cart

    def clear_cart(self):
        self.cart = {}
        print("Shopping cart cleared.")

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
            label_lower = label.lower()
            confidence = row['confidence']
            x1, y1, x2, y2 = int(row['xmin']), int(row['ymin']), int(row['xmax']), int(row['ymax'])

            if confidence > 0.5:
                color = (0, 255, 0) if label_lower in self.product_catalog else (0, 165, 255)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

                text = f"{label}: {confidence:.2f}"
                cv2.putText(frame, text, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

                if label_lower in self.product_catalog:
                    detected_products.append(label_lower)

        return frame, detected_products

    def start_detection(self):
        if self.is_running:
            return False

        self.is_running = True
        self.stop_flag.clear()
        self.detection_thread = threading.Thread(target=self._detection_loop)
        self.detection_thread.daemon = True
        self.detection_thread.start()
        return True

    def stop_detection(self):
        self.is_running = False
        self.stop_flag.set()
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
            while self.is_running and not self.stop_flag.is_set():
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

                cv2.imshow("Product Detection", self.frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    self.stop_flag.set()
                    break

                time.sleep(0.05)
        finally:
            cap.release()
            cv2.destroyAllWindows()

    def get_current_frame(self):
        return self.frame

    def encode_frame_jpg(self):
        if self.frame is None:
            return None

        _, buffer = cv2.imencode('.jpg', self.frame)
        return buffer.tobytes()

    def print_cart_summary(self):
        cart_items = self.format_cart_for_display()
        if not cart_items:
            print("Shopping cart is empty.")
            return

        print("\n--- Shopping Cart Summary ---")
        for item in cart_items:
            print(f"{item['name']} x{item['quantity']} - Rp {item['price']} each = Rp {item['subtotal']}")

        print(f"Total: Rp {self.calculate_total()}")
        print("----------------------------")


class KeyMonitor:
    def __init__(self):
        self.stop_requested = False
        self.listener = None

    def on_press(self, key):
        try:
            if key.char == 'y':
                self.stop_requested = True
                return False
        except AttributeError:
            pass

    def start(self):
        self.stop_requested = False
        self.listener = keyboard.Listener(on_press=self.on_press)
        self.listener.daemon = True
        self.listener.start()

    def stop(self):
        if self.listener:
            self.listener.stop()


def main():
    MODEL_PATH = "models/yolov5s.pt"
    CONFIG_PATH = "products.yaml"

    detector = ProductDetector(model_path=MODEL_PATH, config_path=CONFIG_PATH)
    key_monitor = KeyMonitor()

    print("Self-Checkout System")
    print("===================")

    running = True
    while running:
        questions = [
            inquirer.List('action',
                          message="Select an option:",
                          choices=[
                              '1. Start Scanning',
                              '2. Clear Shopping Cart',
                              '3. Exit'
                          ],
                          ),
        ]

        answers = inquirer.prompt(questions)
        choice = answers['action'][0]

        if choice == '1':
            print("\nStarting product scanning...")
            detector.start_detection()

            print("Scanning products. Press 'y' to stop scanning.")
            key_monitor.start()

            while not key_monitor.stop_requested and not detector.stop_flag.is_set():
                print(f"\rTotal: Rp {detector.calculate_total()}", end="")
                time.sleep(0.5)

            key_monitor.stop()
            detector.stop_detection()

            detector.print_cart_summary()

            continue_questions = [
                inquirer.Confirm('continue',
                                 message="Return to main menu?",
                                 default=True
                                 ),
            ]

            continue_answer = inquirer.prompt(continue_questions)
            if not continue_answer['continue']:
                running = False

        elif choice == '2':
            detector.clear_cart()

        elif choice == '3':
            print("Exiting...")
            running = False

    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
