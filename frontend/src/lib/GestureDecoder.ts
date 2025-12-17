/**
 * GestureDecoder - Classifies hand landmarks into gesture types
 * Supports both static (pose) and dynamic (temporal) gestures
 */

import type { Landmark, GestureType, GestureResult, DetectionSettings } from '../types';

// Finger indices in MediaPipe hand landmarks
const FINGER_TIPS = {
    thumb: 4,
    index: 8,
    middle: 12,
    ring: 16,
    pinky: 20,
};

const FINGER_PIPS = {
    thumb: 2,
    index: 6,
    middle: 10,
    ring: 14,
    pinky: 18,
};

const FINGER_MCPS = {
    thumb: 1,
    index: 5,
    middle: 9,
    ring: 13,
    pinky: 17,
};

const WRIST = 0;

interface FingerState {
    isExtended: boolean;
    curl: number;
    direction: { x: number; y: number };
}

interface HandState {
    fingers: {
        thumb: FingerState;
        index: FingerState;
        middle: FingerState;
        ring: FingerState;
        pinky: FingerState;
    };
    palmDirection: { x: number; y: number; z: number };
    wristPosition: Landmark;
    isPalmFacingCamera: boolean;
}

interface TemporalBuffer {
    landmarks: Landmark[][];
    timestamps: number[];
    maxLength: number;
}

// Default settings
const defaultSettings: DetectionSettings = {
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5,
    maxNumHands: 1,
    modelComplexity: 1,
    enableDynamicGestures: false,
};

export class GestureDecoder {
    private temporalBuffer: TemporalBuffer;
    private lastGesture: GestureType | null = null;
    private gestureHoldCount: number = 0;
    private readonly holdThreshold: number = 2;  // Require 2 frames of same gesture
    private settings: DetectionSettings;

    // Pinch hold tracking
    private pinchStartTime: number | null = null;
    private readonly pinchHoldDuration: number = 500; // ms

    // Swipe tracking
    private palmPositionHistory: { x: number; y: number; t: number }[] = [];
    private readonly swipeHistoryLength: number = 15;
    private readonly swipeThreshold: number = 0.15;

    // === ADAPTIVE LEARNING SYSTEM ===
    // Learns user's gesture patterns automatically
    private gestureHistory: Map<GestureType, {
        successes: number;
        failures: number;
        avgConfidence: number;
        lastCurl: number[];  // Store typical finger curl values
    }> = new Map();

    // Adaptive thresholds per gesture
    private adaptiveThresholds: Map<GestureType, number> = new Map();
    private readonly minAdaptiveThreshold = 0.6;
    private readonly maxAdaptiveThreshold = 0.95;

    // Mistake prevention
    private lastActionTime: number = 0;
    private readonly minTimeBetweenActions = 300; // Prevent accidental double-actions

    constructor(settings?: DetectionSettings) {
        this.settings = settings || defaultSettings;
        this.temporalBuffer = {
            landmarks: [],
            timestamps: [],
            maxLength: 30,
        };

        // Load learned profile from localStorage
        this.loadLearnedProfile();
    }

    updateSettings(settings: DetectionSettings) {
        this.settings = settings;
    }

    // === LEARNS AUTOMATICALLY ===
    // Save successful gesture patterns
    recordSuccess(gesture: GestureType, confidence: number, fingerCurls?: number[]) {
        const current = this.gestureHistory.get(gesture) || {
            successes: 0, failures: 0, avgConfidence: 0.8, lastCurl: []
        };

        current.successes++;
        current.avgConfidence = (current.avgConfidence * 0.9) + (confidence * 0.1);
        if (fingerCurls) current.lastCurl = fingerCurls;

        this.gestureHistory.set(gesture, current);

        // Adapt threshold based on user's typical confidence
        const newThreshold = Math.max(
            this.minAdaptiveThreshold,
            current.avgConfidence - 0.15  // Set threshold 15% below average
        );
        this.adaptiveThresholds.set(gesture, newThreshold);

        // Save to localStorage periodically
        if (current.successes % 10 === 0) {
            this.saveLearnedProfile();
        }
    }

