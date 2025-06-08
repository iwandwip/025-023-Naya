import cv2
import threading
import time
import platform


class Camera:
    def __init__(self, camera_id=0):
        self.camera_id = camera_id
        self.cap = None
        self.is_running = False
        self.frame = None
        self.lock = threading.Lock()
        self.frame_width = 640
        self.frame_height = 480
        self.last_frame_time = 0
        self.frame_timeout = 5.0

    def start(self):
        if self.is_running:
            return False

        try:
            if platform.system() == "Windows":
                self.cap = cv2.VideoCapture(self.camera_id, cv2.CAP_DSHOW)
            else:
                self.cap = cv2.VideoCapture(self.camera_id)
            
            if not self.cap.isOpened():
                print(f"Trying alternative camera backends for camera {self.camera_id}")
                backends = [cv2.CAP_V4L2, cv2.CAP_GSTREAMER, cv2.CAP_FFMPEG]
                for backend in backends:
                    try:
                        self.cap = cv2.VideoCapture(self.camera_id, backend)
                        if self.cap.isOpened():
                            print(f"Successfully opened camera with backend: {backend}")
                            break
                    except:
                        continue

            if not self.cap.isOpened():
                print(f"Error: Could not open camera with index {self.camera_id}")
                return False

            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            
            self.frame_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            self.frame_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            ret, test_frame = self.cap.read()
            if not ret:
                print("Warning: Camera opened but cannot read frames")
                self.cap.release()
                return False
            
            self.is_running = True
            self.last_frame_time = time.time()
            print(f"Camera started successfully: {self.frame_width}x{self.frame_height}")
            return True
            
        except Exception as e:
            print(f"Error starting camera: {e}")
            if self.cap:
                self.cap.release()
            return False

    def stop(self):
        self.is_running = False
        if self.cap and self.cap.isOpened():
            self.cap.release()
            self.cap = None
        print("Camera stopped")
        return True

    def read(self):
        if not self.is_running or not self.cap or not self.cap.isOpened():
            return False, None

        try:
            current_time = time.time()
            
            if current_time - self.last_frame_time > self.frame_timeout:
                print("Camera timeout detected, attempting to reconnect...")
                self.stop()
                time.sleep(1)
                if not self.start():
                    return False, None

            ret, frame = self.cap.read()
            
            if ret:
                self.last_frame_time = current_time
                with self.lock:
                    self.frame = frame.copy()
                return True, frame
            else:
                print("Failed to read frame from camera")
                return False, None
                
        except Exception as e:
            print(f"Error reading camera frame: {e}")
            return False, None

    def get_dimensions(self):
        return (self.frame_width, self.frame_height)
    
    def get_latest_frame(self):
        with self.lock:
            if self.frame is not None:
                return self.frame.copy()
            return None
    
    def is_available(self):
        return self.is_running and self.cap and self.cap.isOpened()
    
    def get_camera_info(self):
        if not self.is_available():
            return None
        
        return {
            'width': int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            'height': int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            'fps': int(self.cap.get(cv2.CAP_PROP_FPS)),
            'backend': self.cap.getBackendName() if hasattr(self.cap, 'getBackendName') else 'unknown'
        }