# 🔧 Environment Configuration Guide

## 📁 File Environment

Sekarang semua konfigurasi menggunakan environment variables (`.env` files):

```
project-root/
├── .env                    # Frontend environment variables
├── .env.example           # Frontend template
├── services/
│   ├── .env              # Backend environment variables  
│   └── .env.example      # Backend template
```

## 🌐 Frontend Environment (.env)

```bash
# API & Socket Configuration
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5000
NEXT_PUBLIC_SOCKET_URL=http://127.0.0.1:5000
NEXT_PUBLIC_ENVIRONMENT=development

# Development Settings
NODE_ENV=development
PORT=3000

# Backend Connection (for scripts)
BACKEND_HOST=127.0.0.1
BACKEND_PORT=5000
```

## 🐍 Backend Environment (services/.env)

```bash
# Flask Server Configuration
FLASK_HOST=127.0.0.1
FLASK_PORT=5000
FLASK_DEBUG=True
FLASK_SECRET_KEY=self-checkout-secret-key-dev

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Hardware Configuration
CAMERA_ID=0
MODEL_PATH=models/yolov5s.pt

# Firebase Configuration
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json

# YOLOv5 Model Configuration
YOLO_MODEL_URL=https://github.com/ultralytics/yolov5/releases/download/v6.0/yolov5s.pt

# File Paths
PRODUCTS_CONFIG_PATH=products.yaml
DETECTION_CONFIG_PATH=detection_config.json

# Logging
LOG_LEVEL=INFO
```

## 🚀 Environment-specific Configurations

### Development Mode:
```bash
# Frontend (.env)
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5000
NODE_ENV=development

# Backend (services/.env)
FLASK_HOST=127.0.0.1
FLASK_PORT=5000
FLASK_DEBUG=True
```

### Production Mode (Raspberry Pi):
```bash
# Frontend (.env)
NEXT_PUBLIC_API_BASE_URL=http://192.168.4.1:5000
NODE_ENV=production

# Backend (services/.env)
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
FLASK_DEBUG=False
CORS_ORIGINS=http://192.168.4.1:3000,http://localhost:3000
```

### Testing Mode:
```bash
# Frontend (.env)
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001
NODE_ENV=test

# Backend (services/.env)
FLASK_HOST=localhost
FLASK_PORT=5001
FLASK_DEBUG=True
CAMERA_ID=-1  # Disable camera for testing
```

## 🔧 Custom Configuration

### Ubah Port:
```bash
# Frontend port
PORT=3001

# Backend port  
FLASK_PORT=5001
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5001
```

### Ubah Camera:
```bash
# services/.env
CAMERA_ID=1  # Use camera index 1
# CAMERA_ID=-1  # Disable camera
```

### Custom Model:
```bash
# services/.env
MODEL_PATH=models/custom-model.pt
YOLO_MODEL_URL=https://example.com/my-custom-model.pt
```

### Firebase Setup:
```bash
# services/.env
FIREBASE_CREDENTIALS_PATH=my-firebase-key.json
```

### Development dengan IP lain:
```bash
# Frontend (.env)
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.100:5000

# Backend (services/.env)
FLASK_HOST=192.168.1.100
CORS_ORIGINS=http://192.168.1.100:3000,http://localhost:3000
```

## 📋 Setup Instructions

### 1. Automatic Setup:
```bash
# Script akan otomatis copy .env.example ke .env
./start-dev.bat    # Windows
./start-dev.sh     # Linux/Mac
```

### 2. Manual Setup:
```bash
# Copy template files
cp .env.example .env
cp services/.env.example services/.env

# Edit configuration
nano .env
nano services/.env
```

### 3. Validation:
```bash
# Check frontend environment
npm run dev:next

# Check backend environment  
cd services
python app.py
```

## ⚠️ Security Notes

1. **Never commit .env files** (sudah ada di .gitignore)
2. **Use strong SECRET_KEY** untuk production
3. **Limit CORS_ORIGINS** untuk production
4. **Use HTTPS** untuk production deployment

## 🐛 Troubleshooting

### Environment tidak terbaca:
```bash
# Install python-dotenv
pip install python-dotenv

# Restart servers setelah ubah .env
```

### CORS errors:
```bash
# Update CORS_ORIGINS di services/.env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.100:3000
```

### Port conflicts:
```bash
# Ubah port di .env
PORT=3001  # Frontend
FLASK_PORT=5001  # Backend
```

**Happy Configuring! 🎉**