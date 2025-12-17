import { useAppStore } from '../store/useAppStore';
import { GestureDecoder } from '../lib/GestureDecoder';

interface ControlPanelProps {
    showDetailed?: boolean;
}

export default function ControlPanel({ showDetailed = false }: ControlPanelProps) {
    const {
        isDetecting,
        handDetected,
        currentGesture,
        metrics,
        settings,
        connectionStatus,
        updateSettings
    } = useAppStore();

    // Send control command to backend
    const sendCommand = async (command: string, params: any = {}) => {
        try {
            const response = await fetch(`http://localhost:8000/${command}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            return response.ok;
        } catch (e) {
            console.error('Command failed:', e);
            return false;
        }
    };

    const enableControl = () => sendCommand('control/enable', { enabled: true });
    const disableControl = () => sendCommand('control/enable', { enabled: false });

    if (!showDetailed) {
        return (
            <div className="card">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`gesture-indicator ${currentGesture ? 'active' : ''}`}>
                            <span className="text-2xl">
                                {currentGesture ? '✓' : '✋'}
                            </span>
                        </div>
                        <div>
                            <div className="text-sm text-gray-400">Current Gesture</div>
                            <div className="text-xl font-bold text-white">
                                {currentGesture
                                    ? GestureDecoder.getGestureName(currentGesture.gesture as any)
                                    : 'None'}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-sm text-gray-400">FPS</div>
                            <div className="text-2xl font-bold text-primary-400">
                                {metrics.fps.toFixed(0)}
                            </div>
                        </div>

                        <button
                            onClick={enableControl}
                            className="btn btn-primary"
                        >
                            Enable Control
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-white">Detection Status</h2>

            {/* Status Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/5 p-4">
                    <div className="text-sm text-gray-400">Detection</div>
                    <div className={`text-xl font-bold ${isDetecting ? 'text-green-400' : 'text-gray-500'}`}>
                        {isDetecting ? 'Active' : 'Stopped'}
                    </div>
                </div>

                <div className="rounded-xl bg-white/5 p-4">
                    <div className="text-sm text-gray-400">Hand</div>
                    <div className={`text-xl font-bold ${handDetected ? 'text-green-400' : 'text-yellow-400'}`}>
                        {handDetected ? 'Detected' : 'Not Found'}
                    </div>
                </div>

                <div className="rounded-xl bg-white/5 p-4">
                    <div className="text-sm text-gray-400">FPS</div>
                    <div className="text-xl font-bold text-primary-400">
                        {metrics.fps.toFixed(1)}
                    </div>
                </div>

                <div className="rounded-xl bg-white/5 p-4">
                    <div className="text-sm text-gray-400">Latency</div>
                    <div className="text-xl font-bold text-primary-400">
                        {metrics.totalLatencyMs.toFixed(0)}ms
                    </div>
                </div>
            </div>

            {/* Current Gesture */}
            {currentGesture && (
                <div className="mt-4 rounded-xl bg-gradient-to-r from-primary-600/20 to-accent-600/20 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-400">Detected Gesture</div>
                            <div className="text-2xl font-bold text-white">
                                {GestureDecoder.getGestureName(currentGesture.gesture as any)}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-400">Confidence</div>
                            <div className="text-2xl font-bold text-primary-400">
                                {(currentGesture.confidence * 100).toFixed(0)}%
                            </div>
                        </div>
                    </div>

                    {/* Confidence bar */}
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-200"
                            style={{ width: `${currentGesture.confidence * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Control Buttons */}
            <div className="mt-4 flex gap-3">
                <button
                    onClick={enableControl}
                    className="btn btn-primary flex-1"
                >
                    🎮 Enable System Control
                </button>
                <button
                    onClick={disableControl}
                    className="btn btn-secondary flex-1"
                >
                    ⏸ Pause Control
                </button>
            </div>

            {/* Safety Notice */}
            <div className="mt-4 rounded-xl bg-yellow-500/10 p-3 text-sm text-yellow-400">
                <strong>⚠️ Safety:</strong> System control will move your mouse and press keys.
                Use the Pause button or show an open palm to stop.
            </div>
        </div>
    );
}