    recordFailure(gesture: GestureType) {
        const current = this.gestureHistory.get(gesture) || {
            successes: 0, failures: 0, avgConfidence: 0.8, lastCurl: []
        };
        current.failures++;
        this.gestureHistory.set(gesture, current);
    }

    private loadLearnedProfile() {
        try {
            const saved = localStorage.getItem('gestureflow-learned-profile');
            if (saved) {
                const data = JSON.parse(saved);
                // Cast entries to proper types
                if (data.history) {
                    this.gestureHistory = new Map(
                        Object.entries(data.history) as [GestureType, { successes: number; failures: number; avgConfidence: number; lastCurl: number[] }][]
                    );
                }
                if (data.thresholds) {
                    this.adaptiveThresholds = new Map(
                        Object.entries(data.thresholds) as [GestureType, number][]
                    );
                }
            }
        } catch (e) {
            // Start fresh if corrupted
        }
    }

    private saveLearnedProfile() {
        try {
            const data = {
                history: Object.fromEntries(this.gestureHistory),
                thresholds: Object.fromEntries(this.adaptiveThresholds)
            };
            localStorage.setItem('gestureflow-learned-profile', JSON.stringify(data));
        } catch (e) {
            // Ignore storage errors
        }
    }

    // Get adaptive threshold for a gesture
    private getThreshold(gesture: GestureType): number {
        return this.adaptiveThresholds.get(gesture) || this.settings.minDetectionConfidence;
    }

    // === MISTAKE-PROOF ===
    // Prevent accidental double-clicks and rapid fire
    private canExecuteAction(): boolean {
        const now = Date.now();
        if (now - this.lastActionTime < this.minTimeBetweenActions) {
            return false;  // Too soon after last action
        }
        this.lastActionTime = now;
        return true;
    }

    /**
     * Main decode function - accepts just landmarks array
     */
    decode(landmarks: Landmark[]): GestureResult | null {
        if (landmarks.length !== 21) {
            return null;
        }

        const timestamp = Date.now();
        const handedness = 'Right' as const;
        const confidence = 0.9;

        // Add to temporal buffer
        this.temporalBuffer.landmarks.push(landmarks);
        this.temporalBuffer.timestamps.push(timestamp);

        // Trim buffer
        while (this.temporalBuffer.landmarks.length > this.temporalBuffer.maxLength) {
            this.temporalBuffer.landmarks.shift();
            this.temporalBuffer.timestamps.shift();
        }

        // Analyze hand state
        const handState = this.analyzeHandState(landmarks, handedness);

        // Classify static gesture
        const gesture = this.classifyStaticGesture(handState, landmarks);

        // Check for dynamic gesture if enabled
        let finalGesture = gesture;
        let isDynamic = false;

        if (this.settings.enableDynamicGestures && this.temporalBuffer.landmarks.length >= 10) {
            const dynamicGesture = this.classifyDynamicGesture(landmarks);
            if (dynamicGesture) {
                finalGesture = dynamicGesture;
                isDynamic = true;
            }
        }

        // Apply hysteresis to prevent flickering
        if (finalGesture === this.lastGesture) {
            this.gestureHoldCount++;
        } else {
            this.gestureHoldCount = 0;
        }

        // Instant gestures bypass hysteresis (pinch for clicking, open_palm for neutral)
        const instantGestures: GestureType[] = ['open_palm', 'pinch', 'fist'];
        if (this.gestureHoldCount >= this.holdThreshold || instantGestures.includes(finalGesture)) {
            this.lastGesture = finalGesture;
            return {
                gesture: finalGesture,
                confidence,
                landmarks,
                handedness,
                timestamp,
                isDynamic,
            };
        }

        return null;
    }

