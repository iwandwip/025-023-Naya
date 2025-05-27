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

        self.objects_in_zone = {}
        self.counted_objects = {}
        self.last_detections = {}
        self.object_timeout = 2.0

        self.simulation_mode = False
        self.simulated_objects = {}
        self.next_sim_id = 1

    def set_zone_parameters(self, start_percent, width_percent):
        self.zone_start_percent = start_percent
        self.zone_width_percent = width_percent

    def toggle_simulation_mode(self, enabled):
        with self.lock:
            self.simulation_mode = enabled
            if enabled:
                print("🎮 SIMULATION MODE ENABLED")
            else:
                print("📹 REAL DETECTION MODE ENABLED")
                self.simulated_objects.clear()

    def add_simulated_object(self, label, x, y, width, height):
        with self.lock:
            obj_id = f"sim_{self.next_sim_id}"
            self.next_sim_id += 1

            self.simulated_objects[obj_id] = {
                'label': label.lower(),
                'x': x,
                'y': y,
                'width': width,
                'height': height,
                'created_time': time.time()
            }

            print(f"✅ Added simulated {label} at ({x}, {y}) size {width}x{height}")
            return obj_id

    def update_simulated_object(self, obj_id, x=None, y=None, width=None, height=None, label=None):
        with self.lock:
            if obj_id in self.simulated_objects:
                obj = self.simulated_objects[obj_id]
                if x is not None:
                    obj['x'] = x
                if y is not None:
                    obj['y'] = y
                if width is not None:
                    obj['width'] = width
                if height is not None:
                    obj['height'] = height
                if label is not None:
                    obj['label'] = label.lower()
                return True
            return False

    def remove_simulated_object(self, obj_id):
        with self.lock:
            if obj_id in self.simulated_objects:
                del self.simulated_objects[obj_id]
                self.objects_in_zone.pop(obj_id, None)
                return True
            return False

    def get_simulated_objects(self):
        return self.simulated_objects.copy()

    def start_scanning(self):
        with self.lock:
            self.detector.clear_cart()
            self.is_scanning = True
            self.objects_in_zone.clear()
            self.counted_objects.clear()
            self.last_detections.clear()

    def stop_scanning(self):
        with self.lock:
            self.is_scanning = False

    def _calculate_iou(self, box1, box2):
        x1_1, y1_1, x2_1, y2_1 = box1
        x1_2, y1_2, x2_2, y2_2 = box2

        x1_i = max(x1_1, x1_2)
        y1_i = max(y1_1, y1_2)
        x2_i = min(x2_1, x2_2)
        y2_i = min(y2_1, y2_2)

        if x2_i <= x1_i or y2_i <= y1_i:
            return 0.0

        intersection = (x2_i - x1_i) * (y2_i - y1_i)
        area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
        area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
        union = area1 + area2 - intersection

        return intersection / union if union > 0 else 0.0

    def _find_matching_object(self, detection, label):
        best_match = None
        best_iou = 0.0
        threshold = 0.3

        for tracked_id, tracked_data in self.last_detections.items():
            if tracked_data['label'] != label:
                continue

            iou = self._calculate_iou(detection['box'], tracked_data['box'])
            if iou > threshold and iou > best_iou:
                best_iou = iou
                best_match = tracked_id

        return best_match

    def _cleanup_old_objects(self, current_time):
        to_remove = []
        for obj_id, last_time in list(self.last_detections.items()):
            if current_time - last_time['timestamp'] > self.object_timeout:
                to_remove.append(obj_id)

        for obj_id in to_remove:
            self.last_detections.pop(obj_id, None)
            self.objects_in_zone.pop(obj_id, None)

    def _process_simulated_objects(self, frame, frame_width, frame_height):
        current_time = time.time()
        detected_objects = []

        counting_zone_x = int(frame_width * self.zone_start_percent / 100)
        counting_zone_width = int(frame_width * self.zone_width_percent / 100)

        for obj_id, obj_data in self.simulated_objects.items():
            x = obj_data['x']
            y = obj_data['y']
            w = obj_data['width']
            h = obj_data['height']
            label = obj_data['label']

            x1 = max(0, x)
            y1 = max(0, y)
            x2 = min(frame_width, x + w)
            y2 = min(frame_height, y + h)
            center_x = (x1 + x2) // 2
            center_y = (y1 + y2) // 2

            is_valid_product = label in self.product_manager.get_products()

            color = (0, 255, 0) if is_valid_product else (0, 165, 255)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

            text = f"[SIM] {label}: 1.00"
            text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]

            text_bg_x1 = x1
            text_bg_y1 = y1 - 25 if y1 - 25 > 0 else 0
            text_bg_x2 = x1 + text_size[0] + 10
            text_bg_y2 = y1

            cv2.rectangle(frame, (text_bg_x1, text_bg_y1), (text_bg_x2, text_bg_y2), color, -1)
            cv2.putText(frame, text, (x1 + 5, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)

            if is_valid_product:
                detected_objects.append({
                    'label': label,
                    'box': (x1, y1, x2, y2),
                    'center': (center_x, center_y)
                })

            in_zone = (center_x > counting_zone_x and
                       center_x < counting_zone_x + counting_zone_width)

            was_in_zone = self.objects_in_zone.get(obj_id, False)
            already_counted = self.counted_objects.get(obj_id, False)

            if in_zone:
                if not was_in_zone and not already_counted and is_valid_product:
                    self.detector.add_to_cart(label)
                    self.counted_objects[obj_id] = True
                    print(f"🎯 SIMULATED COUNT: {label} (ID: {obj_id})")

                self.objects_in_zone[obj_id] = True
                cv2.circle(frame, (center_x, center_y), 8, (0, 255, 255), -1)
            else:
                if was_in_zone:
                    print(f"📤 Simulated object {label} left counting zone (ID: {obj_id})")
                self.objects_in_zone[obj_id] = False

        return frame, detected_objects

    def process_frame(self, frame, frame_width, frame_height):
        if frame is None:
            blank = np.zeros((480, 640, 3), dtype=np.uint8)
            return blank

        counting_zone_x = int(frame_width * self.zone_start_percent / 100)
        counting_zone_width = int(frame_width * self.zone_width_percent / 100)

        if self.is_scanning:
            self.detector.product_catalog = self.product_manager.get_products()

            if self.simulation_mode:
                processed_frame, detected_objects = self._process_simulated_objects(frame, frame_width, frame_height)
            else:
                processed_frame, detected_objects = self.detector.detect_objects(frame)

                current_time = time.time()
                current_detections = {}

                for obj in detected_objects:
                    label = obj['label']
                    box = obj['box']
                    center_x = obj['center'][0]

                    in_zone = (center_x > counting_zone_x and
                               center_x < counting_zone_x + counting_zone_width)

                    matched_id = self._find_matching_object(obj, label)

                    if matched_id:
                        obj_id = matched_id
                    else:
                        obj_id = f"{label}_{int(current_time * 1000)}_{len(current_detections)}"

                    current_detections[obj_id] = {
                        'label': label,
                        'box': box,
                        'center': obj['center'],
                        'timestamp': current_time,
                        'in_zone': in_zone
                    }

                    was_in_zone = self.objects_in_zone.get(obj_id, False)
                    already_counted = self.counted_objects.get(obj_id, False)

                    if in_zone:
                        if not was_in_zone and not already_counted:
                            self.detector.add_to_cart(label)
                            self.counted_objects[obj_id] = True
                            print(f"🎯 REAL COUNT: {label} (ID: {obj_id})")

                        self.objects_in_zone[obj_id] = True
                    else:
                        if was_in_zone:
                            print(f"📤 Real object {label} left counting zone (ID: {obj_id})")
                        self.objects_in_zone[obj_id] = False

                self.last_detections = current_detections
                self._cleanup_old_objects(current_time)

        else:
            processed_frame = frame.copy()

            if self.simulation_mode:
                self._process_simulated_objects(processed_frame, frame_width, frame_height)

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

        mode_text = "🎮 SIMULATION MODE" if self.simulation_mode else "📹 REAL MODE"
        settings_text = f"{mode_text} | Zone: {self.zone_start_percent}%, Width: {self.zone_width_percent}%"
        cv2.putText(processed_frame, settings_text, (10, frame_height - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        objects_in_zone_count = sum(1 for in_zone in self.objects_in_zone.values() if in_zone)
        tracking_text = f"Objects in zone: {objects_in_zone_count} | Simulated objects: {len(self.simulated_objects)}"
        cv2.putText(processed_frame, tracking_text, (10, frame_height - 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        return processed_frame

    def get_cart(self):
        return self.detector.get_cart()

    def calculate_total(self):
        return self.detector.calculate_total()

    def clear_cart(self):
        self.detector.clear_cart()
        self.objects_in_zone.clear()
        self.counted_objects.clear()
        self.last_detections.clear()

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
                    print(f"Removed {product_name} from cart")
                    return True

            return False
