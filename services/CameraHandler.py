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
        self.frame_timeout = 3.0
        self.max_retries = 3
        self.retry_count = 0

    def start(self):
        if self.is_running:
            return True

        for attempt in range(self.max_retries):
            try:
                if self._try_open_camera():
                    self.is_running = True
                    self.last_frame_time = time.time()
                    print(f"Camera {self.camera_id} started: {self.frame_width}x{self.frame_height}")
                    return True
                else:
                    print(f"Camera attempt {attempt + 1} failed, retrying...")
                    time.sleep(1)
            except Exception as e:
                print(f"Camera start error (attempt {attempt + 1}): {e}")
                time.sleep(1)

        print(f"Failed to start camera after {self.max_retries} attempts")
        return False

    def _try_open_camera(self):
        if platform.system() == "Windows":
            backends = [cv2.CAP_DSHOW, cv2.CAP_ANY]
        else:
            backends = [cv2.CAP_V4L2, cv2.CAP_ANY]

        for backend in backends:
            try:
                self.cap = cv2.VideoCapture(self.camera_id, backend)
                
                if not self.cap.isOpened():
                    continue

                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                self.cap.set(cv2.CAP_PROP_FPS, 30)
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

                self.frame_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                self.frame_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

                ret, test_frame = self.cap.read()
                if ret and test_frame is not None:
                    print(f"Camera opened with backend: {backend}")
                    return True
                else:
                    self.cap.release()
                    continue

            except Exception as e:
                print(f"Backend {backend} failed: {e}")
                if self.cap:
                    self.cap.release()
                continue

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
                print("Camera timeout, attempting reconnect...")
                if not self._reconnect():
                    return False, None

            ret, frame = self.cap.read()
            
            if ret and frame is not None:
                self.last_frame_time = current_time
                self.retry_count = 0
                with self.lock:
                    self.frame = frame.copy()
                return True, frame
            else:
                self.retry_count += 1
                if self.retry_count > 5:
                    print("Multiple read failures, attempting reconnect...")
                    self._reconnect()
                return False, None
                
        except Exception as e:
            print(f"Camera read error: {e}")
            return False, None

    def _reconnect(self):
        try:
            if self.cap:
                self.cap.release()
            time.sleep(0.5)
            return self._try_open_camera()
        except Exception as e:
            print(f"Reconnect error: {e}")
            return False

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
        
        try:
            return {
                'width': int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                'height': int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
                'fps': int(self.cap.get(cv2.CAP_PROP_FPS)),
                'backend': self.cap.getBackendName() if hasattr(self.cap, 'getBackendName') else 'unknown',
                'camera_id': self.camera_id
            }
        except Exception as e:
            print(f"Error getting camera info: {e}")
            return None