    private analyzeHandState(landmarks: Landmark[], handedness: 'Left' | 'Right'): HandState {
        const wrist = landmarks[WRIST];
        const palmBase = landmarks[FINGER_MCPS.middle];
        const palmDirection = {
            x: palmBase.x - wrist.x,
            y: palmBase.y - wrist.y,
            z: palmBase.z - wrist.z,
        };

        const isPalmFacingCamera = landmarks[FINGER_MCPS.middle].z < landmarks[WRIST].z;

        return {
            fingers: {
                thumb: this.analyzeThumb(landmarks, handedness),
                index: this.analyzeFinger(landmarks, 'index'),
                middle: this.analyzeFinger(landmarks, 'middle'),
                ring: this.analyzeFinger(landmarks, 'ring'),
                pinky: this.analyzeFinger(landmarks, 'pinky'),
            },
            palmDirection,
            wristPosition: wrist,
            isPalmFacingCamera,
        };
    }

    private analyzeThumb(landmarks: Landmark[], handedness: 'Left' | 'Right'): FingerState {
        const tip = landmarks[FINGER_TIPS.thumb];
        const mcp = landmarks[FINGER_MCPS.thumb];

        const palmCenter = {
            x: (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3,
            y: (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3,
        };

        const tipToPalmDist = Math.sqrt(
            Math.pow(tip.x - palmCenter.x, 2) + Math.pow(tip.y - palmCenter.y, 2)
        );

        const mcpToPalmDist = Math.sqrt(
            Math.pow(mcp.x - palmCenter.x, 2) + Math.pow(mcp.y - palmCenter.y, 2)
        );

        const isExtended = tipToPalmDist > mcpToPalmDist * 1.5;
        const curl = isExtended ? 0 : 0.8;

        const direction = {
            x: tip.x - mcp.x,
            y: tip.y - mcp.y,
        };

        return { isExtended, curl, direction };
    }

    private analyzeFinger(
        landmarks: Landmark[],
        finger: 'index' | 'middle' | 'ring' | 'pinky'
    ): FingerState {
        const tip = landmarks[FINGER_TIPS[finger]];
        const pip = landmarks[FINGER_PIPS[finger]];
        const mcp = landmarks[FINGER_MCPS[finger]];
        const wrist = landmarks[WRIST];

        // Method 1: Tip should be further from wrist than PIP when extended
        const tipToWrist = Math.sqrt(
            Math.pow(tip.x - wrist.x, 2) +
            Math.pow(tip.y - wrist.y, 2) +
            Math.pow(tip.z - wrist.z, 2)
        );
        const pipToWrist = Math.sqrt(
            Math.pow(pip.x - wrist.x, 2) +
            Math.pow(pip.y - wrist.y, 2) +
            Math.pow(pip.z - wrist.z, 2)
        );

        // Method 2: Y-position check (tip above pip when palm faces camera)
        const yExtended = tip.y < pip.y - 0.01;

        // Method 3: Distance ratio check
        const distRatio = tipToWrist / (pipToWrist + 0.001);
        const distExtended = distRatio > 1.1;  // Tip is 10% further than PIP

        // Combined: use OR to be more forgiving
        const isExtended = yExtended || distExtended;

        const vec1 = { x: pip.x - mcp.x, y: pip.y - mcp.y };
        const vec2 = { x: tip.x - pip.x, y: tip.y - pip.y };

        const dot = vec1.x * vec2.x + vec1.y * vec2.y;
        const mag1 = Math.sqrt(vec1.x * vec1.x + vec1.y * vec1.y);
        const mag2 = Math.sqrt(vec2.x * vec2.x + vec2.y * vec2.y);

        const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2 + 0.0001))));
        const curl = angle / Math.PI;

        const direction = {
            x: tip.x - mcp.x,
            y: tip.y - mcp.y,
        };

        return { isExtended, curl, direction };
    }

    private classifyStaticGesture(state: HandState, landmarks: Landmark[]): GestureType {
        const { fingers, isPalmFacingCamera } = state;

        // Count extended fingers
        const indexExt = fingers.index.isExtended;
        const middleExt = fingers.middle.isExtended;
        const ringExt = fingers.ring.isExtended;
        const pinkyExt = fingers.pinky.isExtended;
        const thumbExt = fingers.thumb.isExtended;

        const extendedCount = [indexExt, middleExt, ringExt, pinkyExt, thumbExt].filter(Boolean).length;
        const fourFingersExt = [indexExt, middleExt, ringExt, pinkyExt].filter(Boolean).length;

        // === PRIORITY ORDER: Most specific gestures first ===

        // 1. FIST - no fingers extended (click action)
        if (extendedCount === 0) {
            return 'fist';
        }

        // 2. Check pinch EARLY using distance between thumb and index tips
        const thumbTip = landmarks[FINGER_TIPS.thumb];
        const indexTip = landmarks[FINGER_TIPS.index];
        const pinchDist = Math.sqrt(
            Math.pow(thumbTip.x - indexTip.x, 2) +
            Math.pow(thumbTip.y - indexTip.y, 2) +
            Math.pow(thumbTip.z - indexTip.z, 2)
        );

        // Pinch detected when thumb and index are very close
        if (pinchDist < 0.06 && !middleExt && !ringExt && !pinkyExt) {
            return 'pinch';
        }

        // 3. VICTORY / PEACE SIGN - index + middle extended (for scrolling)
        // Check this EARLY before open_palm can match
        // More lenient: ring/pinky just need to be more curled than index/middle
        if (indexExt && middleExt) {
            // Check that ring and pinky are notably more curled
            const ringCurl = fingers.ring.curl;
            const pinkyCurl = fingers.pinky.curl;
            const indexCurl = fingers.index.curl;
            const middleCurl = fingers.middle.curl;

            // Victory if ring/pinky are more curled than index/middle
            if ((ringCurl > indexCurl + 0.1 || !ringExt) &&
                (pinkyCurl > middleCurl + 0.1 || !pinkyExt)) {
                return 'victory';
            }
        }

        // 4. THUMBS UP/DOWN - only thumb extended
        if (thumbExt && !indexExt && !middleExt && !ringExt && !pinkyExt) {
            if (fingers.thumb.direction.y < -0.05) {
                return 'thumbs_up';
            } else if (fingers.thumb.direction.y > 0.05) {
                return 'thumbs_down';
            }
        }

        // 4. SINGLE FINGER POINTING - index only (for scrolling/navigation)
        // Allow thumb to be in any state (natural pointing often has thumb out)
        if (indexExt && !middleExt && !ringExt && !pinkyExt) {
            // Determine direction based on finger pointing
            const dx = fingers.index.direction.x;
            const dy = fingers.index.direction.y;

            // Very low threshold for easier detection
            const threshold = 0.02;

            // Debug: log direction values
            // console.log(`Index direction: dx=${dx.toFixed(3)}, dy=${dy.toFixed(3)}`);

            // Check primarily vertical pointing (for scrolling)
            // In screen coords: negative Y = pointing up, positive Y = pointing down
            if (dy < -threshold && Math.abs(dy) > Math.abs(dx) * 0.5) {
                return 'point_up';  // Finger tip is above MCP = scroll up
            } else if (dy > threshold && Math.abs(dy) > Math.abs(dx) * 0.5) {
                return 'point_down';  // Finger tip is below MCP = scroll down
            }
            // Check primarily horizontal pointing (for navigation)
            else if (dx < -threshold && Math.abs(dx) > Math.abs(dy) * 0.5) {
                return 'point_left';
            } else if (dx > threshold && Math.abs(dx) > Math.abs(dy) * 0.5) {
                return 'point_right';
            }

            // If direction unclear, don't trigger scroll - return open_palm for tracking
            return 'open_palm';
        }

        // 5. VICTORY / PEACE - index and middle extended
        if (indexExt && middleExt && !ringExt && !pinkyExt) {
            return 'victory';
        }

        // 6. THREE FINGERS - index, middle, ring (keyboard mode)
        if (indexExt && middleExt && ringExt && !pinkyExt && !thumbExt) {
            return 'three_fingers';
        }

        // 7. OPEN PALM - 3 or more fingers extended (neutral/tracking)
        if (fourFingersExt >= 3 || extendedCount >= 4) {
            return 'open_palm';
        }

        // 8. TWO FINGER PINCH - thumb and middle
        const middleTip = landmarks[FINGER_TIPS.middle];
        const twoFingerPinch = Math.sqrt(
            Math.pow(thumbTip.x - middleTip.x, 2) +
            Math.pow(thumbTip.y - middleTip.y, 2)
        );
        if (twoFingerPinch < 0.07 && !ringExt && !pinkyExt) {
            return 'two_finger_pinch';
        }

        // Fallback to open palm for any other pose with some fingers extended
        if (extendedCount >= 2) {
            return 'open_palm';
        }

        // Default
        return 'open_palm';
    }

    private classifyDynamicGesture(landmarks: Landmark[]): GestureType | null {
        const now = Date.now();
        const wrist = landmarks[WRIST];

        // Track palm position for swipe detection
        this.palmPositionHistory.push({ x: wrist.x, y: wrist.y, t: now });

        // Keep only recent history (last 500ms)
        while (this.palmPositionHistory.length > this.swipeHistoryLength) {
            this.palmPositionHistory.shift();
        }

        if (this.palmPositionHistory.length < 10) {
            return null;
        }

        const oldest = this.palmPositionHistory[0];
        const newest = this.palmPositionHistory[this.palmPositionHistory.length - 1];
        const timeDelta = newest.t - oldest.t;

        // Only detect swipes in a reasonable time window (100-400ms)
        if (timeDelta < 100 || timeDelta > 400) {
            return null;
        }

        const dy = newest.y - oldest.y;
        const dx = newest.x - oldest.x;

        // Vertical swipe detection (primarily vertical movement)
        if (Math.abs(dy) > this.swipeThreshold && Math.abs(dy) > Math.abs(dx) * 2) {
            this.palmPositionHistory = []; // Clear after detecting
            return dy < 0 ? 'swipe_up' : 'swipe_down';
        }

        return null;
    }

    reset() {
        this.temporalBuffer.landmarks = [];
        this.temporalBuffer.timestamps = [];
        this.lastGesture = null;
        this.gestureHoldCount = 0;
        this.pinchStartTime = null;
        this.palmPositionHistory = [];
    }

    static getGestureName(gesture: GestureType): string {
        const names: Record<GestureType, string> = {
            fist: '✊ Fist',
            open_palm: '✋ Open Palm',
            point_up: '👆 Point Up',
            point_down: '👇 Point Down',
            point_left: '👈 Point Left',
            point_right: '👉 Point Right',
            pinch: '🤏 Pinch (Click)',
            two_finger_pinch: '🖱️ Two-Finger (Right Click)',
            pinch_hold: '✊ Pinch Hold (Drag)',
            both_palms: '🛑 Both Palms (Stop)',
            swipe_up: '⬆️ Swipe Up',
            swipe_down: '⬇️ Swipe Down',
            three_fingers: '⌨️ Three Fingers (Keyboard)',
            victory: '✌️ Victory',
            thumbs_up: '👍 Thumbs Up',
            thumbs_down: '👎 Thumbs Down',
            custom: '✨ Custom',
        };
        return names[gesture] || gesture;
    }

    static getAllGestures(): GestureType[] {
        return [
            'fist',
            'open_palm',
            'point_up',
            'point_down',
            'point_left',
            'point_right',
            'pinch',
            'two_finger_pinch',
            'pinch_hold',
            'both_palms',
            'swipe_up',
            'swipe_down',
            'three_fingers',
            'victory',
            'thumbs_up',
            'thumbs_down',
        ];
    }
}
