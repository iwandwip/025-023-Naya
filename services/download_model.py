import os
import requests
import torch
from pathlib import Path


def download_yolov5_model():
    models_dir = Path('models')
    models_dir.mkdir(exist_ok=True)
    
    model_path = models_dir / 'yolov5s.pt'
    
    if model_path.exists():
        print(f"✅ Model already exists at {model_path}")
        return str(model_path)
    
    print("📥 Downloading YOLOv5s model...")
    
    try:
        model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)
        torch.save(model.state_dict(), model_path)
        print(f"✅ YOLOv5s model downloaded successfully to {model_path}")
        return str(model_path)
        
    except Exception as e:
        print(f"❌ Error downloading model via torch.hub: {e}")
        
        try:
            print("📥 Trying direct download...")
            url = "https://github.com/ultralytics/yolov5/releases/download/v6.0/yolov5s.pt"
            
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0
            
            with open(model_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total_size > 0:
                            percent = (downloaded / total_size) * 100
                            print(f"\r📥 Downloading: {percent:.1f}%", end='', flush=True)
            
            print(f"\n✅ YOLOv5s model downloaded successfully to {model_path}")
            return str(model_path)
            
        except Exception as e2:
            print(f"❌ Error downloading model directly: {e2}")
            return None


def verify_model():
    model_path = Path('models/yolov5s.pt')
    
    if not model_path.exists():
        print("❌ Model file not found")
        return False
    
    try:
        print("🔍 Verifying model...")
        model = torch.hub.load('ultralytics/yolov5', 'custom', path=str(model_path), force_reload=True)
        print("✅ Model verification successful")
        return True
        
    except Exception as e:
        print(f"❌ Model verification failed: {e}")
        return False


def check_dependencies():
    print("🔍 Checking dependencies...")
    
    required_packages = [
        'torch', 'torchvision', 'opencv-python', 'pillow', 
        'numpy', 'matplotlib', 'pyyaml', 'requests'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} - MISSING")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n📦 Install missing packages:")
        print(f"pip install {' '.join(missing_packages)}")
        return False
    
    print("✅ All dependencies are installed")
    return True


def main():
    print("=" * 50)
    print("🛒 Self-Checkout System - Model Setup")
    print("=" * 50)
    
    if not check_dependencies():
        print("\n❌ Please install missing dependencies first")
        return
    
    model_path = download_yolov5_model()
    
    if model_path and verify_model():
        print("\n🎉 Setup completed successfully!")
        print(f"📁 Model location: {model_path}")
        print("\n🚀 You can now run: python app.py")
    else:
        print("\n❌ Setup failed. Please check the errors above.")


if __name__ == "__main__":
    main()