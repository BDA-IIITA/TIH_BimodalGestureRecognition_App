#!/usr/bin/env python3
"""
MediaPipe Gesture Recognition - Runs directly on Raspberry Pi
No network latency - processes camera feed locally.

Install on Pi:
    pip install mediapipe opencv-python flask flask-socketio

Run:
    python3 mediapipe_local.py

Access from any device:
    http://PI_IP:5001
"""

import cv2
import numpy as np
import pickle
import threading
import time
import base64
from flask import Flask, render_template_string, jsonify, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS

# ============================================
# CONFIGURATION
# ============================================
PORT = 5001
WIDTH = 640
HEIGHT = 480
FRAMERATE = 30

# Try picamera2 first
try:
    from picamera2 import Picamera2
    USE_PICAMERA = True
except ImportError:
    USE_PICAMERA = False

# ============================================
# MediaPipe Setup
# ============================================
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# Load models
MODEL_PATH = "hand_landmarker.task"
CLASSIFIER_PATH = "gesture_classifier_rf.pkl"

print("Loading models...")
BaseOptions = mp.tasks.BaseOptions
HandLandmarker = mp.tasks.vision.HandLandmarker
HandLandmarkerOptions = mp.tasks.vision.HandLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

options = HandLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=MODEL_PATH),
    running_mode=VisionRunningMode.IMAGE,
    num_hands=1
)
landmarker = HandLandmarker.create_from_options(options)

with open(CLASSIFIER_PATH, 'rb') as f:
    classifier = pickle.load(f)

CLASS_NAMES = ['call', 'emergency', 'food', 'medicine', 'no', 
               'sleep', 'stop', 'washroom', 'water', 'yes']

HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (0, 9), (9, 10), (10, 11), (11, 12),
    (0, 13), (13, 14), (14, 15), (15, 16),
    (0, 17), (17, 18), (18, 19), (19, 20),
    (5, 9), (9, 13), (13, 17)
]

print("Models loaded!")

# ============================================
# Flask App
# ============================================
app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Global state
latest_prediction = {"gesture": None, "confidence": 0}
is_running = True


def normalize_landmarks(hand_landmarks):
    coords = np.array([(lm.x, lm.y, lm.z) for lm in hand_landmarks[0]])
    relative_coords = coords - coords[0]
    return relative_coords.flatten()


def process_frame(frame):
    """Process a single frame and return annotated frame + prediction"""
    global latest_prediction
    
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
    
    results = landmarker.detect(mp_image)
    prediction = None
    
    if results.hand_landmarks:
        hand_landmarks_list = results.hand_landmarks
        
        # Classify gesture
        normalized = normalize_landmarks(hand_landmarks_list)
        pred_index = classifier.predict(normalized.reshape(1, -1))[0]
        confidence = classifier.predict_proba(normalized.reshape(1, -1)).max()
        
        label = CLASS_NAMES[pred_index]
        prediction = {"gesture": label, "confidence": float(confidence)}
        latest_prediction = prediction
        
        # Draw landmarks
        h, w = frame.shape[:2]
        points = [(int(lm.x * w), int(lm.y * h)) for lm in hand_landmarks_list[0]]
        
        for connection in HAND_CONNECTIONS:
            cv2.line(frame, points[connection[0]], points[connection[1]], (0, 255, 0), 2)
        for point in points:
            cv2.circle(frame, point, 5, (255, 0, 0), -1)
        
        # Draw label
        cv2.putText(frame, f"{label} ({confidence:.0%})", (10, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)
    else:
        latest_prediction = {"gesture": None, "confidence": 0}
    
    return frame, prediction


def camera_loop():
    """Main camera processing loop"""
    global is_running
    
    if USE_PICAMERA:
        picam2 = Picamera2()
        config = picam2.create_video_configuration(
            main={"size": (WIDTH, HEIGHT), "format": "RGB888"},
            buffer_count=2
        )
        picam2.configure(config)
        picam2.start()
        print(f"📷 Picamera2 started: {WIDTH}x{HEIGHT}")
    else:
        cap = cv2.VideoCapture(0)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, HEIGHT)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        print(f"📷 OpenCV camera started: {WIDTH}x{HEIGHT}")
    
    frame_time = 1.0 / FRAMERATE
    
    while is_running:
        start = time.time()
        
        # Capture frame
        if USE_PICAMERA:
            frame = picam2.capture_array("main")
            frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        else:
            ret, frame = cap.read()
            if not ret:
                continue
        
        # Flip for mirror effect
        frame = cv2.flip(frame, 1)
        
        # Process with MediaPipe
        annotated_frame, prediction = process_frame(frame)
        
        # Encode and emit
        _, jpeg = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        b64_frame = base64.b64encode(jpeg.tobytes()).decode('utf-8')
        
        socketio.emit('new_frame', {
            'image': f'data:image/jpeg;base64,{b64_frame}',
            'predictions': [prediction] if prediction else []
        })
        
        # Rate limit
        elapsed = time.time() - start
        if elapsed < frame_time:
            time.sleep(frame_time - elapsed)
    
    if USE_PICAMERA:
        picam2.stop()
    else:
        cap.release()


@app.route('/')
def index():
    return render_template_string('''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Gesture Recognition - Local Pi</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.0.1/socket.io.js"></script>
        <style>
            body { background: #1a1a2e; color: #fff; font-family: Arial; text-align: center; padding: 20px; }
            h1 { color: #00d9ff; }
            #video { border: 3px solid #00d9ff; border-radius: 10px; max-width: 100%; }
            #prediction { font-size: 2em; margin: 20px; padding: 20px; background: #16213e; border-radius: 10px; }
            .gesture { color: #00d9ff; font-weight: bold; }
        </style>
    </head>
    <body>
        <h1>🤖 Local Gesture Recognition</h1>
        <p>Running on Raspberry Pi - Zero network latency!</p>
        <img id="video" src="" alt="Video stream">
        <div id="prediction">Waiting for gesture...</div>
        
        <script>
            const socket = io();
            const video = document.getElementById('video');
            const prediction = document.getElementById('prediction');
            
            socket.on('new_frame', (data) => {
                video.src = data.image;
                if (data.predictions && data.predictions.length > 0) {
                    const p = data.predictions[0];
                    prediction.innerHTML = `<span class="gesture">${p.gesture.toUpperCase()}</span> (${(p.confidence * 100).toFixed(0)}%)`;
                } else {
                    prediction.innerHTML = 'No hand detected';
                }
            });
        </script>
    </body>
    </html>
    ''')


@app.route('/predict')
def predict():
    """API endpoint for current prediction"""
    return jsonify(latest_prediction)


if __name__ == '__main__':
    print("=" * 50)
    print("🚀 Local MediaPipe Gesture Recognition")
    print("=" * 50)
    
    # Start camera thread
    camera_thread = threading.Thread(target=camera_loop, daemon=True)
    camera_thread.start()
    
    # Get IP
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except:
        local_ip = "localhost"
    
    print(f"\n✅ Open in browser: http://{local_ip}:{PORT}")
    print("Press Ctrl+C to stop\n")
    
    socketio.run(app, host='0.0.0.0', port=PORT, debug=False)
