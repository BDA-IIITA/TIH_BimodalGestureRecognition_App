# Gesture Recognition Project (TiH IIITA)

A unified gesture recognition system using MediaPipe and Flex Sensors.

## 🚀 Quick Start (Docker)

```bash
docker build --platform linux/amd64 -t swarupnarkhede/gesture-app:vastai -f Dockerfile.vastai .
```

```bash
docker run -p 3000:3000 -p 5001:5001 -p 8000:8000 swarupnarkhede/gesture-app:vastai
```

Then open: http://localhost:3000

## 📁 Project Structure

```
├── flex/           # Flex sensor backend (FastAPI)
├── frontend/       # React frontend
├── MediaPipe/      # MediaPipe gesture detection
├── android-app/    # Android application for mobile gesture interaction
└── Dockerfile.vastai  # Cloud deployment
```

# 📱 Android App

The android-app module provides a mobile interface for interacting with the gesture recognition system.

## Features

* Connects to backend APIs

* Displays gesture recognition results

* Enables mobile-based control/visualization

## 🚀 How to Run the Android App

1. Open android-app in Android Studio

2. Allow Gradle to sync dependencies

3. Connect Android device or start emulator

4. Click Run ▶

Make sure backend services (MediaPipe/Flex/API) are running so the app can communicate with them.

## 🌐 Cloud Deployment (Vast.ai)

See [VASTAI_DEPLOY.md](VASTAI_DEPLOY.md) for deployment instructions.

## 🛠️ Local Development

### Backend (MediaPipe)
```bash
cd MediaPipe
pip install -r requirements.txt
python app.py
```

### Backend (Flex)
```bash
cd flex
pip install -r requirements.txt
uvicorn main:app --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## 📝 License

MIT License
