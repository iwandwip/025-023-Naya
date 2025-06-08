import cv2
import threading


class Camera:
    def __init__(self, camera_id=0):
        self.camera_id = camera_id
        self.cap = None
        self.is_running = False
        self.frame = None
        self.lock = threading.Lock()
        self.frame_width = 640
        self.frame_height = 480

    def start(self):
        if self.is_running:
            return False

        try:
            self.cap = cv2.VideoCapture(self.camera_id, cv2.CAP_DSHOW)
            if not self.cap.isOpened():
                self.cap = cv2.VideoCapture(self.camera_id)

            if not self.cap.isOpened():
                print(f"Error: Could not open camera with index {self.camera_id}")
                return False

            self.frame_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            self.frame_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            self.is_running = True
            return True
        except Exception as e:
            print(f"Error starting camera: {e}")
            return False

    def stop(self):
        self.is_running = False
        if self.cap and self.cap.isOpened():
            self.cap.release()
            self.cap = None
        return True

    def read(self):
        if not self.is_running or not self.cap or not self.cap.isOpened():
            return False, None

        return self.cap.read()

    def get_dimensions(self):
        return (self.frame_width, self.frame_height)
