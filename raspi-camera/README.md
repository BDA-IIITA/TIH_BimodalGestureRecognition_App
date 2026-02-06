# Raspberry Pi Camera Streaming for MediaPipe

Low-latency camera streaming solutions for the gesture recognition system.

## 🚀 Quick Start (On Raspberry Pi)

### Option 1: Simple MJPEG Stream (Easiest)

```bash
# Install
sudo apt install libcamera-apps netcat

# Stream (replace 8080 with your port)
libcamera-vid -t 0 --inline --codec mjpeg --width 640 --height 480 --framerate 30 -o - | nc -lkv4 8080
```

**MediaPipe URL:** `http://RASPBERRY_PI_IP:8080`

---

### Option 2: Python Stream Server (Recommended) ⭐

```bash
# Install dependencies
sudo apt install python3-picamera2

# Copy stream_camera.py to Pi and run
python3 stream_camera.py
```

**MediaPipe URL:** `http://RASPBERRY_PI_IP:8080/video`

---

### Option 3: mjpg-streamer (Most Compatible)

```bash
# Install
sudo apt install cmake libjpeg-dev
git clone https://github.com/jacksonliam/mjpg-streamer.git
cd mjpg-streamer/mjpg-streamer-experimental
make && sudo make install

# Run
mjpg_streamer -i "input_uvc.so -d /dev/video0 -r 640x480 -f 30" -o "output_http.so -p 8080"
```

**MediaPipe URL:** `http://RASPBERRY_PI_IP:8080/?action=stream`

---

## 🎯 Latency Optimization Tips

| Setting | Recommendation |
|---------|----------------|
| Resolution | 640x480 (lower = faster) |
| Framerate | 30 FPS |
| JPEG Quality | 70-80% |
| Buffer Size | Minimize (1 frame) |
| Network | Use Ethernet or 5GHz WiFi |
| Distance | Pi close to router |

### Reduce Latency Further

1. **Lower resolution:** `--width 320 --height 240`
2. **Lower quality:** Add `--quality 70` to libcamera
3. **Disable buffering:** Use TCP instead of HTTP
4. **Use wired connection:** Ethernet > WiFi

---

## 🔧 Connect to MediaPipe

In the gesture app, set the camera URL to:

```
http://RASPBERRY_PI_IP:8080/video
```

Or use the MediaPipe web UI at `http://YOUR_SERVER:5001` → Camera Configuration → Enter URL → Connect

---

## 📊 Expected Latency

| Method | Latency | Complexity |
|--------|---------|------------|
| MJPEG HTTP | 100-200ms | Easy |
| Python Server | 80-150ms | Easy |
| GStreamer TCP | 50-100ms | Medium |
| WebRTC | 30-80ms | Complex |

---

## 🐛 Troubleshooting

### Camera not detected
```bash
# Check if camera is enabled
sudo raspi-config  # Interface Options → Camera → Enable

# Test camera
libcamera-hello
```

### Stream not accessible
```bash
# Check firewall
sudo ufw allow 8080

# Check if port is in use
sudo lsof -i :8080
```

### High latency
- Reduce resolution/quality
- Use wired Ethernet
- Move Pi closer to router
- Check CPU usage: `htop`
