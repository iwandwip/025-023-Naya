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
        self.frame_width = 0
        self.frame_height = 0
        self.counted_objects = {}
        self.counting_zone_start_percent = 70
        self.counting_zone_width_percent = 20
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
        self.counted_objects = {}
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

        detected_objects = []

        for i, row in results.pandas().xyxy[0].iterrows():
            label = row['name']
            label_lower = label.lower()
            confidence = row['confidence']
            x1, y1, x2, y2 = int(row['xmin']), int(row['ymin']), int(row['xmax']), int(row['ymax'])

            if confidence > 0.5:
                color = (0, 255, 0) if label_lower in self.product_catalog else (0, 165, 255)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

                text = f"{label}: {confidence:.2f}"
                text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]

                text_bg_x1 = x1
                text_bg_y1 = y1 - 25 if y1 - 25 > 0 else 0
                text_bg_x2 = x1 + text_size[0] + 10
                text_bg_y2 = y1

                cv2.rectangle(frame, (text_bg_x1, text_bg_y1), (text_bg_x2, text_bg_y2), color, -1)
                cv2.putText(frame, text, (x1 + 5, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)

                if label_lower in self.product_catalog:
                    detected_objects.append({
                        'label': label_lower,
                        'box': (x1, y1, x2, y2),
                        'center': ((x1 + x2) // 2, (y1 + y2) // 2)
                    })

        return frame, detected_objects

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
        self.frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        cv2.namedWindow("Controls")
        cv2.createTrackbar("Zone Start %", "Controls", self.counting_zone_start_percent, 100, lambda x: None)
        cv2.createTrackbar("Zone Width %", "Controls", self.counting_zone_width_percent, 50, lambda x: None)

        active_objects = {}
        last_seen = {}

        try:
            while self.is_running and not self.stop_flag.is_set():
                ret, frame = cap.read()
                if not ret:
                    time.sleep(0.1)
                    continue

                self.counting_zone_start_percent = cv2.getTrackbarPos("Zone Start %", "Controls")
                self.counting_zone_width_percent = cv2.getTrackbarPos("Zone Width %", "Controls")

                counting_zone_x = int(self.frame_width * self.counting_zone_start_percent / 100)
                counting_zone_width = int(self.frame_width * self.counting_zone_width_percent / 100)

                processed_frame, detected_objects = self.detect_objects(frame)

                current_time = time.time()
                current_objects = set()

                for obj in detected_objects:
                    label = obj['label']
                    box = obj['box']
                    center_x = obj['center'][0]
                    object_id = f"{label}_{box[0]}_{box[1]}"
                    current_objects.add(object_id)

                    if center_x > counting_zone_x and center_x < counting_zone_x + counting_zone_width and object_id not in self.counted_objects:
                        self.add_to_cart(label)
                        self.counted_objects[object_id] = True

                    last_seen[object_id] = current_time

                for obj_id in list(last_seen.keys()):
                    if obj_id not in current_objects:
                        if current_time - last_seen[obj_id] > 2.0:
                            del last_seen[obj_id]
                            if obj_id in self.counted_objects:
                                del self.counted_objects[obj_id]

                zone_start = (counting_zone_x, 0)
                zone_end = (counting_zone_x, self.frame_height)

                zone_end_right = (counting_zone_x + counting_zone_width, 0)
                zone_start_right = (counting_zone_x + counting_zone_width, self.frame_height)

                overlay = processed_frame.copy()
                cv2.rectangle(overlay, (counting_zone_x, 0), (counting_zone_x + counting_zone_width, self.frame_height), (0, 0, 255), -1)
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

                settings_text = f"Zone Start: {self.counting_zone_start_percent}%, Width: {self.counting_zone_width_percent}%"
                cv2.putText(processed_frame, settings_text, (10, self.frame_height - 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

                self.frame = processed_frame

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
