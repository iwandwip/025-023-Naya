# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **full-stack AI-powered self-checkout system** built as a thesis project for Politeknik Negeri Malang. It uses YOLOv5 computer vision to automatically detect products without requiring barcodes, designed for minimarket/convenience store environments.

**Architecture:**
- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS 4
- **Backend**: Python Flask + YOLOv5 + OpenCV + Socket.IO
- **Real-time Communication**: Socket.IO for live updates
- **Database**: Firebase Firestore (optional) + YAML-based product storage  
- **Target Deployment**: Raspberry Pi with camera and hardware sensors

## Development Commands

### Start Development Environment
```bash
# Quick start (recommended) - starts both frontend and backend
npm run dev

# Start services separately
npm run dev:next     # Frontend only (port 3002)
npm run dev:python   # Backend only (port 5002)

# Alternative quick start
./start-dev.bat      # Windows - handles all setup automatically
./start-dev.sh       # Linux/Mac
```

### Build & Production
```bash
npm run build                    # Build Next.js for production
npm run build:windows           # Build with increased memory limit
npm run start                   # Start production servers
npm run deploy:pi               # Deploy to Raspberry Pi
```

### Environment & Setup
```bash
npm run env:setup              # Copy .env.example files to .env
npm run env:check              # Validate environment variables
npm run kill:ports             # Kill Node.js processes on Windows
```

### Linting & Quality
```bash
npm run lint                   # Run Next.js ESLint
```

## Key Architecture Patterns

### Real-time Communication
- **Socket.IO** handles bidirectional communication between React frontend and Flask backend
- Events: `detection_update`, `cart_update`, `system_status`, `simulation_control`
- Custom hook `useSocket.ts` manages connection state and event handlers

### State Management
- **Zustand** stores for cart, detection settings, and simulation state
- **TanStack Query** for server state management and API caching
- Socket.IO events trigger state updates in real-time

### AI Detection Pipeline
```
Camera/Simulation → DetectorManager → YOLOv5 Model → Detection Results → Socket.IO → Frontend Updates
```

### Component Architecture
- **Scanner View**: Main detection interface with camera feed and zone overlays
- **Cart Sidebar**: Real-time shopping cart with automatic product addition
- **Configuration Window**: Detection zone settings, visual options, and performance tuning
- **Simulation Mode**: Virtual object testing without physical hardware

### Hardware Integration Layer
```
Raspberry Pi ← ESP32 Controller ← Sensors (Ultrasonic, Servo, Camera)
```

## Environment Configuration

### Port Configuration
- **Frontend**: Port 3002 (configurable via `PORT` in .env)
- **Backend**: Port 5002 (configurable via `FLASK_PORT` in services/.env)

### Environment Files
- **Frontend**: `.env` (API URLs, development settings)
- **Backend**: `services/.env` (Flask config, hardware settings, Firebase)

### Key Environment Variables
```bash
# Frontend (.env)
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5002
NEXT_PUBLIC_SOCKET_URL=http://127.0.0.1:5002
PORT=3002

# Backend (services/.env)
FLASK_HOST=127.0.0.1
FLASK_PORT=5002
CAMERA_ID=0
MODEL_PATH=models/yolov5s.pt
```

## File Structure Patterns

### Frontend Component Organization
- `components/ui/`: Reusable UI primitives (shadcn/ui based)
- `components/scanner/`: Detection and camera components
- `components/cart/`: Shopping cart functionality
- `components/admin/`: Product management interface
- `components/config/`: System configuration UI
- `hooks/`: Custom React hooks (especially `useSocket.ts`)

### Backend Service Organization
- `services/app.py`: Main Flask server with Socket.IO
- `services/*Manager.py`: Specialized service classes (Detector, Product, Camera, Firestore)
- `services/products.yaml`: Product database (primary storage)
- `services/models/`: YOLOv5 model files

## Development Workflows

### Adding New Products
1. Edit `services/products.yaml` OR use admin interface
2. Products auto-sync between YAML and Firebase (if configured)
3. No server restart required - changes reflect immediately

### Modifying Detection Logic
1. Edit `services/DetectorManager.py` for YOLO inference changes
2. Edit `components/scanner/ScannerView.tsx` for frontend detection display
3. Configuration changes via UI persist to `services/detection_config.json`

### Testing Without Hardware
1. Enable "Simulation Mode" in scanner interface
2. Use virtual object controls to test detection algorithms
3. All detection logic works identically in simulation mode

## Common Development Tasks

### Camera/Hardware Issues
- Set `CAMERA_ID=-1` in `services/.env` to disable camera for development
- Use Simulation Mode for testing detection without hardware
- Check `services/CameraHandler.py` for camera initialization logic

### Socket.IO Debugging
- Monitor browser console for Socket.IO connection status
- Backend Socket.IO events logged in Flask console
- Connection status displayed in frontend header

### Model Management
- YOLOv5 model downloaded automatically via `services/download_model.py`
- Custom models: Update `MODEL_PATH` in `services/.env`
- Model files stored in `services/models/` directory

### Firebase Integration
- Optional cloud storage for products and transactions
- Configure `FIREBASE_CREDENTIALS_PATH` in `services/.env`
- Fallback to YAML storage if Firebase unavailable

## Testing & Deployment

### Development Testing
- Use Simulation Mode for detection algorithm testing
- Test Socket.IO connectivity via browser developer tools
- Monitor Flask backend logs for detection events and errors

### Production Deployment
- Target: Raspberry Pi with camera module
- Uses WiFi hotspot (SSID: `SelfCheckout-Store`)
- Deploy script: `npm run deploy:pi` or manual via `scripts/deploy-pi.sh`

## Key Dependencies & Versions

### Frontend Critical Dependencies
- Next.js 15.3.3 with Turbopack (dev server)
- React 19 (latest stable)
- Tailwind CSS 4 (latest)
- Socket.IO Client 4.8.1

### Backend Critical Dependencies  
- Flask + Flask-SocketIO for server
- Ultralytics YOLOv5 (8.2.34+) for detection
- OpenCV (4.1.1+) for camera handling
- PyTorch for deep learning inference

### Environment Notes
- Node.js 18+ required for Next.js 15
- Python 3.8+ required for YOLOv5 compatibility
- Windows development uses `cmd /c` commands in npm scripts