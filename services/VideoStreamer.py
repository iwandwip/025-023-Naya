import cv2
import threading
import time
import numpy as np


class VideoStreamer:
    def __init__(self):
        self.frame = None
        self.lock = threading.Lock()
        self.is_active = False
        self.frame_ready = threading.Event()
        self.default_frame = self._create_default_frame()
        
    def update_frame(self, frame):
        if frame is not None:
            with self.lock:
                self.frame = frame.copy()
                self.frame_ready.set()
    
    def get_latest_frame(self):
        with self.lock:
            if self.frame is not None:
                return self.frame.copy()
            else:
                return self.default_frame.copy()
    
    def _create_default_frame(self):
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        frame[:] = [20, 30, 40]
        
        cv2.rectangle(frame, (50, 50), (590, 430), (60, 60, 60), -1)
        cv2.rectangle(frame, (50, 50), (590, 430), (100, 100, 100), 2)
        
        logo_center = (320, 200)
        cv2.circle(frame, logo_center, 50, (70, 130, 180), -1)
        cv2.circle(frame, logo_center, 50, (100, 160, 210), 3)
        
        icon_points = np.array([
            [logo_center[0]-20, logo_center[1]-10],
            [logo_center[0]+20, logo_center[1]-10],
            [logo_center[0]+20, logo_center[1]+10],
            [logo_center[0]-20, logo_center[1]+10]
        ], np.int32)
        cv2.fillPoly(frame, [icon_points], (255, 255, 255))
        
        text_lines = [
            ("Self-Checkout System", 0.9, (255, 255, 255)),
            ("Camera Initializing...", 0.7, (200, 200, 200)),
            ("Press 'Start Scanning' to begin", 0.6, (150, 150, 150))
        ]
        
        font = cv2.FONT_HERSHEY_SIMPLEX
        y_offset = 280
        
        for text, scale, color in text_lines:
            text_size = cv2.getTextSize(text, font, scale, 2)[0]
            text_x = (640 - text_size[0]) // 2
            text_y = y_offset
            
            cv2.putText(frame, text, (text_x + 1, text_y + 1), font, scale, (0, 0, 0), 2)
            cv2.putText(frame, text, (text_x, text_y), font, scale, color, 2)
            
            y_offset += int(40 * scale)
        
        status_rect = (200, 380, 240, 30)
        cv2.rectangle(frame, (status_rect[0], status_rect[1]), 
                     (status_rect[0] + status_rect[2], status_rect[1] + status_rect[3]), 
                     (50, 50, 150), -1)
        cv2.rectangle(frame, (status_rect[0], status_rect[1]), 
                     (status_rect[0] + status_rect[2], status_rect[1] + status_rect[3]), 
                     (100, 100, 200), 2)
        
        status_text = "READY"
        status_size = cv2.getTextSize(status_text, font, 0.6, 2)[0]
        status_x = status_rect[0] + (status_rect[2] - status_size[0]) // 2
        status_y = status_rect[1] + (status_rect[3] + status_size[1]) // 2
        cv2.putText(frame, status_text, (status_x, status_y), font, 0.6, (255, 255, 255), 2)
        
        return frame
    
    def generate_frames(self):
        self.is_active = True
        
        while self.is_active:
            try:
                frame = self.get_latest_frame()
                
                if frame is None:
                    frame = self.default_frame.copy()
                
                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 80]
                success, buffer = cv2.imencode('.jpg', frame, encode_param)
                
                if not success:
                    continue
                
                frame_bytes = buffer.tobytes()
                
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n'
                       b'Content-Length: ' + str(len(frame_bytes)).encode() + b'\r\n'
                       b'\r\n' + frame_bytes + b'\r\n')
                
                time.sleep(0.05)
                
            except Exception as e:
                print(f"Video streaming error: {e}")
                time.sleep(0.1)
    
    def stop(self):
        self.is_active = False
        self.frame_ready.set()
    
    def wait_for_frame(self, timeout=5.0):
        return self.frame_ready.wait(timeout)