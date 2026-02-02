import React, { useEffect, useRef, useState, useCallback } from "react";
import io from "socket.io-client";
import { getFlexEndpoint, MEDIAPIPE_WS_URL, FLEX_API_URL } from "./config";

const POLL_INTERVAL = 200; // ms for Flex API polling

// MediaPipe API URL for camera config
const MEDIAPIPE_API_URL = MEDIAPIPE_WS_URL;

export default function App() {
  // Camera config state
  const [cameraUrl, setCameraUrl] = useState("");
  const [cameraStatus, setCameraStatus] = useState({ connected: false, url: "" });
  const [cameraLoading, setCameraLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const [cameraRotation, setCameraRotation] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(true);
  const [flipVertical, setFlipVertical] = useState(false);

  // Flex state
  const [flexConnected, setFlexConnected] = useState(false);
  const [flexPrediction, setFlexPrediction] = useState(null);
  const [flexValues, setFlexValues] = useState(null);
  const [flexError, setFlexError] = useState(null);
  const flexIntervalRef = useRef(null);

  // MediaPipe state
  const [mediapipeConnected, setMediapipeConnected] = useState(false);
  const [mediapipePrediction, setMediapipePrediction] = useState(null);
  const [mediapipeError, setMediapipeError] = useState(null);
  const canvasRef = useRef(null);
  const socketRef = useRef(null);

  // Combined result
  const [matchResult, setMatchResult] = useState({ status: "waiting", message: "Waiting for predictions..." });

  // ==================== FLEX BACKEND ====================
  const fetchFlexPrediction = useCallback(async () => {
    try {
      const res = await fetch(getFlexEndpoint('/predict'));
      const data = await res.json();
      setFlexPrediction({
        gesture: data.gesture?.toLowerCase(),
        confidence: data.confidence || null,
        classId: data.predicted_class
      });
      setFlexValues(data.latest_values || null);
      setFlexConnected(true);
      setFlexError(null);
    } catch (err) {
      setFlexError("Cannot reach Flex backend");
      setFlexConnected(false);
    }
  }, []);

  const startFlexPolling = useCallback(() => {
    if (flexIntervalRef.current) return;
    flexIntervalRef.current = setInterval(fetchFlexPrediction, POLL_INTERVAL);
  }, [fetchFlexPrediction]);

  const stopFlexPolling = useCallback(() => {
    if (flexIntervalRef.current) {
      clearInterval(flexIntervalRef.current);
      flexIntervalRef.current = null;
    }
  }, []);

  // ==================== MEDIAPIPE BACKEND ====================
  const connectMediapipe = useCallback(() => {
    if (socketRef.current) return;

    const sio = io(MEDIAPIPE_WS_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = sio;

    sio.on("connect", () => {
      console.log("Connected to MediaPipe backend");
      setMediapipeConnected(true);
      setMediapipeError(null);
    });

    sio.on("disconnect", () => {
      console.log("Disconnected from MediaPipe backend");
      setMediapipeConnected(false);
    });

    sio.on("connect_error", (err) => {
      console.error("MediaPipe connection error:", err);
      setMediapipeError("Cannot connect to MediaPipe backend");
      setMediapipeConnected(false);
    });

    sio.on("new_frame", (data) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.src = data.image;

      img.onload = () => {
        const MAX_WIDTH = 480;
        const scale = MAX_WIDTH / img.width;

        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const preds = data.predictions || [];
        if (preds.length > 0) {
          const firstPred = preds[0];
          setMediapipePrediction({
            gesture: firstPred.label?.toLowerCase(),
            confidence: firstPred.confidence
          });

          // Draw bounding box
          const [x1, y1, x2, y2] = firstPred.bbox;
          ctx.strokeStyle = "#00ff88";
          ctx.lineWidth = 2;
          ctx.strokeRect(x1 * scale, y1 * scale, (x2 - x1) * scale, (y2 - y1) * scale);

          ctx.fillStyle = "#00ff88";
          ctx.font = "bold 16px Arial";
          ctx.fillText(`${firstPred.label} (${firstPred.confidence})`, x1 * scale, y1 * scale - 8);
        } else {
          setMediapipePrediction(null);
        }
      };
    });
  }, []);

  const disconnectMediapipe = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setMediapipeConnected(false);
    }
  }, []);

  // ==================== CAMERA CONFIG ====================
  const fetchCameraStatus = useCallback(async () => {
    try {
      const res = await fetch(`${MEDIAPIPE_API_URL}/camera_status`);
      const data = await res.json();
      setCameraStatus({
        connected: data.connected || false,
        url: data.current_url || ""
      });
      if (data.current_url) {
        setCameraUrl(data.current_url);
      }
      if (data.rotation !== undefined) {
        setCameraRotation(data.rotation);
      }
      if (data.flip_horizontal !== undefined) {
        setFlipHorizontal(data.flip_horizontal);
      }
      if (data.flip_vertical !== undefined) {
        setFlipVertical(data.flip_vertical);
      }
    } catch (err) {
      console.error("Failed to fetch camera status:", err);
    }
  }, []);

  const setCameraUrlHandler = async () => {
    if (!cameraUrl.trim()) {
      alert("Please enter a camera URL");
      return;
    }
    setCameraLoading(true);
    try {
      const res = await fetch(`${MEDIAPIPE_API_URL}/set_camera`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cameraUrl.trim() })
      });
      const data = await res.json();
      if (data.status === "success") {
        setCameraStatus({ connected: true, url: cameraUrl.trim() });
        setShowConfig(false);
        alert("✅ Camera connected successfully!");
      } else {
        alert(`❌ Failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    }
    setCameraLoading(false);
  };

  const setRotationHandler = async (rotation) => {
    try {
      const res = await fetch(`${MEDIAPIPE_API_URL}/set_rotation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rotation })
      });
      const data = await res.json();
      if (data.status === "success") {
        setCameraRotation(data.rotation);
      }
    } catch (err) {
      console.error("Failed to set rotation:", err);
    }
  };

  const setFlipHandler = async (flipH, flipV) => {
    try {
      const res = await fetch(`${MEDIAPIPE_API_URL}/set_rotation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flip_horizontal: flipH, flip_vertical: flipV })
      });
      const data = await res.json();
      if (data.status === "success") {
        setFlipHorizontal(data.flip_horizontal);
        setFlipVertical(data.flip_vertical);
      }
    } catch (err) {
      console.error("Failed to set flip:", err);
    }
  };

  const stopCamera = async () => {
    try {
      await fetch(`${MEDIAPIPE_API_URL}/stop_camera`, { method: "POST" });
      setCameraStatus({ connected: false, url: "" });
    } catch (err) {
      console.error("Failed to stop camera:", err);
    }
  };

  // Fetch camera status on mount
  useEffect(() => {
    fetchCameraStatus();
  }, [fetchCameraStatus]);

  // ==================== COMBINED RESULT ====================
  useEffect(() => {
    if (!flexPrediction?.gesture || !mediapipePrediction?.gesture) {
      setMatchResult({ status: "waiting", message: "Waiting for predictions..." });
      return;
    }

    const flexGesture = flexPrediction.gesture;
    const mediapipeGesture = mediapipePrediction.gesture;

    if (flexGesture === mediapipeGesture) {
      setMatchResult({
        status: "match",
        message: `✅ MATCH: ${flexGesture.toUpperCase()}`
      });
    } else {
      setMatchResult({
        status: "mismatch",
        message: `❌ MISMATCH — Flex: ${flexGesture}, MediaPipe: ${mediapipeGesture}`
      });
    }
  }, [flexPrediction, mediapipePrediction]);

  // ==================== START/STOP ALL ====================
  const [isRunning, setIsRunning] = useState(false);

  const startAll = () => {
    startFlexPolling();
    connectMediapipe();
    setIsRunning(true);
  };

  const stopAll = () => {
    stopFlexPolling();
    disconnectMediapipe();
    setIsRunning(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopFlexPolling();
      disconnectMediapipe();
    };
  }, [stopFlexPolling, disconnectMediapipe]);

  // ==================== RENDER ====================
  return (
    <div className="app-container">
      <header className="header">
        <h1>🤖 Unified Gesture Recognition</h1>
        <p>Flex Sensor + MediaPipe Combined Detection</p>
      </header>

      {/* Camera Configuration Panel */}
      <div className="camera-config" style={{
        background: "#1a1a2e",
        padding: "15px 20px",
        borderRadius: "10px",
        marginBottom: "20px",
        border: cameraStatus.connected ? "2px solid #00ff88" : "2px solid #ff6b6b"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ 
              width: "12px", 
              height: "12px", 
              borderRadius: "50%", 
              background: cameraStatus.connected ? "#00ff88" : "#ff6b6b",
              display: "inline-block"
            }}></span>
            <strong style={{ color: "#fff" }}>📷 Camera:</strong>
            <span style={{ color: cameraStatus.connected ? "#00ff88" : "#ff6b6b" }}>
              {cameraStatus.connected ? `Connected - ${cameraStatus.url}` : "Not Connected"}
            </span>
          </div>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            style={{
              background: "#4a4a6a",
              color: "#fff",
              border: "none",
              padding: "8px 15px",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            {showConfig ? "Hide Config ▲" : "Show Config ▼"}
          </button>
        </div>

        {showConfig && (
          <div style={{ marginTop: "15px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              value={cameraUrl}
              onChange={(e) => setCameraUrl(e.target.value)}
              placeholder="http://192.168.1.100:8000/video_feed"
              style={{
                flex: "1",
                minWidth: "250px",
                padding: "10px 15px",
                borderRadius: "5px",
                border: "1px solid #4a4a6a",
                background: "#0f0f1a",
                color: "#fff",
                fontSize: "14px"
              }}
            />
            <button
              onClick={setCameraUrlHandler}
              disabled={cameraLoading}
              style={{
                background: cameraLoading ? "#666" : "#00ff88",
                color: "#000",
                border: "none",
                padding: "10px 20px",
                borderRadius: "5px",
                cursor: cameraLoading ? "not-allowed" : "pointer",
                fontWeight: "bold"
              }}
            >
              {cameraLoading ? "Connecting..." : "Set Camera"}
            </button>
            {cameraStatus.connected && (
              <button
                onClick={stopCamera}
                style={{
                  background: "#ff6b6b",
                  color: "#fff",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                Stop Camera
              </button>
            )}
          </div>
        )}

        {/* Rotation Controls */}
        {showConfig && (
          <div style={{ marginTop: "15px", padding: "15px", background: "#0f0f1a", borderRadius: "8px" }}>
            <div style={{ marginBottom: "10px", fontWeight: "bold", color: "#00d9ff" }}>📐 Camera Orientation</div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ color: "#aaa" }}>Rotation:</span>
              {[0, 90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  onClick={() => setRotationHandler(deg)}
                  style={{
                    background: cameraRotation === deg ? "#00d9ff" : "#4a4a6a",
                    color: cameraRotation === deg ? "#000" : "#fff",
                    border: "none",
                    padding: "8px 15px",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontWeight: cameraRotation === deg ? "bold" : "normal"
                  }}
                >
                  {deg}°
                </button>
              ))}
              <span style={{ color: "#aaa", marginLeft: "20px" }}>Flip:</span>
              <button
                onClick={() => setFlipHandler(!flipHorizontal, flipVertical)}
                style={{
                  background: flipHorizontal ? "#00ff88" : "#4a4a6a",
                  color: flipHorizontal ? "#000" : "#fff",
                  border: "none",
                  padding: "8px 15px",
                  borderRadius: "5px",
                  cursor: "pointer"
                }}
              >
                ↔ Horizontal
              </button>
              <button
                onClick={() => setFlipHandler(flipHorizontal, !flipVertical)}
                style={{
                  background: flipVertical ? "#00ff88" : "#4a4a6a",
                  color: flipVertical ? "#000" : "#fff",
                  border: "none",
                  padding: "8px 15px",
                  borderRadius: "5px",
                  cursor: "pointer"
                }}
              >
                ↕ Vertical
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Combined Result Banner */}
      <div className={`result-banner ${matchResult.status}`}>
        <h2>{matchResult.message}</h2>
      </div>

      {/* Control Button */}
      <div className="controls" style={{ marginBottom: "20px" }}>
        <button
          className={`btn ${isRunning ? "btn-stop" : "btn-start"}`}
          onClick={isRunning ? stopAll : startAll}
        >
          {isRunning ? "⏹ Stop Detection" : "▶ Start Detection"}
        </button>
      </div>

      {/* Two Panel Layout */}
      <div className="panels-container">
        {/* FLEX PANEL */}
        <div className="panel">
          <h3>
            <span className={`status-dot ${flexConnected ? "connected" : ""}`}></span>
            Flex Sensor Backend
          </h3>

          {flexError && <p className="error-msg">{flexError}</p>}

          <div className="prediction-box">
            <div className="gesture">
              {flexPrediction?.gesture || "—"}
            </div>
            {flexPrediction?.confidence && (
              <div className="confidence">
                Confidence: {(flexPrediction.confidence * 100).toFixed(1)}%
              </div>
            )}
          </div>

          {flexValues && (
            <div className="flex-data">
              <table>
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Raw</th>
                    <th>Voltage</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <tr key={i}>
                      <td>CH{i}</td>
                      <td>{flexValues[`ch${i}_raw`]}</td>
                      <td>{flexValues[`ch${i}_volt`]?.toFixed(3)}V</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MEDIAPIPE PANEL */}
        <div className="panel">
          <h3>
            <span className={`status-dot ${mediapipeConnected ? "connected" : ""}`}></span>
            MediaPipe Vision Backend
          </h3>

          {mediapipeError && <p className="error-msg">{mediapipeError}</p>}

          <div className="prediction-box">
            <div className="gesture">
              {mediapipePrediction?.gesture || "—"}
            </div>
            {mediapipePrediction?.confidence && (
              <div className="confidence">
                Confidence: {(mediapipePrediction.confidence * 100).toFixed(1)}%
              </div>
            )}
          </div>

          <div className="video-container">
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
