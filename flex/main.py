from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np
import os
import joblib
from fastapi.middleware.cors import CORSMiddleware
from collections import deque, Counter

# ==========================================
# CONFIGURATION
# ==========================================
app = FastAPI()

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "final_gesture_model.pkl")

print("🔎 Loading model from:", MODEL_PATH)
model = joblib.load(MODEL_PATH)
print("✅ Model loaded")


# Map IDs to Names
GESTURE_MAP = {
    0: 'Call', 1: 'Emergency', 2: 'Food', 3: 'Medicine',
    4: 'No', 5: 'Sleep', 6: 'Stop', 7: 'Washroom',
    8: 'Water', 9: 'Yes'
}

# ==========================================
# BUFFERS (SMOOTHING LOGIC)
# ==========================================
# RAW_BUFFER: Averages the last 20 readings (approx 1 sec) to remove electrical noise.
RAW_BUFFER_SIZE = 20
raw_buffer = deque(maxlen=RAW_BUFFER_SIZE)

# PRED_BUFFER: Takes a majority vote of the last 10 predictions to prevent flickering.
PRED_BUFFER_SIZE = 10
pred_buffer = deque(maxlen=PRED_BUFFER_SIZE)

# Store latest raw data for debugging
latest_values = {}

# ==========================================
# INPUT SCHEMA
# ==========================================
class SensorInput(BaseModel):
    timestamp: str
    ch0_raw: int
    ch0_volt: float
    ch1_raw: int
    ch1_volt: float
    ch2_raw: int
    ch2_volt: float
    ch3_raw: int
    ch3_volt: float
    ch4_raw: int
    ch4_volt: float
    target: int  # We accept this but ignore it

# ==========================================
# ENDPOINTS
# ==========================================
@app.get("/")
def home():
    return {"status": "Gesture Backend Online", "model": "SVM Pipeline"}

@app.get("/latest")
def get_latest():
    """Returns the latest sensor values for the frontend."""
    if not latest_values:
        return {"status": "no_data", "message": "Waiting for sensor data..."}
    return latest_values

@app.post("/ingest")
def ingest_values(data: SensorInput):
    """Receives 10 features from the ESP32/Hardware."""
    global latest_values, raw_buffer
    latest_values = data.dict()

    # Construct vector in EXACT order of training
    # [Raw0, Volt0, ... Raw4, Volt4]
    raw_vector = [
        data.ch0_raw, data.ch0_volt,
        data.ch1_raw, data.ch1_volt,
        data.ch2_raw, data.ch2_volt,
        data.ch3_raw, data.ch3_volt,
        data.ch4_raw, data.ch4_volt
    ]
    
    raw_buffer.append(raw_vector)
    return {"status": "ok"}

@app.get("/predict")
def predict():
    """Returns the stabilized gesture prediction."""
    
    # 1. Wait for buffer to fill
    if len(raw_buffer) < RAW_BUFFER_SIZE:
        return {
            "gesture": "Initializing...",
            "confidence": 0.0,
            "status": "buffering"
        }

    # 2. Average the Raw Input (Low Pass Filter)
    # This prevents one "bad" sensor reading from triggering a wrong gesture.
    arr = np.array(raw_buffer, dtype=np.float64)
    mean_features = np.mean(arr, axis=0).reshape(1, -1)

    # 3. Get Prediction & Confidence
    # The pipeline automatically scales the data here.
    probs = model.predict_proba(mean_features)[0]
    best_class_id = int(np.argmax(probs))
    confidence = float(probs[best_class_id])

    # 4. SAFETY GATE (The "Emergency" Fix)
    # If the model is less than 40% sure, we refuse to classify it.
    # Lowered threshold for real hardware testing
    if confidence < 0.40:
        final_gesture = "Unknown"
        status = "low_confidence"
        final_pred_id = -1
    else:
        # Add to smoothing buffer
        pred_buffer.append(best_class_id)
        
        # Majority Vote
        final_pred_id = Counter(pred_buffer).most_common(1)[0][0]
        final_gesture = GESTURE_MAP.get(final_pred_id, "Unknown")
        status = "confident"

    return {
        "gesture": final_gesture,
        "predicted_class": final_pred_id if confidence >= 0.65 else -1,
        "confidence": round(confidence, 2),
        "status": status,
        "latest_values": latest_values,
        "raw_volts_ch0": latest_values.get("ch0_volt", 0)
    }

if __name__ == "__main__":
    import uvicorn
    # Run on 0.0.0.0 so other devices on network can see it
    uvicorn.run(app, host="0.0.0.0", port=8000)