// Type definitions for the gesture recognition system

// Landmark types from MediaPipe Hands
export interface Landmark {
    x: number;
    y: number;
    z: number;
}

export interface HandLandmarks {
    landmarks: Landmark[];
    handedness: 'Left' | 'Right';
    score: number;
}

// Gesture types
export type GestureType =
    | 'fist'
    | 'open_palm'
    | 'point_up'
    | 'point_down'
    | 'point_left'
    | 'point_right'
    | 'pinch'
    | 'two_finger_pinch'   // Right click (thumb + index + middle)
    | 'pinch_hold'         // Drag and drop (pinch maintained 500ms+)
    | 'both_palms'         // Safety stop (two hands open)
    | 'swipe_up'           // Scroll up
    | 'swipe_down'         // Scroll down
    | 'three_fingers'      // Show virtual keyboard
    | 'victory'
    | 'thumbs_up'
    | 'thumbs_down'
    | 'custom';

export interface GestureResult {
    gesture: GestureType;
    confidence: number;
    landmarks: Landmark[];
    handedness: 'Left' | 'Right';
    timestamp: number;
    isDynamic: boolean;
}

// Action types
export type ActionType =
    | 'keyboard'
    | 'mouse_move'
    | 'mouse_click'
    | 'mouse_drag'
    | 'mouse_scroll'
    | 'command'
    | 'none';

export interface KeyboardAction {
    type: 'keyboard';
    keys: string[]; // e.g., ['ctrl', 'c'] or ['space']
    modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
}

export interface MouseMoveAction {
    type: 'mouse_move';
    mode: 'absolute' | 'relative';
    speed: number; // 0.1 to 2.0
}

export interface MouseClickAction {
    type: 'mouse_click';
    button: 'left' | 'right' | 'middle';
    clickType: 'single' | 'double';
}

export interface MouseDragAction {
    type: 'mouse_drag';
    button: 'left' | 'right';
}

export interface MouseScrollAction {
    type: 'mouse_scroll';
    direction: 'up' | 'down' | 'left' | 'right';
    speed: number;
}

export interface CommandAction {
    type: 'command';
    command: string;
}

export interface NoAction {
    type: 'none';
}

export type Action =
    | KeyboardAction
    | MouseMoveAction
    | MouseClickAction
    | MouseDragAction
    | MouseScrollAction
    | CommandAction
    | NoAction;

// Gesture mapping configuration
export interface GestureMapping {
    id: string;
    gesture: GestureType;
    action: Action;
    enabled: boolean;
    cooldownMs: number;
    minConfidence: number;
    label: string;
    description?: string;
}

// Settings
export interface CalibrationSettings {
    sensitivity: number; // 0.1 to 2.0
    smoothing: number; // 0 to 1
    deadzone: number; // 0 to 0.5
}

export interface DetectionSettings {
    minDetectionConfidence: number;
    minTrackingConfidence: number;
    maxNumHands: 1 | 2;
    modelComplexity: 0 | 1;
    enableDynamicGestures: boolean;
}

export interface AccessibilitySettings {
    highContrast: boolean;
    largeButtons: boolean;
    reducedMotion: boolean;
    screenReaderAnnouncements: boolean;
}

export interface AppSettings {
    calibration: CalibrationSettings;
    detection: DetectionSettings;
    accessibility: AccessibilitySettings;
    useNativeConnector: boolean;
    nativeConnectorUrl: string;
    signatureSecret: string;
}

// Connection status
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Recording types for data collection
export interface RecordedGesture {
    id: string;
    label: string;
    landmarks: Landmark[][];
    timestamps: number[];
    duration: number;
    createdAt: number;
}

// Performance metrics
export interface PerformanceMetrics {
    fps: number;
    inferenceTimeMs: number;
    landmarkDetectionTimeMs: number;
    totalLatencyMs: number;
}

// WebSocket message types for native connector
export interface SignedMessage {
    payload: {
        action: Action;
        timestamp: number;
        nonce: string;
    };
    signature: string;
}

// Model info
export interface ModelInfo {
    name: string;
    version: string;
    gestures: GestureType[];
    inputShape: number[];
    isDynamic: boolean;
}
