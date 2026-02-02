# Gesture Recognition System - Docker Setup

A unified gesture recognition system combining **Flex Sensor** and **MediaPipe Vision** backends with a single React frontend.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    UNIFIED FRONTEND                         │
│                   (React + SocketIO)                        │
│                    Port: 3000                               │
└─────────────────┬───────────────────────┬───────────────────┘
                  │                       │
                  ▼                       ▼
┌─────────────────────────┐   ┌─────────────────────────────┐
│    FLEX BACKEND         │   │    MEDIAPIPE BACKEND        │
│    (FastAPI)            │   │    (Flask + SocketIO)       │
│    Port: 8000           │   │    Port: 5001               │
└─────────────────────────┘   └─────────────────────────────┘
```

## Quick Start with Docker

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Unified React dashboard |
| Flex Backend | 8000 | FastAPI - Flex sensor gesture recognition |
| MediaPipe Backend | 5001 | Flask - Camera-based hand gesture recognition |

## Configuration

Update `docker-compose.yml` to set:
- `STREAM_URL` - Your camera stream URL for MediaPipe
