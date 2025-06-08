@echo off
echo.
echo ============================================
echo   Self-Checkout System - Development Mode
echo ============================================
echo.

echo Checking Python environment...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found! Please install Python 3.8+
    pause
    exit /b 1
)

echo Checking Node.js environment...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found! Please install Node.js 18+
    pause
    exit /b 1
)

echo.
echo Setting up backend...
cd services

if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -r requirements.txt

if not exist "models\yolov5s.pt" (
    echo Downloading YOLOv5 model...
    python download_model.py
)

echo.
echo Starting backend server...
start cmd /k "title Backend Server && venv\Scripts\activate && python app.py"

cd ..

echo.
echo Setting up frontend...
if not exist "node_modules" (
    echo Installing Node.js dependencies...
    npm install
)

echo.
echo Starting frontend development server...
start cmd /k "title Frontend Server && npm run dev:next"

echo.
echo ============================================
echo   Development servers are starting...
echo ============================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://127.0.0.1:5000
echo Video:    http://127.0.0.1:5000/video_feed
echo.
echo Press any key to exit...
pause >nul