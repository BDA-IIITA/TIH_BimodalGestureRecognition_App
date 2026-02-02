# --------------------------------------------------------
# LIGHTWEIGHT MediaPipe Dockerfile
# --------------------------------------------------------

FROM python:3.10-slim

WORKDIR /app

# Install runtime dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only necessary application files
COPY app.py .
COPY hand_landmarker.task .
COPY gesture_classifier_rf.pkl .

EXPOSE 5001

# Run the Flask-SocketIO server
CMD ["python", "app.py"]
