import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

interface DebugStats {
    fps: number;
    latency: number;
    gestureConfidence: number;
    gestureName: string;
    fingerStates: boolean[];
    handedness: string;
    mode: string;
    sessionDuration: number;
    gestureCount: number;
    clickCount: number;
}

export default function DebugOverlay() {
    const [isVisible, setIsVisible] = useState(false);
    const [stats, setStats] = useState<DebugStats>({
        fps: 0,
        latency: 0,
        gestureConfidence: 0,
        gestureName: 'none',
        fingerStates: [false, false, false, false, false],
        handedness: 'Right',
        mode: 'relative',
        sessionDuration: 0,
        gestureCount: 0,
        clickCount: 0
    });
    const [fpsFrames, setFpsFrames] = useState<number[]>([]);

    const { currentGesture, metrics, isDetecting } = useAppStore();

    // Listen for debug toggle event
    useEffect(() => {
        const handleToggle = (e: CustomEvent) => {
            setIsVisible(e.detail);
        };
        window.addEventListener('toggle-debug', handleToggle as EventListener);

        // Also listen for keyboard shortcut (Ctrl+Shift+D)
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                setIsVisible(v => !v);
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('toggle-debug', handleToggle as EventListener);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Update FPS calculation
    useEffect(() => {
        if (!isVisible || !isDetecting) return;

        let frameCount = 0;
        let lastTime = performance.now();

        const updateFps = () => {
            frameCount++;
            const now = performance.now();
            if (now - lastTime >= 1000) {
                setStats(s => ({ ...s, fps: frameCount }));
                frameCount = 0;
                lastTime = now;
            }
        };

        const interval = setInterval(updateFps, 100);
        return () => clearInterval(interval);
    }, [isVisible, isDetecting]);

    // Update stats from gesture
    useEffect(() => {
        if (currentGesture) {
            setStats(s => ({
                ...s,
                gestureName: currentGesture.gesture,
                gestureConfidence: currentGesture.confidence,
                handedness: currentGesture.handedness || 'Right',
                gestureCount: s.gestureCount + 1
            }));
        }
    }, [currentGesture]);

    // Session duration timer
    useEffect(() => {
        if (!isVisible) return;
        const interval = setInterval(() => {
            setStats(s => ({ ...s, sessionDuration: s.sessionDuration + 1 }));
        }, 1000);
        return () => clearInterval(interval);
    }, [isVisible]);

    // Listen for click events
    useEffect(() => {
        const handleAction = (e: CustomEvent) => {
            if (e.detail?.action === 'click') {
                setStats(s => ({ ...s, clickCount: s.clickCount + 1 }));
            }
        };
        window.addEventListener('gesture-action', handleAction as EventListener);
        return () => window.removeEventListener('gesture-action', handleAction as EventListener);
    }, []);

    if (!isVisible) return null;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed top-20 right-4 z-50 w-72 font-mono text-xs">
            <div className="bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-yellow-600/80 to-orange-600/80 px-3 py-2 flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-2">
                        🔧 Debug Mode
                    </span>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="text-white/60 hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-3 space-y-3">
                    {/* Performance */}
                    <div>
                        <div className="text-gray-400 mb-1">Performance</div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/5 rounded p-2">
                                <div className="text-gray-500">FPS</div>
                                <div className={`text-lg font-bold ${stats.fps >= 25 ? 'text-green-400' : stats.fps >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {metrics.fps || stats.fps}
                                </div>
                            </div>
                            <div className="bg-white/5 rounded p-2">
                                <div className="text-gray-500">Latency</div>
                                <div className="text-lg font-bold text-blue-400">
                                    {metrics.totalLatencyMs || 0}ms
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Current Gesture */}
                    <div>
                        <div className="text-gray-400 mb-1">Current Gesture</div>
                        <div className="bg-white/5 rounded p-2">
                            <div className="flex items-center justify-between">
                                <span className="text-white font-medium capitalize">
                                    {stats.gestureName.replace('_', ' ')}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs ${stats.gestureConfidence >= 0.9 ? 'bg-green-500/30 text-green-400' :
                                        stats.gestureConfidence >= 0.7 ? 'bg-yellow-500/30 text-yellow-400' :
                                            'bg-red-500/30 text-red-400'
                                    }`}>
                                    {(stats.gestureConfidence * 100).toFixed(0)}%
                                </span>
                            </div>
                            {/* Confidence bar */}
                            <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                                    style={{ width: `${stats.gestureConfidence * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Finger States */}
                    <div>
                        <div className="text-gray-400 mb-1">Finger States</div>
                        <div className="flex gap-1">
                            {['👍', '👆', '✌️', '🖖', '🤙'].map((emoji, i) => (
                                <div
                                    key={i}
                                    className={`flex-1 text-center py-1 rounded ${stats.fingerStates[i]
                                            ? 'bg-green-500/30 text-green-400'
                                            : 'bg-white/5 text-gray-600'
                                        }`}
                                    title={['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'][i]}
                                >
                                    {emoji}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-1 mt-1 text-center">
                            {['T', 'I', 'M', 'R', 'P'].map((l, i) => (
                                <div key={i} className="flex-1 text-gray-500 text-[10px]">{l}</div>
                            ))}
                        </div>
                    </div>

                    {/* Session Stats */}
                    <div>
                        <div className="text-gray-400 mb-1">Session</div>
                        <div className="grid grid-cols-3 gap-1 text-center">
                            <div className="bg-white/5 rounded p-1">
                                <div className="text-gray-500 text-[10px]">TIME</div>
                                <div className="text-white">{formatTime(stats.sessionDuration)}</div>
                            </div>
                            <div className="bg-white/5 rounded p-1">
                                <div className="text-gray-500 text-[10px]">GESTURES</div>
                                <div className="text-white">{stats.gestureCount}</div>
                            </div>
                            <div className="bg-white/5 rounded p-1">
                                <div className="text-gray-500 text-[10px]">CLICKS</div>
                                <div className="text-white">{stats.clickCount}</div>
                            </div>
                        </div>
                    </div>

                    {/* System Info */}
                    <div className="text-gray-500 text-[10px] pt-2 border-t border-gray-700">
                        <div className="flex justify-between">
                            <span>Mode:</span>
                            <span className="text-gray-400">{stats.mode}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Hand:</span>
                            <span className="text-gray-400">{stats.handedness}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Detection:</span>
                            <span className={isDetecting ? 'text-green-400' : 'text-red-400'}>
                                {isDetecting ? 'Active' : 'Stopped'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-800/50 px-3 py-1.5 text-gray-500 text-[10px] flex justify-between">
                    <span>Ctrl+Shift+D to toggle</span>
                    <button
                        onClick={() => setStats(s => ({
                            ...s,
                            sessionDuration: 0,
                            gestureCount: 0,
                            clickCount: 0
                        }))}
                        className="hover:text-white"
                    >
                        Reset Stats
                    </button>
                </div>
            </div>
        </div>
    );
}
