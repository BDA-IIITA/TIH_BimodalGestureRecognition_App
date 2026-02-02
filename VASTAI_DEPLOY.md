# Vast.ai Deployment Guide

## Quick Deploy Steps

### 1. Build the Image Locally

```bash
cd /Users/swarup/Desktop/TiH_IIITA_Project-main

# Build all-in-one image
docker build -f Dockerfile.vastai -t gesture-app:vastai .
```

### 2. Push to Docker Hub

```bash
# Login to Docker Hub
docker login

# Tag with your username
docker tag gesture-app:vastai YOUR_USERNAME/gesture-app:latest

# Push
docker push YOUR_USERNAME/gesture-app:latest
```

### 3. Create Vast.ai Instance

1. Go to [Vast.ai Console](https://vast.ai/console/create/)

2. **Select Instance:**
   - For MediaPipe: Any GPU or CPU instance works
   - Recommended: RTX 3080 or cheaper for testing

3. **Docker Image:**
   ```
   YOUR_USERNAME/gesture-app:latest
   ```

4. **Docker Options:**
   ```
   -p 3000:3000 -p 5001:5001 -p 8000:8000
   ```

5. **Environment Variables:**
   ```
   STREAM_URL=http://YOUR_CAMERA_IP:8080/video
   ```

6. Click **RENT** to start

### 4. Access Your App

Once instance is running, find the IP in Vast.ai dashboard:

| Service | URL |
|---------|-----|
| Frontend | `http://INSTANCE_IP:3000` |
| Flex API | `http://INSTANCE_IP:8000` |
| MediaPipe | `http://INSTANCE_IP:5001` |

## Ports Exposed

| Port | Service |
|------|---------|
| 3000 | React Frontend (nginx) |
| 5001 | MediaPipe Backend (Flask-SocketIO) |
| 8000 | Flex Backend (FastAPI) |

## Camera Stream Setup

The MediaPipe backend needs a video stream. Options:

### Option A: IP Webcam (Android)
1. Install "IP Webcam" app on phone
2. Start server in app
3. Set `STREAM_URL=http://PHONE_IP:8080/video`

### Option B: Local Webcam (if running locally)
Modify `MediaPipe/app.py`:
```python
cap = cv2.VideoCapture(0)  # Use webcam index instead of URL
```

## Troubleshooting

### Check Logs on Vast.ai
```bash
# SSH into instance (find command in Vast.ai dashboard)
ssh -p PORT root@INSTANCE_IP

# View logs
supervisorctl status
tail -f /var/log/supervisor/*.log
```

### Test Individual Services
```bash
# Inside container
curl http://localhost:8000/          # Flex health check
curl http://localhost:5001/          # MediaPipe health check
curl http://localhost:3000/          # Frontend
```
