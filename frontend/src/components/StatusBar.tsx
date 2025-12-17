import { useAppStore } from '../store/useAppStore';

export default function StatusBar() {
    const {
        isDetecting,
        handDetected,
        currentGesture,
        metrics,
        connectionStatus
    } = useAppStore();

    return (
        <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-gray-950/90 backdrop-blur-xl">
            <div className="mx-auto max-w-7xl px-4">
                <div className="flex h-12 items-center justify-between text-sm">
                    {/* Left side - Status */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${isDetecting ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                            <span className="text-gray-400">
                                {isDetecting ? 'Detecting' : 'Stopped'}
                            </span>
                        </div>

                        {handDetected && (
                            <div className="flex items-center gap-2 text-green-400">
                                <span>✋</span>
                                <span>Hand detected</span>
                            </div>
                        )}

                        {currentGesture && (
                            <div className="flex items-center gap-2 text-primary-400">
                                <span>⚡</span>
                                <span>{currentGesture.gesture}</span>
                                <span className="text-gray-500">
                                    ({(currentGesture.confidence * 100).toFixed(0)}%)
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right side - Metrics */}
                    <div className="flex items-center gap-6 text-gray-400">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">FPS:</span>
                            <span className={`font-mono ${metrics.fps >= 20 ? 'text-green-400' : metrics.fps >= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {metrics.fps.toFixed(0)}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' :
                                    connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                                        'bg-red-500'
                                }`} />
                            <span className="text-gray-500 capitalize">{connectionStatus}</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
