import { useState, useRef, useEffect } from 'react';

interface CalibrationPoint {
    id: string;
    label: string;
    position: { x: number; y: number };
    captured?: { x: number; y: number };
}

interface CalibrationData {
    points: CalibrationPoint[];
    handDistance: number;
    handSize: number;
    timestamp: number;
}

const defaultPoints: CalibrationPoint[] = [
    { id: 'top-left', label: 'Top Left', position: { x: 10, y: 10 } },
    { id: 'top-right', label: 'Top Right', position: { x: 90, y: 10 } },
    { id: 'center', label: 'Center', position: { x: 50, y: 50 } },
    { id: 'bottom-left', label: 'Bottom Left', position: { x: 10, y: 90 } },
    { id: 'bottom-right', label: 'Bottom Right', position: { x: 90, y: 90 } },
];

interface CalibrationWizardProps {
    onComplete: (data: CalibrationData) => void;
    onCancel: () => void;
}

export default function CalibrationWizard({ onComplete, onCancel }: CalibrationWizardProps) {
    const [step, setStep] = useState(0);
    const [currentPointIndex, setCurrentPointIndex] = useState(0);
    const [points, setPoints] = useState<CalibrationPoint[]>(defaultPoints);
    const [handPosition, setHandPosition] = useState<{ x: number; y: number } | null>(null);
    const [countdown, setCountdown] = useState(0);
    const [isCapturing, setIsCapturing] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // Listen for hand position updates from WebSocket
    useEffect(() => {
        const handleHandPosition = (e: CustomEvent) => {
            setHandPosition({ x: e.detail.x, y: e.detail.y });
        };

        window.addEventListener('hand-position', handleHandPosition as EventListener);
        return () => window.removeEventListener('hand-position', handleHandPosition as EventListener);
    }, []);

    // Countdown and capture logic
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        } else if (isCapturing && handPosition) {
            // Capture the point
            setPoints(pts => pts.map((pt, i) =>
                i === currentPointIndex
                    ? { ...pt, captured: { x: handPosition.x, y: handPosition.y } }
                    : pt
            ));
            setIsCapturing(false);

            // Move to next point or complete
            if (currentPointIndex < points.length - 1) {
                setCurrentPointIndex(i => i + 1);
            } else {
                setStep(2); // Complete
            }
        }
    }, [countdown, isCapturing, handPosition, currentPointIndex, points.length]);

    const startCapture = () => {
        setCountdown(3);
        setIsCapturing(true);
    };

    const handleComplete = () => {
        const calibrationData: CalibrationData = {
            points,
            handDistance: 0.5, // Could calculate from point distances
            handSize: 1.0, // Could detect from hand landmarks
            timestamp: Date.now()
        };

        // Save to localStorage
        localStorage.setItem('gestureflow-calibration', JSON.stringify(calibrationData));

        onComplete(calibrationData);
    };

    const currentPoint = points[currentPointIndex];

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
            <div ref={containerRef} className="w-full h-full max-w-4xl max-h-[90vh] relative">

                {/* Step 0: Introduction */}
                {step === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center space-y-6 max-w-lg">
                            <div className="text-6xl">🎯</div>
                            <h2 className="text-3xl font-bold text-white">Calibration Wizard</h2>
                            <p className="text-gray-400">
                                Let's calibrate your gesture space for optimal accuracy.
                                You'll point to 5 corners of your screen to help us understand
                                your comfortable range of motion.
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={() => setStep(1)}
                                    className="btn bg-primary-600 hover:bg-primary-500 text-white px-8 py-3 text-lg"
                                >
                                    Start Calibration
                                </button>
                                <button
                                    onClick={onCancel}
                                    className="block mx-auto text-gray-500 hover:text-white"
                                >
                                    Skip for now
                                </button>
                            </div>
                            <div className="text-sm text-gray-500">
                                Takes about 30 seconds
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 1: Point Calibration */}
                {step === 1 && (
                    <>
                        {/* Target Points */}
                        {points.map((point, i) => (
                            <div
                                key={point.id}
                                className={`absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${i === currentPointIndex
                                        ? 'scale-125'
                                        : point.captured
                                            ? 'opacity-50'
                                            : 'opacity-20'
                                    }`}
                                style={{
                                    left: `${point.position.x}%`,
                                    top: `${point.position.y}%`
                                }}
                            >
                                {/* Target circle */}
                                <div className={`w-full h-full rounded-full border-4 flex items-center justify-center ${i === currentPointIndex
                                        ? 'border-primary-500 bg-primary-500/20 animate-pulse'
                                        : point.captured
                                            ? 'border-green-500 bg-green-500/20'
                                            : 'border-gray-500'
                                    }`}>
                                    {point.captured ? (
                                        <span className="text-green-400 text-2xl">✓</span>
                                    ) : i === currentPointIndex ? (
                                        countdown > 0 ? (
                                            <span className="text-4xl font-bold text-primary-400">{countdown}</span>
                                        ) : (
                                            <span className="text-2xl">👆</span>
                                        )
                                    ) : (
                                        <span className="text-2xl opacity-50">○</span>
                                    )}
                                </div>

                                {/* Label */}
                                <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm ${i === currentPointIndex ? 'text-primary-400 font-medium' : 'text-gray-500'
                                    }`}>
                                    {point.label}
                                </div>
                            </div>
                        ))}

                        {/* Hand cursor preview */}
                        {handPosition && (
                            <div
                                className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                style={{
                                    left: `${handPosition.x * 100}%`,
                                    top: `${handPosition.y * 100}%`
                                }}
                            >
                                <div className="w-full h-full rounded-full bg-white shadow-lg animate-ping opacity-50" />
                                <div className="absolute inset-0 w-full h-full rounded-full bg-white shadow-lg" />
                            </div>
                        )}

                        {/* Instructions */}
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center space-y-4">
                            <p className="text-lg text-white">
                                Point your hand at the <span className="text-primary-400 font-bold">{currentPoint?.label}</span> target
                            </p>

                            {!isCapturing && (
                                <button
                                    onClick={startCapture}
                                    className="btn bg-primary-600 hover:bg-primary-500 text-white px-6 py-2"
                                >
                                    Capture Position
                                </button>
                            )}

                            <p className="text-sm text-gray-500">
                                Point {currentPointIndex + 1} of {points.length}
                            </p>
                        </div>

                        {/* Progress bar */}
                        <div className="absolute top-4 left-4 right-4">
                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
                                    style={{ width: `${((currentPointIndex) / points.length) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Cancel button */}
                        <button
                            onClick={onCancel}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white"
                        >
                            ✕ Cancel
                        </button>
                    </>
                )}

                {/* Step 2: Complete */}
                {step === 2 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center space-y-6 max-w-lg">
                            <div className="text-6xl">🎉</div>
                            <h2 className="text-3xl font-bold text-white">Calibration Complete!</h2>
                            <p className="text-gray-400">
                                Your gesture space has been calibrated. The system will now use
                                these reference points for more accurate cursor control.
                            </p>

                            {/* Summary */}
                            <div className="bg-white/5 rounded-xl p-4 text-left">
                                <h3 className="text-sm font-medium text-gray-400 mb-3">Captured Points</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    {points.map(pt => (
                                        <div key={pt.id} className="flex items-center gap-2">
                                            <span className="text-green-400">✓</span>
                                            <span className="text-gray-300">{pt.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handleComplete}
                                    className="btn bg-green-600 hover:bg-green-500 text-white px-8 py-3 text-lg"
                                >
                                    Apply Calibration
                                </button>
                                <button
                                    onClick={() => {
                                        setStep(1);
                                        setCurrentPointIndex(0);
                                        setPoints(defaultPoints);
                                    }}
                                    className="block mx-auto text-gray-500 hover:text-white"
                                >
                                    Recalibrate
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
