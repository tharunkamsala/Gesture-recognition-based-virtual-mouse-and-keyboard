import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    GestureMapping,
    GestureResult,
    AppSettings,
    ConnectionStatus,
    PerformanceMetrics,
    RecordedGesture,
    GestureType,
} from '../types';

// Default gesture mappings
const defaultMappings: GestureMapping[] = [
    {
        id: 'fist-click',
        gesture: 'fist',
        action: { type: 'mouse_click', button: 'left', clickType: 'single' },
        enabled: true,
        cooldownMs: 500,
        minConfidence: 0.8,
        label: 'Click',
        description: 'Left mouse click',
    },
    {
        id: 'open-palm-stop',
        gesture: 'open_palm',
        action: { type: 'none' },
        enabled: true,
        cooldownMs: 0,
        minConfidence: 0.7,
        label: 'Stop',
        description: 'Pause all actions',
    },
    {
        id: 'point-up-scroll',
        gesture: 'point_up',
        action: { type: 'mouse_scroll', direction: 'up', speed: 1 },
        enabled: true,
        cooldownMs: 100,
        minConfidence: 0.75,
        label: 'Scroll Up',
        description: 'Scroll page up',
    },
    {
        id: 'point-down-scroll',
        gesture: 'point_down',
        action: { type: 'mouse_scroll', direction: 'down', speed: 1 },
        enabled: true,
        cooldownMs: 100,
        minConfidence: 0.75,
        label: 'Scroll Down',
        description: 'Scroll page down',
    },
    {
        id: 'victory-confirm',
        gesture: 'victory',
        action: { type: 'keyboard', keys: ['Enter'] },
        enabled: true,
        cooldownMs: 800,
        minConfidence: 0.85,
        label: 'Confirm',
        description: 'Press Enter key',
    },
    {
        id: 'pinch-drag',
        gesture: 'pinch',
        action: { type: 'mouse_drag', button: 'left' },
        enabled: true,
        cooldownMs: 0,
        minConfidence: 0.8,
        label: 'Drag',
        description: 'Click and drag',
    },
    {
        id: 'thumbs-up-like',
        gesture: 'thumbs_up',
        action: { type: 'keyboard', keys: ['l'], modifiers: [] },
        enabled: true,
        cooldownMs: 1000,
        minConfidence: 0.85,
        label: 'Like',
        description: 'Press L key',
    },
    {
        id: 'point-left-back',
        gesture: 'point_left',
        action: { type: 'keyboard', keys: ['ArrowLeft'], modifiers: ['alt'] },
        enabled: true,
        cooldownMs: 500,
        minConfidence: 0.8,
        label: 'Back',
        description: 'Navigate back',
    },
    {
        id: 'point-right-forward',
        gesture: 'point_right',
        action: { type: 'keyboard', keys: ['ArrowRight'], modifiers: ['alt'] },
        enabled: true,
        cooldownMs: 500,
        minConfidence: 0.8,
        label: 'Forward',
        description: 'Navigate forward',
    },
];

// Default settings
const defaultSettings: AppSettings = {
    calibration: {
        sensitivity: 1.0,
        smoothing: 0.5,
        deadzone: 0.1,
    },
    detection: {
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
        maxNumHands: 1,
        modelComplexity: 1,
        enableDynamicGestures: false,
    },
    accessibility: {
        highContrast: false,
        largeButtons: false,
        reducedMotion: false,
        screenReaderAnnouncements: true,
    },
    useNativeConnector: false,
    nativeConnectorUrl: 'ws://localhost:8765',
    signatureSecret: '',
};

interface AppState {
    // Detection state
    isDetecting: boolean;
    currentGesture: GestureResult | null;
    handDetected: boolean;

    // Configuration
    mappings: GestureMapping[];
    settings: AppSettings;

    // Connection
    connectionStatus: ConnectionStatus;

    // Performance
    metrics: PerformanceMetrics;

    // Recording
    isRecording: boolean;
    recordedGestures: RecordedGesture[];
    currentRecordingLabel: string;

    // UI state
    activePanel: 'detection' | 'mappings' | 'settings' | 'recording' | 'analytics' | 'macros';
    showLandmarks: boolean;

    // Last action timestamps for cooldown
    lastActionTimes: Map<string, number>;

    // Actions
    setIsDetecting: (detecting: boolean) => void;
    setCurrentGesture: (gesture: GestureResult | null) => void;
    setHandDetected: (detected: boolean) => void;

    updateMapping: (id: string, updates: Partial<GestureMapping>) => void;
    addMapping: (mapping: GestureMapping) => void;
    removeMapping: (id: string) => void;
    resetMappings: () => void;

