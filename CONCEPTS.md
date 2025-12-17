# 📚 GestureFlow - Core Concepts & Theory

A comprehensive guide to all the theoretical concepts, technologies, and principles used in the GestureFlow project.

---

## Table of Contents

1. [Computer Vision Fundamentals](#1-computer-vision-fundamentals)
2. [Machine Learning Concepts](#2-machine-learning-concepts)
3. [Real-Time Systems](#3-real-time-systems)
4. [Web Technologies](#4-web-technologies)
5. [Human-Computer Interaction](#5-human-computer-interaction)
6. [Software Architecture Patterns](#6-software-architecture-patterns)
7. [Signal Processing](#7-signal-processing)
8. [Networking Concepts](#8-networking-concepts)
9. [Operating System Concepts](#9-operating-system-concepts)
10. [Security & Privacy](#10-security--privacy)

---

## 1. Computer Vision Fundamentals

### 1.1 What is Computer Vision?

**Definition**: Computer Vision is a field of AI that enables computers to interpret and understand visual information from the world (images and videos).

```
Real World → Camera → Digital Image → Computer Vision Algorithm → Understanding
                          ↓
                    [Pixels: RGB values]
                          ↓
                    [Features: edges, shapes]
                          ↓
                    [Objects: hands, faces]
                          ↓
                    [Actions: gestures, poses]
```

### 1.2 Image Representation

#### Pixels and Color Channels

```
┌─────────────────────────────────────────────────────────────┐
│                    DIGITAL IMAGE (640 x 480)                 │
│                                                              │
│   Each pixel has 3 color values (RGB):                      │
│   ┌────────┬────────┬────────┐                              │
│   │ Red    │ Green  │ Blue   │  → Combined = Pixel Color    │
│   │ 0-255  │ 0-255  │ 0-255  │                              │
│   └────────┴────────┴────────┘                              │
│                                                              │
│   Example:                                                   │
│   (255, 0, 0)   = Pure Red                                  │
│   (0, 255, 0)   = Pure Green                                │
│   (255, 255, 0) = Yellow                                    │
│   (0, 0, 0)     = Black                                     │
│   (255, 255, 255) = White                                   │
│                                                              │
│   Image size: 640 × 480 × 3 = 921,600 values per frame     │
│   At 30 FPS: 27.6 million values per second!               │
└─────────────────────────────────────────────────────────────┘
```

#### Coordinate Systems

```
Image Coordinate System (Used in MediaPipe):

(0,0)─────────────────────▶ X (0.0 to 1.0)
│
│    ┌─────────────────────┐
│    │                     │
│    │      • (0.5, 0.3)   │  ← Hand detected here
│    │                     │
│    │                     │
│    └─────────────────────┘
│
▼
Y (0.0 to 1.0)

Normalized coordinates: 0.0 = left/top, 1.0 = right/bottom
This makes detection resolution-independent!
```

### 1.3 Feature Detection

#### What are Features?

Features are distinctive, informative patterns in an image that algorithms can detect and use for recognition.

```
Types of Features:
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  LOW-LEVEL FEATURES:                                         │
│  ├── Edges (boundaries between regions)                      │
│  ├── Corners (intersection of edges)                         │
│  └── Blobs (regions of similar color)                        │
│                                                              │
│  MID-LEVEL FEATURES:                                         │
│  ├── Shapes (circles, rectangles)                            │
│  ├── Textures (patterns)                                     │
│  └── Keypoints (distinctive points)                          │
│                                                              │
│  HIGH-LEVEL FEATURES:                                        │
│  ├── Objects (hands, faces)                                  │
│  ├── Parts (fingers, eyes)                                   │
│  └── Relationships (finger positions relative to palm)       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 Hand Landmark Detection

#### The Problem

Given an image, find the exact locations of 21 specific points on a hand.

#### The Solution (MediaPipe Approach)

```
Step 1: PALM DETECTION
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│   Input Image (256×256) → Palm Detector CNN → Bounding Box   │
│                                                               │
│   The palm is easier to detect than individual fingers       │
│   because it's a simpler shape.                              │
│                                                               │
│   Output: [x, y, width, height] of palm region               │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
Step 2: HAND LANDMARK DETECTION
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│   Cropped Palm Region → Landmark CNN → 21 (x, y, z) points  │
│                                                               │
│   The cropped region is resized and processed by a           │
│   specialized neural network trained on hand images.         │
│                                                               │
│   Output: 21 landmarks with x, y (position) and z (depth)    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 1.5 Pose Estimation

**Definition**: Determining the position and orientation of body parts (or objects) in an image.

```
Hand Pose Estimation:

Physical Hand              →   Mathematical Representation
                                                          
    ✋                           Landmarks[8] = (0.45, 0.2, -0.1)
   /│\                                        ↑     ↑      ↑
  / │ \                                      x     y      z
    │                                    (left-right) (up-down) (depth)
    │                           
   ─┴─                          From these points, we can calculate:
                                - Which fingers are extended
                                - Hand orientation
                                - Gesture classification
```

---

## 2. Machine Learning Concepts

### 2.1 What is Machine Learning?

**Definition**: Machine Learning is a subset of AI where computers learn patterns from data rather than being explicitly programmed.

```
Traditional Programming:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Rules    │ + → │   Computer  │ → → │   Output    │
│   (code)    │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
        ↑
   Human writes rules

Machine Learning:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Data     │ + → │   Learning  │ → → │   Rules     │
│  (examples) │     │  Algorithm  │     │  (model)    │
└─────────────┘     └─────────────┘     └─────────────┘
                           ↑
                   Computer learns rules
```

### 2.2 Neural Networks

#### What is a Neural Network?

A neural network is a computational model inspired by biological neurons. It consists of layers of interconnected nodes that process information.

```
┌─────────────────────────────────────────────────────────────┐
│                    NEURAL NETWORK                            │
│                                                              │
│   INPUT LAYER        HIDDEN LAYERS        OUTPUT LAYER      │
│                                                              │
│      ○                 ○     ○                ○              │
│       \               /│\   /│\              /               │
│      ○ ─────────── ○  ○  ○ ○  ○ ────────── ○                │
│       \             \ │ / \ │ /            /                 │
│      ○ ─────────── ○  ○  ○  ○ ────────── ○                  │
│       /             / │ \ / │ \            \                 │
│      ○ ─────────── ○  ○  ○ ○  ○ ────────── ○                │
│       /               \│/   \│/              \               │
│      ○                 ○     ○                ○              │
│                                                              │
│   [Image     →    [Feature      →    [Classification]       │
│    pixels]         extraction]       (hand/not hand)        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Key Concepts

| Term | Definition | In GestureFlow |
|------|------------|----------------|
| **Input Layer** | Receives raw data | Image pixels |
| **Hidden Layers** | Process and extract features | Detect edges, shapes |
| **Output Layer** | Produces final result | 21 landmark coordinates |
| **Weights** | Learned parameters | How strongly nodes connect |
| **Activation** | Non-linear function | Allows complex patterns |

### 2.3 Convolutional Neural Networks (CNN)

#### What is a CNN?

A CNN is a specialized neural network for processing grid-like data (images). It uses convolution operations to detect features.

```
┌─────────────────────────────────────────────────────────────┐
│                    CONVOLUTIONAL LAYER                       │
│                                                              │
│   Input Image           Filter (Kernel)        Feature Map  │
│   ┌─────────────┐       ┌───────┐             ┌─────────┐  │
│   │ 1 0 1 0 1   │       │ 1 0 1 │             │ 4 3 4   │  │
│   │ 0 1 0 1 0   │   *   │ 0 1 0 │      =      │ 2 4 3   │  │
│   │ 1 0 1 0 1   │       │ 1 0 1 │             │ 2 3 4   │  │
│   │ 0 1 0 1 0   │       └───────┘             └─────────┘  │
│   │ 1 0 1 0 1   │                                          │
│   └─────────────┘   Slides across image,                   │
│                     computing dot product                   │
│                                                              │
│   Different filters detect different features:              │
│   - Vertical edges                                          │
│   - Horizontal edges                                        │
│   - Corners, curves, textures                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### CNN Architecture Layers

```
Image → [Conv → ReLU → Pool] → [Conv → ReLU → Pool] → [Fully Connected] → Output
         ↓                      ↓                      ↓
    Detect edges          Detect shapes           Classify gesture
    (low-level)           (mid-level)             (high-level)
```

### 2.4 Transfer Learning

**Definition**: Using a model trained on one task as the starting point for a new task.

```
Traditional Training:
   Random Weights → Train from scratch on hand images → Hand detector
   (requires millions of images, weeks of training)

Transfer Learning (MediaPipe approach):
   Pre-trained model → Fine-tune on hand images → Hand detector
   (trained on general images)
   
   Benefits:
   - Faster training
   - Less data needed
   - Better accuracy
```

### 2.5 Inference

**Definition**: Using a trained model to make predictions on new data.

```
┌─────────────────────────────────────────────────────────────┐
│                      INFERENCE                               │
│                                                              │
│   Training Phase (Done by Google):                          │
│   ┌────────────┐    ┌────────────┐    ┌────────────┐       │
│   │ Hand       │ →  │ Neural     │ →  │ Trained    │       │
│   │ Images     │    │ Network    │    │ Model      │       │
│   └────────────┘    └────────────┘    └────────────┘       │
│                                                              │
│   Inference Phase (Done by us in browser):                  │
│   ┌────────────┐    ┌────────────┐    ┌────────────┐       │
│   │ Webcam     │ →  │ Trained    │ →  │ 21         │       │
│   │ Frame      │    │ Model      │    │ Landmarks  │       │
│   └────────────┘    └────────────┘    └────────────┘       │
│                                                              │
│   Inference is much faster than training!                   │
│   MediaPipe: ~10ms per frame                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Real-Time Systems

### 3.1 What is a Real-Time System?

**Definition**: A system where the correctness of the output depends not only on the logical result but also on the time at which the results are produced.

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   NON-REAL-TIME SYSTEM:                                     │
│   "Download this file" → Takes 5 seconds? 10 seconds? OK!   │
│                                                              │
│   REAL-TIME SYSTEM:                                          │
│   "Move cursor with hand" → Must respond within 100ms!      │
│   Late response = Wrong response                            │
│                                                              │
│   Types:                                                     │
│   - Hard Real-Time: Miss deadline = system failure          │
│     (e.g., airbag deployment)                               │
│   - Soft Real-Time: Miss deadline = degraded experience     │
│     (e.g., gesture control - our case)                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Latency

**Definition**: The time delay between an input and its corresponding output.

```
┌─────────────────────────────────────────────────────────────┐
│                    LATENCY BREAKDOWN                         │
│                                                              │
│   Hand Movement                                              │
│        │                                                     │
│        ▼ (~3ms camera capture)                               │
│   Camera captures frame                                      │
│        │                                                     │
│        ▼ (~15ms MediaPipe inference)                         │
│   MediaPipe detects landmarks                                │
│        │                                                     │
│        ▼ (~1ms classification)                               │
│   GestureDecoder classifies gesture                          │
│        │                                                     │
│        ▼ (~5ms WebSocket send + network)                     │
│   Message sent to backend                                    │
│        │                                                     │
│        ▼ (~2ms processing)                                   │
│   Backend processes and calls PyAutoGUI                      │
│        │                                                     │
│        ▼ (~5ms OS processing)                                │
│   Cursor moves on screen                                     │
│                                                              │
│   TOTAL: ~30-50ms (acceptable for human perception)         │
│                                                              │
│   Human perception threshold: ~100ms                         │
│   Below this feels "instant"                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Frame Rate (FPS)

**Definition**: Number of frames processed per second.

```
Frame Rate Impact:

   30 FPS:  ████████████████████████████████████
            Frame every 33ms - Smooth tracking
            
   15 FPS:  ████    ████    ████    ████    ████
            Frame every 66ms - Acceptable, slightly jerky
            
   10 FPS:  ████        ████        ████
            Frame every 100ms - Noticeable lag

Trade-offs:
- Higher FPS = Smoother = More CPU usage
- Lower FPS = Choppier = Less CPU usage

GestureFlow uses 30 FPS (MediaPipe default)
```

### 3.4 Frame Drops

**Definition**: When processing can't keep up with the frame rate, some frames are skipped.

```
Expected:   Frame 1 → Frame 2 → Frame 3 → Frame 4 → Frame 5
            [processed] [processed] [processed] [processed] [processed]

With drops: Frame 1 → Frame 2 → Frame 3 → Frame 4 → Frame 5
            [processed] [DROPPED]  [processed] [DROPPED]  [processed]

Causes:
- CPU overload
- Memory pressure
- Background processes

Our solution:
- Use a processing flag to skip if still busy
- Prioritize latest frame over queue
```

---

## 4. Web Technologies

### 4.1 WebAssembly (WASM)

**Definition**: A binary instruction format that runs in browsers at near-native speed.

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   TRADITIONAL WEB:                                           │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│   │JavaScript│ →  │ Browser  │ →  │  Slow    │             │
│   │  (text)  │    │Interprets│    │ Execution│             │
│   └──────────┘    └──────────┘    └──────────┘             │
│                                                              │
│   WITH WEBASSEMBLY:                                          │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│   │  C/C++   │ →  │ Compile  │ →  │  WASM    │             │
│   │  Code    │    │ to WASM  │    │ (binary) │             │
│   └──────────┘    └──────────┘    └──────────┘             │
│                         │                                    │
│                         ▼                                    │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│   │  WASM    │ →  │ Browser  │ →  │  Fast    │             │
│   │ (binary) │    │ Executes │    │ Execution│             │
│   └──────────┘    └──────────┘    └──────────┘             │
│                                                              │
│   MediaPipe uses WASM for ML inference in browser           │
│   Speed: 10-20x faster than pure JavaScript                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 WebGL

**Definition**: JavaScript API for rendering 2D and 3D graphics using the GPU.

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   CPU PROCESSING (Without WebGL):                            │
│   ┌─────────┐                                                │
│   │   CPU   │ → Processes one pixel at a time               │
│   │  cores  │   (4-8 cores on typical computer)             │
│   └─────────┘   = SLOW for image processing                 │
│                                                              │
│   GPU PROCESSING (With WebGL):                               │
│   ┌─────────────────────────────────────────┐               │
│   │                  GPU                     │               │
│   │  [core][core][core][core][core][core]   │               │
│   │  [core][core][core][core][core][core]   │               │
│   │  [core][core][core][core][core][core]   │               │
│   │  ... hundreds/thousands of cores ...    │               │
│   └─────────────────────────────────────────┘               │
│   Processes many pixels in parallel = FAST!                 │
│                                                              │
│   MediaPipe uses WebGL to accelerate neural network         │
│   inference by running matrix operations on GPU             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Browser APIs Used

#### getUserMedia API (Camera Access)

```javascript
// Request camera access
const stream = await navigator.mediaDevices.getUserMedia({
    video: {
        width: 640,
        height: 480,
        facingMode: 'user'  // Front camera
    }
});

// Attach to video element
videoElement.srcObject = stream;
```

#### Canvas API (Video Processing)

```javascript
// Draw video frame to canvas
const ctx = canvas.getContext('2d');
ctx.drawImage(videoElement, 0, 0);

// Get pixel data
const imageData = ctx.getImageData(0, 0, 640, 480);
// imageData.data = [R, G, B, A, R, G, B, A, ...]
```

#### Web Locks API (Background Processing)

```javascript
// Keep page active even in background
navigator.locks.request('my-lock', async () => {
    return new Promise(() => {}); // Never resolves = lock held forever
});
```

### 4.4 React Concepts

#### Components

```jsx
// Functional Component
function WebcamCapture({ onGesture }) {
    const [isDetecting, setIsDetecting] = useState(false);
    
    return (
        <div>
            <video ref={videoRef} />
            <canvas ref={canvasRef} />
            <button onClick={startCamera}>Start</button>
        </div>
    );
}
```

#### Hooks Used

| Hook | Purpose | In GestureFlow |
|------|---------|----------------|
| `useState` | Manage local state | Camera on/off, current gesture |
| `useEffect` | Side effects | Initialize MediaPipe |
| `useRef` | Mutable references | Video/canvas DOM elements |
| `useCallback` | Memoize functions | Frame processing callback |

---

## 5. Human-Computer Interaction

### 5.1 Input Modalities

**Definition**: Different ways humans can provide input to computers.

```
┌─────────────────────────────────────────────────────────────┐
│                   INPUT MODALITIES                           │
│                                                              │
│   TRADITIONAL:                                               │
│   - Keyboard (text, shortcuts)                               │
│   - Mouse (pointing, clicking)                               │
│   - Touchscreen (direct manipulation)                        │
│                                                              │
│   EMERGING:                                                   │
│   - Voice (speech recognition)                               │
│   - Gesture (body/hand tracking) ← This project!            │
│   - Eye tracking (gaze direction)                            │
│   - Brain-computer interface                                 │
│                                                              │
│   GestureFlow Advantage:                                     │
│   - Touchless (hygiene, distance)                            │
│   - Natural (uses existing body movements)                   │
│   - Accessible (for those who can't use traditional input)  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Fitt's Law

**Definition**: A predictive model for the time required to move to a target area.

```
Formula: T = a + b × log₂(D/W + 1)

Where:
- T = Time to reach target
- D = Distance to target
- W = Width (size) of target
- a, b = Constants

              Large Target
             ┌─────────────┐
      ───────│             │   Easy to click
             └─────────────┘   (short time)

             Small Target
             ┌─┐
      ───────│ │               Hard to click
             └─┘               (long time)

Application in GestureFlow:
- Cursor movement should feel responsive
- Allow hitting targets reliably
- Dead zone prevents accidental drift
```

### 5.3 Feedback

**Definition**: Information provided to users about their actions and system state.

```
Types of Feedback:

VISUAL FEEDBACK:
┌────────────────────────────────────────┐
│  ✋ OPEN PALM - Tracking active        │  ← Current gesture shown
│  Cursor follows hand                   │
└────────────────────────────────────────┘

AUDIO FEEDBACK (Future improvement):
🔊 *click* when fist gesture detected

HAPTIC FEEDBACK (Not available via webcam):
📳 Vibration on action

In GestureFlow:
- Visual indicator of detected gesture
- Cursor movement confirms tracking
- Button state changes on hover
```

### 5.4 Gesture Design Principles

```
Good Gestures:                     Bad Gestures:
┌────────────────────────┐        ┌────────────────────────┐
│ ✓ Easy to perform      │        │ ✗ Physically difficult │
│ ✓ Distinct from others │        │ ✗ Similar to others    │
│ ✓ Memorable            │        │ ✗ Arbitrary            │
│ ✓ Low fatigue          │        │ ✗ Arm must be raised   │
│ ✓ Socially acceptable  │        │ ✗ Embarrassing         │
└────────────────────────┘        └────────────────────────┘

Our Gesture Choices:
- Fist for click: Natural "grabbing" motion
- Open palm for tracking: Relaxed, low fatigue
- Peace sign for scroll: Distinct, memorable
```

---

## 6. Software Architecture Patterns

### 6.1 Client-Server Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   Client (Browser)              Server (Python)             │
│   ┌──────────────┐              ┌──────────────┐           │
│   │              │   Request    │              │           │
│   │   React      │ ───────────▶ │   FastAPI    │           │
│   │   Frontend   │              │   Backend    │           │
│   │              │ ◀─────────── │              │           │
│   └──────────────┘   Response   └──────────────┘           │
│                                                              │
│   Separation of Concerns:                                    │
│   - Client: User interface, camera, gesture detection       │
│   - Server: System control, action execution                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Event-Driven Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   Events in GestureFlow:                                     │
│                                                              │
│   Camera Frame Event → MediaPipe Process                     │
│                              │                               │
│                              ▼                               │
│   Landmarks Detected Event → GestureDecoder                  │
│                              │                               │
│                              ▼                               │
│   Gesture Classified Event → WebSocket Send                  │
│                              │                               │
│                              ▼                               │
│   Message Received Event → Action Execution                  │
│                                                              │
│   Decoupling:                                                │
│   - Components don't call each other directly                │
│   - Events connect them loosely                              │
│   - Easy to add/remove components                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Observer Pattern

Used for WebSocket communication and React state management.

```
┌─────────────────────────────────────────────────────────────┐
│                    OBSERVER PATTERN                          │
│                                                              │
│   Subject (Observable)         Observers                    │
│   ┌──────────────┐            ┌──────────────┐             │
│   │  WebSocket   │ ──notify─▶ │  UI Update   │             │
│   │  Connection  │            └──────────────┘             │
│   └──────────────┘                                          │
│          │                    ┌──────────────┐             │
│          └────────notify────▶ │  Log Handler │             │
│                               └──────────────┘             │
│                                                              │
│   Benefits:                                                  │
│   - Subject doesn't know about specific observers           │
│   - Easy to add new observers                               │
│   - Loose coupling                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.4 State Management

```
React Component State:

┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   Component State (useState):                                │
│   ┌────────────────────────────────────────────┐           │
│   │  isDetecting: boolean      (camera on/off) │           │
│   │  currentGesture: string    (latest gesture)│           │
│   │  handDetected: boolean     (hand visible)  │           │
│   │  error: string | null      (error message) │           │
│   └────────────────────────────────────────────┘           │
│                                                              │
│   State changes trigger re-render:                          │
│   setIsDetecting(true) → UI updates to show active state   │
│                                                              │
│   Refs (useRef) for mutable, non-reactive values:          │
│   - videoRef: HTMLVideoElement                              │
│   - canvasRef: HTMLCanvasElement                            │
│   - wsRef: WebSocket connection                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Signal Processing

### 7.1 Noise

**Definition**: Unwanted random variations in a signal.

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   Perfect Signal (Theoretical):                              │
│   ────────────────────────────────────────────              │
│                                                              │
│   Actual Signal (With Noise):                                │
│   ─╱╲─╱╲──╱╲─╱╲──╱╲─╱╲──╱╲─╱╲──╱╲─╱╲──╱╲                  │
│                                                              │
│   Sources of noise in GestureFlow:                          │
│   - Camera sensor noise                                      │
│   - Lighting variations                                      │
│   - Hand tremor (natural human movement)                    │
│   - MediaPipe detection variance                            │
│                                                              │
│   Result: Cursor jitters even when hand is "still"          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Filtering (Smoothing)

**Definition**: Removing noise from a signal while preserving the underlying pattern.

```
Types of Filters:

1. DEAD ZONE FILTER:
   Ignore values below threshold
   
   Input:  0.0001, 0.0002, 0.05, 0.0001, 0.08
   Output: 0,      0,      0.05, 0,      0.08
                           ↑            ↑
                    (above threshold, passed through)

2. MOVING AVERAGE:
   Average over last N values
   
   Window size = 3:
   Values: [10, 12, 8, 14, 10]
   Output: [-, -, 10, 11.3, 10.7]
   
   Formula: output = (v[n] + v[n-1] + v[n-2]) / 3

3. EXPONENTIAL MOVING AVERAGE (EMA):
   Weighted average giving more weight to recent values
   
   Formula: output = α × new_value + (1-α) × previous_output
   
   α = 0.3:  More smoothing, more lag
   α = 0.8:  Less smoothing, more responsive
   
   Used in GestureFlow for velocity-aware smoothing!
```

### 7.3 Temporal Smoothing

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   Raw Gesture Detection (Noisy):                            │
│   Frame: 1    2    3    4    5    6    7    8               │
│          palm palm fist palm palm fist palm palm            │
│                    ↑              ↑                          │
│               (false positive!)  (false positive!)           │
│                                                              │
│   After Temporal Smoothing (Hold Threshold = 2):            │
│   Frame: 1    2    3    4    5    6    7    8               │
│   Count: 1    2    1    1    2    1    1    2               │
│   Output:─    palm ─    ─    palm ─    ─    palm            │
│                                                              │
│   Only confirmed when same gesture for 2+ frames            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Networking Concepts

### 8.1 TCP/IP

**Definition**: The fundamental protocol suite for internet communication.

```
┌─────────────────────────────────────────────────────────────┐
│                    TCP/IP LAYERS                             │
│                                                              │
│   ┌─────────────────────────────────────────────┐           │
│   │ Application Layer (HTTP, WebSocket)         │           │
│   ├─────────────────────────────────────────────┤           │
│   │ Transport Layer (TCP, UDP)                  │           │
│   ├─────────────────────────────────────────────┤           │
│   │ Internet Layer (IP)                         │           │
│   ├─────────────────────────────────────────────┤           │
│   │ Network Access Layer (Ethernet, WiFi)       │           │
│   └─────────────────────────────────────────────┘           │
│                                                              │
│   WebSocket uses:                                            │
│   - HTTP for initial handshake (Application)                │
│   - TCP for reliable data transfer (Transport)              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 WebSocket Protocol

```
┌─────────────────────────────────────────────────────────────┐
│                 WEBSOCKET HANDSHAKE                          │
│                                                              │
│   Client → Server (HTTP Upgrade Request):                    │
│   ┌─────────────────────────────────────────────┐           │
│   │ GET /ws HTTP/1.1                            │           │
│   │ Host: localhost:8000                        │           │
│   │ Upgrade: websocket                          │           │
│   │ Connection: Upgrade                         │           │
│   │ Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25...   │           │
│   │ Sec-WebSocket-Version: 13                   │           │
│   └─────────────────────────────────────────────┘           │
│                                                              │
│   Server → Client (HTTP Upgrade Response):                   │
│   ┌─────────────────────────────────────────────┐           │
│   │ HTTP/1.1 101 Switching Protocols            │           │
│   │ Upgrade: websocket                          │           │
│   │ Connection: Upgrade                         │           │
│   │ Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYG...   │           │
│   └─────────────────────────────────────────────┘           │
│                                                              │
│   After handshake: Full-duplex communication begins!        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 JSON Data Format

**Definition**: JavaScript Object Notation - a lightweight data interchange format.

```javascript
// GestureFlow message format:

{
    "type": "gesture",           // Message type
    "gesture": "open_palm",      // Detected gesture
    "confidence": 0.95,          // Detection confidence
    "hand_x": 0.45,              // Hand X position (0-1)
    "hand_y": 0.32,              // Hand Y position (0-1)
    "fingertip_x": 0.48,         // Index fingertip X
    "fingertip_y": 0.28,         // Index fingertip Y
    "fingertip_delta_y": 0.01    // Vertical movement (for scroll)
}

// Benefits of JSON:
// - Human readable
// - Language agnostic
// - Native to JavaScript
// - Easy to parse in Python
```

---

## 9. Operating System Concepts

### 9.1 Process and Thread

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   PROCESS: An instance of a running program                 │
│   ┌─────────────────────────────────────────────┐           │
│   │  Python Backend Process (main.py)           │           │
│   │  - Has its own memory space                 │           │
│   │  - Communicates via WebSocket               │           │
│   └─────────────────────────────────────────────┘           │
│                                                              │
│   THREAD: A unit of execution within a process              │
│   ┌─────────────────────────────────────────────┐           │
│   │  Browser Process                            │           │
│   │  ├── Main Thread (UI, JavaScript)           │           │
│   │  ├── Compositor Thread (rendering)          │           │
│   │  └── Worker Thread (MediaPipe WASM)         │           │
│   └─────────────────────────────────────────────┘           │
│                                                              │
│   In GestureFlow:                                            │
│   - Frontend: Single-threaded (async/await)                 │
│   - Backend: Async (FastAPI uvicorn)                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Input Event Injection

**Definition**: Programmatically generating mouse/keyboard events as if they came from real hardware.

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   Normal Input:                                              │
│   Physical Mouse → USB → OS Driver → Application            │
│                                                              │
│   Injected Input (PyAutoGUI):                               │
│   Python Code → OS API → Simulated Event → Application      │
│                                                              │
│   macOS: Accessibility API                                   │
│   Windows: Windows API (SendInput)                           │
│   Linux: X11/XTest Extension                                 │
│                                                              │
│   Security Implication:                                      │
│   - Requires special permissions (macOS Accessibility)       │
│   - Malware could use this for keylogging                   │
│   - That's why OS prompts for permission                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 9.3 Permissions

```
macOS Permissions for GestureFlow:

┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   CAMERA PERMISSION:                                         │
│   ┌─────────────────────────────────────────────┐           │
│   │ System Preferences > Security & Privacy     │           │
│   │ > Privacy > Camera                          │           │
│   │ [✓] Google Chrome                           │           │
│   └─────────────────────────────────────────────┘           │
│   Required for: getUserMedia() API                          │
│                                                              │
│   ACCESSIBILITY PERMISSION:                                  │
│   ┌─────────────────────────────────────────────┐           │
│   │ System Preferences > Security & Privacy     │           │
│   │ > Privacy > Accessibility                   │           │
│   │ [✓] Terminal                                │           │
│   └─────────────────────────────────────────────┘           │
│   Required for: PyAutoGUI mouse/keyboard control            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Security & Privacy

### 10.1 Privacy Considerations

```
┌─────────────────────────────────────────────────────────────┐
│                   PRIVACY ANALYSIS                           │
│                                                              │
│   DATA COLLECTED:                                            │
│   - Video from webcam                                        │
│   - Hand landmark coordinates                                │
│   - Gesture classifications                                  │
│                                                              │
│   WHERE DATA GOES:                                           │
│   - Video: Stays in browser (never sent anywhere)           │
│   - Landmarks: Sent locally (localhost only)                 │
│   - No cloud, no external servers                           │
│                                                              │
│   PRIVACY FEATURES:                                          │
│   ✓ All processing happens on user's device                 │
│   ✓ No data leaves the local network                        │
│   ✓ No account required                                      │
│   ✓ No tracking or analytics                                │
│                                                              │
│   COMPARISON TO CLOUD SOLUTIONS:                            │
│   ┌─────────────────┬─────────────────┐                    │
│   │ Cloud Approach  │ Our Approach    │                    │
│   ├─────────────────┼─────────────────┤                    │
│   │ Video to server │ Video in browser│                    │
│   │ Server processes│ Browser ML      │                    │
│   │ Privacy risk    │ Privacy safe    │                    │
│   └─────────────────┴─────────────────┘                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Security Considerations

```
┌─────────────────────────────────────────────────────────────┐
│                   SECURITY ANALYSIS                          │
│                                                              │
│   POTENTIAL RISKS:                                           │
│                                                              │
│   1. CAMERA ACCESS:                                          │
│      - Malicious code could capture video                    │
│      - Mitigation: Browser permission popup                  │
│                                                              │
│   2. SYSTEM CONTROL:                                         │
│      - PyAutoGUI can control entire computer                │
│      - Mitigation: OS-level permissions required            │
│      - Only accepts commands from localhost                 │
│                                                              │
│   3. WEBSOCKET INJECTION:                                    │
│      - Malicious WebSocket messages                          │
│      - Mitigation: Validate all messages, localhost only    │
│                                                              │
│   SECURITY MEASURES IMPLEMENTED:                             │
│   ✓ Localhost-only WebSocket (no external connections)      │
│   ✓ No file system access                                    │
│   ✓ No persistent storage of video                          │
│   ✓ OS permissions required                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Reference: Concept Summary

| Concept | Definition | Use in GestureFlow |
|---------|------------|-------------------|
| **Computer Vision** | AI for visual understanding | Hand detection |
| **CNN** | Neural network for images | MediaPipe model |
| **WebAssembly** | Fast binary code in browser | MediaPipe runtime |
| **WebGL** | GPU programming in browser | ML acceleration |
| **WebSocket** | Real-time bidirectional comm | Gesture streaming |
| **Latency** | Time delay | <50ms target |
| **FPS** | Frames per second | 30 FPS |
| **Dead Zone** | Ignore small inputs | Prevents jitter |
| **EMA** | Weighted average filter | Position smoothing |
| **Event-Driven** | React to events | Frame processing |

---

*This concepts guide accompanies the GestureFlow Interview Guide.*
