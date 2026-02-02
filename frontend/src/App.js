import React, { useEffect, useRef, useState, useCallback } from "react";
import io from "socket.io-client";
import { getFlexEndpoint, MEDIAPIPE_WS_URL } from "./config";

const POLL_INTERVAL = 200; // ms for Flex API polling

export default function App() {
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