    updateSettings: (updates: Partial<AppSettings>) => void;
    updateCalibration: (updates: Partial<AppSettings['calibration']>) => void;
    updateDetection: (updates: Partial<AppSettings['detection']>) => void;
    updateAccessibility: (updates: Partial<AppSettings['accessibility']>) => void;

    setConnectionStatus: (status: ConnectionStatus) => void;
    setMetrics: (metrics: PerformanceMetrics) => void;

    startRecording: (label: string) => void;
    stopRecording: () => void;
    saveRecordedGesture: (gesture: RecordedGesture) => void;
    deleteRecordedGesture: (id: string) => void;

    setActivePanel: (panel: AppState['activePanel']) => void;
    setShowLandmarks: (show: boolean) => void;

    canExecuteAction: (mappingId: string) => boolean;
    recordActionExecution: (mappingId: string) => void;

    getMappingForGesture: (gesture: GestureType) => GestureMapping | undefined;
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            // Initial state
            isDetecting: false,
            currentGesture: null,
            handDetected: false,
            mappings: defaultMappings,
            settings: defaultSettings,
            connectionStatus: 'disconnected',
            metrics: {
                fps: 0,
                inferenceTimeMs: 0,
                landmarkDetectionTimeMs: 0,
                totalLatencyMs: 0,
            },
            isRecording: false,
            recordedGestures: [],
            currentRecordingLabel: '',
            activePanel: 'detection',
            showLandmarks: true,
            lastActionTimes: new Map(),

            // Actions
            setIsDetecting: (detecting) => set({ isDetecting: detecting }),
            setCurrentGesture: (gesture) => set({ currentGesture: gesture }),
            setHandDetected: (detected) => set({ handDetected: detected }),

            updateMapping: (id, updates) => set((state) => ({
                mappings: state.mappings.map((m) =>
                    m.id === id ? { ...m, ...updates } : m
                ),
            })),

            addMapping: (mapping) => set((state) => ({
                mappings: [...state.mappings, mapping],
            })),

            removeMapping: (id) => set((state) => ({
                mappings: state.mappings.filter((m) => m.id !== id),
            })),

            resetMappings: () => set({ mappings: defaultMappings }),

            updateSettings: (updates) => set((state) => ({
                settings: { ...state.settings, ...updates },
            })),

            updateCalibration: (updates) => set((state) => ({
                settings: {
                    ...state.settings,
                    calibration: { ...state.settings.calibration, ...updates },
                },
            })),

            updateDetection: (updates) => set((state) => ({
                settings: {
                    ...state.settings,
                    detection: { ...state.settings.detection, ...updates },
                },
            })),

            updateAccessibility: (updates) => set((state) => ({
                settings: {
                    ...state.settings,
                    accessibility: { ...state.settings.accessibility, ...updates },
                },
            })),

            setConnectionStatus: (status) => set({ connectionStatus: status }),
            setMetrics: (metrics) => set({ metrics }),

            startRecording: (label) => set({
                isRecording: true,
                currentRecordingLabel: label,
            }),

            stopRecording: () => set({
                isRecording: false,
                currentRecordingLabel: '',
            }),

            saveRecordedGesture: (gesture) => set((state) => ({
                recordedGestures: [...state.recordedGestures, gesture],
            })),

            deleteRecordedGesture: (id) => set((state) => ({
                recordedGestures: state.recordedGestures.filter((g) => g.id !== id),
            })),

            setActivePanel: (panel) => set({ activePanel: panel }),
            setShowLandmarks: (show) => set({ showLandmarks: show }),

            canExecuteAction: (mappingId) => {
                const state = get();
                const mapping = state.mappings.find((m) => m.id === mappingId);
                if (!mapping || !mapping.enabled) return false;

                const lastTime = state.lastActionTimes.get(mappingId) || 0;
                const now = Date.now();
                return now - lastTime >= mapping.cooldownMs;
            },

            recordActionExecution: (mappingId) => {
                const state = get();
                const newMap = new Map(state.lastActionTimes);
                newMap.set(mappingId, Date.now());
                set({ lastActionTimes: newMap });
            },

            getMappingForGesture: (gesture) => {
                const state = get();
                return state.mappings.find((m) => m.gesture === gesture && m.enabled);
            },
        }),
        {
            name: 'gesture-recognition-storage',
            partialize: (state) => ({
                mappings: state.mappings,
                settings: state.settings,
                recordedGestures: state.recordedGestures,
            }),
        }
    )
);
