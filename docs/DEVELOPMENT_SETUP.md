# 🛠️ Development Setup Guide

## Langkah-langkah Setup Development di Windows

### 1. **Prerequisites**
Pastikan sudah terinstall:
- **Python 3.8+** - [Download disini](https://python.org/downloads)
- **Node.js 18+** - [Download disini](https://nodejs.org)
- **Git** - [Download disini](https://git-scm.com)

### 2. **Clone Project**
```bash
git clone <repository-url>
cd self-checkout-system
```

### 3. **Automatic Setup (Recommended)**

#### Windows:
```bash
# Jalankan script otomatis
./start-dev.bat
```

#### Linux/Mac:
```bash
# Jadikan executable
chmod +x start-dev.sh

# Jalankan script otomatis  
./start-dev.sh
```

### 4. **Manual Setup (Alternative)**

#### Backend Setup:
```bash
cd services

# Buat virtual environment
python -m venv venv

# Aktivasi virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download model YOLOv5
python download_model.py

# Start backend server
python app.py
```

#### Frontend Setup:
```bash
# Di terminal baru, kembali ke root folder
cd .. 

# Install dependencies
npm install

# Start development server
npm run dev:next
```

## 🌐 Akses Aplikasi

Setelah setup selesai:

- **Frontend**: http://localhost:3000
- **Backend API**: http://127.0.0.1:5000  
- **Video Feed**: http://127.0.0.1:5000/video_feed
- **API Health**: http://127.0.0.1:5000/api/health

## 🧪 Testing

### Test Frontend-Backend Connection:
1. Buka http://localhost:3000
2. Klik tombol "Configuration" - should open modal
3. Klik tombol "Products" - should show product list
4. Check browser console for any errors

### Test Camera & Detection:
1. Click "Start Scanning" 
2. Video feed should appear
3. Enable "Simulation Mode"
4. Add virtual objects to test detection

## 🔧 Common Issues

### Backend Issues:

**Error: Camera not found**
```
Solusi: Normal untuk development tanpa kamera fisik.
Gunakan Simulation Mode untuk testing.
```

**Error: Module not found**
```bash
# Re-install dependencies
cd services
pip install -r requirements.txt
```

**Error: Model not found**
```bash
cd services
python download_model.py
```

### Frontend Issues:

**Error: Connection refused**
```
Solusi: Pastikan backend running di http://127.0.0.1:5000
Check di browser: http://127.0.0.1:5000
```

**Error: Module not found**
```bash
# Re-install dependencies
npm install
```

**Socket.IO connection errors**
```
Solusi: Restart kedua server (frontend & backend)
```

## 📁 Struktur Project

```
self-checkout-system/
├── 📁 app/                    # Next.js frontend
├── 📁 components/             # React components
├── 📁 services/               # Python backend
│   ├── app.py                 # Main Flask server
│   ├── CameraHandler.py       # Camera management
│   ├── DetectorManager.py     # YOLO detection
│   ├── ProductManager.py      # Product CRUD
│   ├── FirestoreManager.py    # Database
│   └── models/                # YOLOv5 model
├── 📁 hooks/                  # React hooks
├── 📁 lib/                    # Utilities & types
├── start-dev.bat              # Windows startup
└── start-dev.sh               # Linux/Mac startup
```

## 🚀 Development Workflow

1. **Start Development**:
   ```bash
   ./start-dev.bat    # Windows
   ./start-dev.sh     # Linux/Mac
   ```

2. **Frontend Development**:
   - Edit files in `app/`, `components/`, `hooks/`, `lib/`
   - Hot reload automatic
   - Check http://localhost:3000

3. **Backend Development**:
   - Edit files in `services/`
   - Restart server manually: `Ctrl+C` → `python app.py`
   - Check http://127.0.0.1:5000

4. **Testing Features**:
   - Use Simulation Mode for detection testing
   - Configure detection zones via UI
   - Test product management
   - Test shopping cart functionality

## 🔄 Next Steps

Setelah development environment berjalan:

1. **Customize Products**: Edit `services/products.yaml`
2. **Train Custom Model**: Prepare dataset for your specific products
3. **Hardware Integration**: Connect camera, sensors (for later)
4. **Firebase Setup**: Configure real database (optional)

## 📞 Troubleshooting

Jika masih ada masalah:

1. Check log output di terminal
2. Buka browser developer tools (F12)
3. Restart kedua server
4. Clear browser cache
5. Re-install dependencies

**Happy Coding! 🎉**