import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { GestureDecoder } from '../lib/GestureDecoder';
import type { Landmark, GestureType } from '../types';

declare global {
    interface Window {
        Hands: any;
        Camera: any;
        drawConnectors: any;
        drawLandmarks: any;
        HAND_CONNECTIONS: any;
    }
}

export default function WebcamCapture() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const handsRef = useRef<any>(null);
    const decoderRef = useRef(new GestureDecoder());
    const intervalRef = useRef<number | null>(null);  // For background processing

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [wsConnected, setWsConnected] = useState(false);

    const {
        isDetecting,
        setIsDetecting,
        handDetected,
        setHandDetected,
        currentGesture,
        setCurrentGesture,
        showLandmarks,
        settings
    } = useAppStore();

    // Load MediaPipe scripts
    useEffect(() => {
        const loadScripts = async () => {
            if (window.Hands) {
                initMediaPipe();
                return;
            }

            const scripts = [
                'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
                'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
                'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'
            ];

            for (const src of scripts) {
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = src;
                    script.crossOrigin = 'anonymous';
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error(`Failed to load ${src}`));
                    document.head.appendChild(script);
                });
            }

            initMediaPipe();
        };

        loadScripts().catch(err => {
            setError('Failed to load MediaPipe');
            console.error(err);
        });
    }, []);

    // Connect to backend WebSocket
    useEffect(() => {
        const connectWS = () => {
            try {
                const ws = new WebSocket('ws://localhost:8000/ws');

                ws.onopen = () => {
                    setWsConnected(true);
                    console.log('Connected to backend');
                };

                ws.onclose = () => {
                    setWsConnected(false);
                    setTimeout(connectWS, 3000);
                };

                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.type === 'action_result' && data.success) {
                        console.log(`Action: ${data.action}`);
                    } else if (data.type === 'show_keyboard') {
                        // Dispatch event to show virtual keyboard
                        window.dispatchEvent(new CustomEvent('show-keyboard'));
                    } else if (data.type === 'control_stopped') {
                        // Dispatch event to update control status
                        window.dispatchEvent(new CustomEvent('control-stopped', {
                            detail: { reason: data.reason }
                        }));
                    }
                };

                wsRef.current = ws;
            } catch (e) {
                console.error('WebSocket error:', e);
            }
        };

        connectWS();
        return () => wsRef.current?.close();
    }, []);

    const initMediaPipe = async () => {
        if (!window.Hands) {
            setError('MediaPipe not loaded');
            return;
        }

        const hands = new window.Hands({
            locateFile: (file: string) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: settings.detection.minDetectionConfidence,
            minTrackingConfidence: settings.detection.minTrackingConfidence
        });

        hands.onResults(onResults);
        handsRef.current = hands;
        setIsLoading(false);
    };

    const onResults = useCallback((results: any) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // Draw camera frame
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            setHandDetected(true);

            // Process each detected hand
            for (let handIndex = 0; handIndex < results.multiHandLandmarks.length; handIndex++) {
                const landmarks = results.multiHandLandmarks[handIndex];

                // Draw landmarks for each hand
                if (showLandmarks && window.drawConnectors && window.drawLandmarks) {
                    const color = handIndex === 0 ? '#00FF00' : '#00FFFF'; // Green for first, cyan for second
                    window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS,
                        { color, lineWidth: 2 });
                    window.drawLandmarks(ctx, landmarks,
                        { color: handIndex === 0 ? '#FF0000' : '#FF00FF', lineWidth: 1, radius: 3 });
                }

                // Convert to our format (array of Landmark)
                const handLandmarks: Landmark[] = landmarks.map((lm: any) => ({
                    x: lm.x,
                    y: lm.y,
                    z: lm.z
                }));

                // Decode gesture
                const gestureResult = decoderRef.current.decode(handLandmarks);

                if (gestureResult) {
                    // DEBUG: Log detected gesture
                    console.log(`Gesture: ${gestureResult.gesture}, Confidence: ${gestureResult.confidence.toFixed(2)}`);

                    // Only set UI gesture for primary hand
                    if (handIndex === 0) {
                        setCurrentGesture(gestureResult);
                    }

                    // Send gesture to backend for action execution
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                        // Use palm center for more stable cursor tracking
                        // Palm center = average of wrist(0), index_mcp(5), and pinky_mcp(17)
                        const palmX = (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3;
                        const palmY = (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3;

                        // NO SMOOTHING - Direct 1:1 tracking like a real mouse

                        // Wrist position for fingertip mode
                        const wristX = landmarks[0].x;
                        const wristY = landmarks[0].y;

                        // Index fingertip position for precise control
                        const fingertipX = landmarks[8].x;
                        const fingertipY = landmarks[8].y;

                        // === MOVEMENT-BASED SCROLLING ===
                        // Track index finger movement for scroll gestures
                        let fingertipDeltaY = 0;
                        if (!(window as any)._lastFingertipY) {
                            (window as any)._lastFingertipY = fingertipY;
                        } else {
                            fingertipDeltaY = fingertipY - (window as any)._lastFingertipY;
                            (window as any)._lastFingertipY = fingertipY;
                        }

                        wsRef.current.send(JSON.stringify({
                            type: 'gesture',
                            gesture: gestureResult.gesture,
                            confidence: gestureResult.confidence,
                            hand_x: palmX,  // Smoothed palm center
                            hand_y: palmY,
                            wrist_x: wristX,  // For fingertip mode
                            wrist_y: wristY,
                            fingertip_x: fingertipX,  // Index finger tip
                            fingertip_y: fingertipY,
                            fingertip_delta_y: fingertipDeltaY,  // For movement-based scroll
                            hand_index: handIndex
                        }));
                    }
                }
            }
        } else {
            setHandDetected(false);
            setCurrentGesture(null);
        }

        ctx.restore();
    }, [showLandmarks, setHandDetected, setCurrentGesture]);

    const startCamera = async () => {
        // Check if MediaPipe is ready first
        if (!handsRef.current) {
            setError('MediaPipe not ready yet - please wait');
            return;
        }
        if (!videoRef.current) {
            setError('Video element not ready');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });

            videoRef.current.srcObject = stream;
            await videoRef.current.play();

            // WORKAROUND: Prevent browser from throttling when tab is inactive
            // Use Web Lock API to keep the page "alive"
            if ('locks' in navigator) {
                try {
                    navigator.locks.request('gestureflow-active', { mode: 'exclusive' }, async () => {
                        // This lock prevents the page from being fully suspended
                        return new Promise(() => { }); // Never resolve to keep lock
                    });
                    console.log('Web Lock acquired - background processing enabled');
                } catch (e) {
                    console.warn('Web Lock not available, background may be throttled');
                }
            }

            // Also play silent audio to keep the page active (Chrome workaround)
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            gainNode.gain.value = 0; // Silent
            oscillator.start();

            // Frame rate control
            let frameInterval = 33;  // ~30fps

            // Listen for low power mode changes
            const handleLowPowerMode = (e: CustomEvent) => {
                frameInterval = e.detail ? 66 : 33;
                console.log(`Frame rate: ${e.detail ? '15fps' : '30fps'}`);
            };
            window.addEventListener('low-power-mode', handleLowPowerMode as EventListener);

            // Use setInterval for background processing
            let isProcessing = false;
            let lastProcessTime = 0;

            intervalRef.current = window.setInterval(async () => {
                const now = Date.now();
                if (now - lastProcessTime < frameInterval) return;
                if (isProcessing) return;
                if (!handsRef.current || !videoRef.current) return;

                isProcessing = true;
                lastProcessTime = now;
                try {
                    await handsRef.current.send({ image: videoRef.current });
                } catch (e) {
                    // Ignore errors silently
                }
                isProcessing = false;
            }, 16);

            setIsDetecting(true);
            setError(null); // Clear any previous error

            // Enable control on backend
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: 'enable_control',
                    enabled: true
                }));
            }
        } catch (err: any) {
            // Provide specific error messages
            if (err.name === 'NotAllowedError') {
                setError('Camera access denied - please allow camera in browser settings');
            } else if (err.name === 'NotFoundError') {
                setError('No camera found - please connect a camera');
            } else if (err.name === 'NotReadableError') {
                setError('Camera is in use by another app');
            } else {
                setError(`Camera error: ${err.message || err.name || 'unknown'}`);
            }
            console.error('Camera error:', err);
        }
    };

    const stopCamera = () => {
        // Clear the processing interval
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        const video = videoRef.current;
        if (video?.srcObject) {
            (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            video.srcObject = null;
        }
        setIsDetecting(false);
        setHandDetected(false);

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'enable_control',
                enabled: false
            }));
        }
    };

    // Enable Picture-in-Picture for background operation
    const enablePiP = async () => {
        if (!videoRef.current) return;

        try {
            // Make video visible temporarily for PiP
            videoRef.current.style.display = 'block';
            videoRef.current.style.position = 'absolute';
            videoRef.current.style.width = '1px';
            videoRef.current.style.height = '1px';
            videoRef.current.style.opacity = '0.01';

            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await videoRef.current.requestPictureInPicture();
                console.log('📺 Picture-in-Picture enabled - detection continues in background!');
            }
        } catch (e) {
            console.error('PiP not supported:', e);
            alert('Picture-in-Picture not supported in this browser');
        }
    };

    return (
        <div className="card">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Camera Feed</h2>
                <div className="flex items-center gap-3">
                    <div className={`badge ${wsConnected ? 'badge-success' : 'badge-error'}`}>
                        {wsConnected ? '● Backend Connected' : '○ Backend Offline'}
                    </div>

                    {isDetecting && (
                        <button
                            onClick={enablePiP}
                            className="btn bg-purple-600 hover:bg-purple-500"
                            title="Pop out video - keeps detection running when you switch tabs"
                        >
                            📺 PiP Mode
                        </button>
                    )}

                    <button
                        onClick={isDetecting ? stopCamera : startCamera}
                        disabled={isLoading}
                        className={`btn ${isDetecting ? 'bg-red-600 hover:bg-red-500' : 'btn-primary'}`}
                    >
                        {isLoading ? '⏳ Loading...' : isDetecting ? '⏹ Stop' : '▶ Start'}
                    </button>
                </div>
            </div>

            <div className="webcam-container relative aspect-video overflow-hidden rounded-xl bg-gray-900">
                <video ref={videoRef} className="hidden" playsInline />
                <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    className="h-full w-full object-cover"
                />

                {!isDetecting && !isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
                        <div className="text-center">
                            <div className="mb-4 text-6xl">✋</div>
                            <p className="text-lg text-gray-400">Click Start to begin</p>
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                        <div className="text-center">
                            <div className="mb-2 animate-spin text-4xl">⏳</div>
                            <p className="text-gray-400">Loading MediaPipe...</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-900/50">
                        <div className="text-center">
                            <div className="mb-2 text-4xl">⚠️</div>
                            <p className="text-white">{error}</p>
                        </div>
                    </div>
                )}

                {isDetecting && (
                    <>
                        <div className="absolute bottom-4 left-4">
                            <div className={`badge ${handDetected ? 'badge-success' : 'badge-warning'}`}>
                                {handDetected ? '✋ Hand Detected' : '⏳ Waiting...'}
                            </div>
                        </div>

                        {currentGesture && (
                            <div className="absolute bottom-4 right-4">
                                <div className="rounded-xl bg-primary-600/90 px-4 py-2 text-white backdrop-blur-sm">
                                    <div className="text-2xl font-bold">
                                        {GestureDecoder.getGestureName(currentGesture.gesture as GestureType)}
                                    </div>
                                    <div className="text-sm opacity-80">
                                        {(currentGesture.confidence * 100).toFixed(0)}%
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <p className="mt-4 text-sm text-gray-400">
                Hand detection runs in your browser. Gestures are sent to the backend for mouse/keyboard control.
            </p>
        </div>
    );
}
