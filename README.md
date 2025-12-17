# 🖐️ GestureFlow - Hand Gesture Computer Control

Control your computer using hand gestures! This project uses your webcam to detect hand movements and gestures, translating them into mouse movements, clicks, and keyboard shortcuts.

![Hand Gesture Control](https://img.shields.io/badge/Control-Hand%20Gestures-blue)
![Python](https://img.shields.io/badge/Python-3.9+-green)
![React](https://img.shields.io/badge/React-TypeScript-blue)
![MediaPipe](https://img.shields.io/badge/ML-MediaPipe-orange)

---

## 📖 Overview

GestureFlow is a **touchless computer control system** that enables users to interact with their computer using natural hand gestures captured through a webcam. It uses **Google's MediaPipe** for real-time hand detection and a custom gesture classification system.

### Why This Project?

| Problem | Solution |
|---------|----------|
| **Accessibility** | People with motor disabilities can use computers |
| **Hygiene** | Touchless interaction for shared environments |
| **Presentations** | Control slides without touching anything |
| **Innovation** | Explore future of human-computer interaction |

---

## ✨ Features

| Gesture | Action | Description |
|---------|--------|-------------|
| ✋ Open Palm | Move Cursor | Hand position controls cursor movement |
| ✊ Fist | Left Click | Close your fist to click |
| 🤏 Pinch | Left Click | Touch thumb and index finger |
| ✌️ Peace Sign | Scroll | Move hand up/down to scroll |
| 👍 Thumbs Up | Stop Control | Safety gesture to disable control |
| 🖖 Three Fingers | Virtual Keyboard | Show on-screen keyboard |

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              USER                                         │
│                         [Hand Gestures]                                   │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           WEBCAM (Input)                                  │
│                    Captures 30 FPS video stream                          │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Browser)                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    MediaPipe Hands (WASM/WebGL)                   │   │
│  │    - Detects 21 hand landmarks per hand                          │   │
│  │    - Runs at 30 FPS in browser                                   │   │
│  │    - Uses WebGL for GPU acceleration                             │   │
│  └──────────────────────────────────┬───────────────────────────────┘   │
│                                     │                                    │
│                                     ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    GestureDecoder (TypeScript)                    │   │
│  │    - Analyzes finger positions and orientations                  │   │
│  │    - Classifies gestures (fist, palm, pinch, victory)            │   │
│  │    - Temporal smoothing to prevent flickering                    │   │
│  └──────────────────────────────────┬───────────────────────────────┘   │
│                                     │                                    │
│                              WebSocket                                   │
└─────────────────────────────────────┼────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Python)                                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    FastAPI WebSocket Server                       │   │
│  │    - Receives gesture events in real-time                        │   │
│  │    - Manages connection state                                    │   │
│  └──────────────────────────────────┬───────────────────────────────┘   │
│                                     │                                    │
│                                     ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    ShortcutsManager                               │   │
│  │    - Maps gestures to actions via gesture_map.json               │   │
│  └──────────────────────────────────┬───────────────────────────────┘   │
│                                     │                                    │
│                                     ▼                                    │
│  ┌────────────────────────┐  ┌────────────────────────┐                 │
│  │    MouseController     │  │   KeyboardController   │                 │
│  │    - PyAutoGUI         │  │   - Pynput             │                 │
│  │    - Move cursor       │  │   - Key presses        │                 │
│  │    - Click/scroll      │  │   - Shortcuts          │                 │
│  └────────────────────────┘  └────────────────────────┘                 │
└──────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         OPERATING SYSTEM                                  │
│                    Mouse/Keyboard events executed                        │
└──────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Sequence

```
User          Webcam       MediaPipe      GestureDecoder    WebSocket      Backend        OS
  │              │              │               │               │             │            │
  │──[gesture]──▶│              │               │               │             │            │
  │              │──[frame]────▶│               │               │             │            │
  │              │              │──[landmarks]─▶│               │               │            │
  │              │              │               │──[classify]──▶│             │            │
  │              │              │               │               │──[gesture]─▶│            │
  │              │              │               │               │             │──[action]─▶│
  │              │              │               │               │             │            │
  │◀─────────────────────────[cursor moves / click happens]────────────────────────────────│
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Hand Detection** | MediaPipe Hands | ML-based 21-point hand tracking |
| **Frontend** | React + TypeScript + Vite | UI and gesture processing |
| **Communication** | WebSocket | Real-time bidirectional messaging |
| **Backend** | Python + FastAPI | API server and action routing |
| **System Control** | PyAutoGUI + Pynput | Mouse/keyboard automation |

---

## 🔧 How It Works

### 1. Hand Detection (MediaPipe)

MediaPipe detects **21 landmarks** on each hand:

```
                    ┌─ 4 (THUMB_TIP)
                ┌─ 3
            ┌─ 2
        ┌─ 1
    0 ──┴── WRIST
        │
        ├── 5 ── 6 ── 7 ── 8 (INDEX_TIP)
        ├── 9 ── 10 ── 11 ── 12 (MIDDLE_TIP)
        ├── 13 ── 14 ── 15 ── 16 (RING_TIP)
        └── 17 ── 18 ── 19 ── 20 (PINKY_TIP)
```

### 2. Gesture Classification

The algorithm checks finger extension patterns:

| Gesture | Pattern |
|---------|---------|
| Fist | All fingers curled |
| Pinch | Thumb + Index tips close together |
| Victory | Index + Middle extended only |
| Open Palm | 3+ fingers extended |

### 3. Cursor Movement

Uses **relative movement** (like a mouse):
```
cursor_delta = (hand_position - previous_position) × speed
```

---

## 📋 Prerequisites

- **macOS** / Linux / Windows
- **Python 3.9+**
- **Node.js 18+** and npm
- **Webcam**
- **Chrome/Edge browser** (recommended)

---

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd gesture-recognition
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # macOS/Linux
# .\venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. macOS Permissions

Go to **System Settings** → **Privacy & Security**:
- Enable **Camera** for your browser
- Enable **Accessibility** for Terminal

---

## ▶️ Running the Application

### Terminal 1: Start Backend

```bash
cd backend
source venv/bin/activate
python main.py
```
Backend runs on `http://localhost:8000`

### Terminal 2: Start Frontend

```bash
cd frontend
npm run dev
```
Frontend runs on `http://localhost:5173`

### Use the Application

1. Open frontend URL in browser
2. Click **"Start"** to enable camera
3. Allow camera access
4. Use gestures to control!

---

## 📁 Project Structure

```
gesture-recognition/
├── frontend/                     # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── WebcamCapture.tsx # Camera & gesture handling
│   │   ├── lib/
│   │   │   └── GestureDecoder.ts # Gesture classification
│   │   └── App.tsx
│   └── package.json
│
├── backend/                      # Python backend
│   ├── main.py                   # FastAPI server
│   ├── actions/
│   │   ├── mouse_controller.py   # Mouse control
│   │   ├── keyboard_controller.py# Keyboard control
│   │   └── shortcuts.py          # Action execution
│   ├── config/
│   │   └── gesture_map.json      # Gesture → Action mapping
│   └── requirements.txt
│
├── README.md                     # This file
└── INTERVIEW_GUIDE.md           # Technical deep dive
```

---

## ⚙️ Configuration

Edit `backend/config/gesture_map.json`:

```json
{
  "mouse_control": {
    "relative_speed": 25.0,    // Cursor speed
    "smoothing": 0.1,          // Movement smoothing
    "deadzone": 0.002          // Ignore tiny movements
  }
}
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Camera not working | Check browser permissions, close other camera apps |
| Cursor not moving | Enable macOS Accessibility permissions |
| Gestures not detected | Ensure good lighting, hand clearly visible |
| Backend won't start | Activate venv: `source venv/bin/activate` |

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| Detection FPS | 30 |
| Latency | ~50ms |
| CPU Usage | ~25% |

---

## 🔮 Future Improvements

- [ ] Custom gesture training
- [ ] Multi-hand support
- [ ] Voice command integration
- [ ] Mobile companion app
- [ ] VR/AR integration

---

## 📄 License

MIT License - Feel free to use and modify!

---

## 📚 Additional Documentation

See **[INTERVIEW_GUIDE.md](./INTERVIEW_GUIDE.md)** for:
- Detailed technical explanations
- Interview questions & answers
- Challenges faced and solutions
- Code walkthroughs

---

*Built with ❤️ using MediaPipe, React, and FastAPI*
