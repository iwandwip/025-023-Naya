import cv2
import time
import threading
import numpy as np


class DetectorManager:
    def __init__(self, model_path, product_manager):
        from ProductDetector import ProductDetector
        self.detector = ProductDetector(model_path=model_path, config_path=product_manager.config_path)
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

    def remove_item(self, product_name):
        with self.lock:
            cart = self.detector.get_cart()
            product_lower = product_name.lower()

            if product_lower in cart:
                if cart[product_lower]["quantity"] > 1:
                    cart[product_lower]["quantity"] -= 1
                    print(f"Decreased quantity of {product_name} in cart")
                    return True
                else:
                    del cart[product_lower]

                    for obj_id in list(self.detector.counted_objects.keys()):
                        if obj_id.startswith(f"{product_lower}_"):
                            del self.detector.counted_objects[obj_id]
                            break

                    print(f"Removed {product_name} from cart")
                    return True

            return False
