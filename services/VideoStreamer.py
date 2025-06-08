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
                return self._create_default_frame()
    
    def _create_default_frame(self):
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        for y in range(480):
            for x in range(640):
                frame[y, x] = [50 + (y // 8), 50 + (x // 12), 100]
        
        text_lines = [
            "Self-Checkout System",
            "Camera Initializing...",
            "Press 'Start Scanning' to begin"
        ]
        
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.8
        color = (255, 255, 255)
        thickness = 2
        
        y_offset = 180
        for line in text_lines:
            text_size = cv2.getTextSize(line, font, font_scale, thickness)[0]
            text_x = (640 - text_size[0]) // 2
            text_y = y_offset
            
            cv2.putText(frame, line, (text_x + 2, text_y + 2), font, font_scale, (0, 0, 0), thickness)
            cv2.putText(frame, line, (text_x, text_y), font, font_scale, color, thickness)
            
            y_offset += 50
        
        return frame
    
    def generate_frames(self):
        self.is_active = True
        
        while self.is_active:
            try:
                frame = self.get_latest_frame()
                
                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 85]
                _, buffer = cv2.imencode('.jpg', frame, encode_param)
                
                frame_bytes = buffer.tobytes()
                
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n'
                       b'Content-Length: ' + str(len(frame_bytes)).encode() + b'\r\n'
                       b'\r\n' + frame_bytes + b'\r\n')
                
                time.sleep(0.033)
                
            except Exception as e:
                print(f"Error in video streaming: {e}")
                time.sleep(0.1)
    
    def stop(self):
        self.is_active = False
        self.frame_ready.set()
    
    def wait_for_frame(self, timeout=5.0):
        return self.frame_ready.wait(timeout)