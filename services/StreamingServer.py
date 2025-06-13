import cv2
import threading
import time
import numpy as np
from flask import Response
import io


class StreamingServer:
    def __init__(self):
        self.frame = None
        self.frame_lock = threading.Lock()
        self.output_frame = None
        self.frame_count = 0
        self.is_running = False
        
    def update_frame(self, frame):
        """Update the current frame thread-safely"""
        if frame is not None:
            with self.frame_lock:
                self.frame = frame.copy()
                self.frame_count += 1
    
    def get_frame(self):
        """Get current frame thread-safely"""
        with self.frame_lock:
            if self.frame is not None:
                return self.frame.copy()
            return self._create_placeholder_frame()
    
    def _create_placeholder_frame(self):
        """Create a placeholder frame when no camera input"""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frame[:] = [30, 30, 30]  # Dark gray
        
        # Add centered text
        text = "Waiting for camera..."
        font = cv2.FONT_HERSHEY_SIMPLEX
        text_size = cv2.getTextSize(text, font, 1, 2)[0]
        text_x = (640 - text_size[0]) // 2
        text_y = (480 + text_size[1]) // 2
        
        cv2.putText(frame, text, (text_x, text_y), font, 1, (255, 255, 255), 2)
        
        return frame
    
    def generate_mjpeg_stream(self):
        """Generate MJPEG stream for video element"""
        self.is_running = True
        frame_count = 0
        
        print("🎬 MJPEG Stream started")
        
        while self.is_running:
            try:
                frame_count += 1
                
                # Get current frame
                frame = self.get_frame()
                
                if frame is None:
                    frame = self._create_placeholder_frame()
                    if frame_count % 50 == 0:
                        print(f"⚠️ Using placeholder frame (count: {frame_count})")
                
                # Encode frame as JPEG with high quality
                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 90]
                success, encoded_image = cv2.imencode('.jpg', frame, encode_param)
                
                if not success:
                    print(f"❌ Frame encoding failed at frame {frame_count}")
                    continue
                
                # Log every 100 frames
                if frame_count % 100 == 0:
                    print(f"📡 MJPEG: Sent {frame_count} frames, current size: {len(encoded_image)} bytes")
                
                # Create MJPEG frame
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n'
                       b'Content-Length: ' + str(len(encoded_image)) + b'\r\n'
                       b'\r\n' + encoded_image.tobytes() + b'\r\n')
                
                # Control frame rate - 25 FPS
                time.sleep(0.04)
                
            except GeneratorExit:
                print("🛑 MJPEG Stream client disconnected")
                break
            except Exception as e:
                print(f"💥 MJPEG streaming error: {e}")
                time.sleep(0.1)
        
        print("🔚 MJPEG Stream ended")
    
    def generate_single_frame(self):
        """Generate single frame for fallback"""
        try:
            frame = self.get_frame()
            
            if frame is None:
                frame = self._create_placeholder_frame()
            
            # Encode as JPEG
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 85]
            success, encoded_image = cv2.imencode('.jpg', frame, encode_param)
            
            if success:
                return encoded_image.tobytes()
            else:
                return None
                
        except Exception as e:
            print(f"Single frame generation error: {e}")
            return None
    
    def stop(self):
        """Stop the streaming server"""
        self.is_running = False