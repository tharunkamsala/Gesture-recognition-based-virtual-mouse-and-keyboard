import { useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { RecordedGesture } from '../types';

export default function RecordingPanel() {
    const {
        isRecording,
        startRecording,
        stopRecording,
        recordedGestures,
        saveRecordedGesture,
        deleteRecordedGesture
    } = useAppStore();

    const [newLabel, setNewLabel] = useState('');
    const [countdown, setCountdown] = useState(0);
    const recordingRef = useRef<{
        landmarks: any[][];
        timestamps: number[];
        startTime: number;
    } | null>(null);

    const handleStartRecording = () => {
        if (!newLabel.trim()) {
            alert('Please enter a gesture label');
            return;
        }

        // Countdown before recording
        setCountdown(3);
        const countdownInterval = setInterval(() => {
            setCountdown((c) => {
                if (c <= 1) {
                    clearInterval(countdownInterval);
                    beginRecording();
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
    };

    const beginRecording = () => {
        recordingRef.current = {
            landmarks: [],
            timestamps: [],
            startTime: Date.now()
        };
        startRecording(newLabel);

        // Auto-stop after 3 seconds
        setTimeout(() => {
            handleStopRecording();
        }, 3000);
    };

    const handleStopRecording = () => {
        if (recordingRef.current) {
            const gesture: RecordedGesture = {
                id: `gesture-${Date.now()}`,
                label: newLabel,
                landmarks: recordingRef.current.landmarks,
                timestamps: recordingRef.current.timestamps,
                duration: Date.now() - recordingRef.current.startTime,
                createdAt: Date.now()
            };

            saveRecordedGesture(gesture);
            recordingRef.current = null;
        }
        stopRecording();
        setNewLabel('');
    };

    const exportGestures = () => {
        const data = JSON.stringify(recordedGestures, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'recorded_gestures.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="card space-y-6">
            <h2 className="text-lg font-semibold text-white">Record Custom Gestures</h2>

            {/* Recording form */}
            <div className="space-y-4">
                <div>
                    <label className="mb-2 block text-sm text-gray-400">Gesture Label</label>
                    <input
                        type="text"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="e.g., wave, thumbs_up, peace"
                        disabled={isRecording}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-gray-500 disabled:opacity-50"
                    />
                </div>

                {countdown > 0 && (
                    <div className="py-8 text-center">
                        <div className="text-6xl font-bold text-primary-400">{countdown}</div>
                        <p className="mt-2 text-gray-400">Get ready...</p>
                    </div>
                )}

                {isRecording && countdown === 0 && (
                    <div className="py-8 text-center">
                        <div className="recording-indicator inline-flex items-center text-xl">
                            Recording "{newLabel}"
                        </div>
                        <p className="mt-2 text-gray-400">Perform your gesture now</p>
                    </div>
                )}

                <button
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    disabled={countdown > 0}
                    className={`btn w-full ${isRecording ? 'bg-red-600 hover:bg-red-500' : 'btn-primary'}`}
                >
                    {isRecording ? '⏹ Stop Recording' : '⏺ Start Recording (3s)'}
                </button>
            </div>

            {/* Recorded gestures list */}
            <div>
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-medium uppercase tracking-wider text-gray-400">
                        Recorded Gestures ({recordedGestures.length})
                    </h3>
                    {recordedGestures.length > 0 && (
                        <button onClick={exportGestures} className="btn btn-secondary text-sm">
                            📥 Export
                        </button>
                    )}
                </div>

                {recordedGestures.length === 0 ? (
                    <div className="py-6 text-center text-gray-500">
                        <div className="mb-2 text-3xl">🎥</div>
                        <p>No gestures recorded yet</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recordedGestures.map((gesture) => (
                            <div
                                key={gesture.id}
                                className="flex items-center justify-between rounded-xl bg-white/5 p-3"
                            >
                                <div>
                                    <div className="font-medium text-white">{gesture.label}</div>
                                    <div className="text-xs text-gray-400">
                                        {gesture.landmarks.length} frames • {gesture.duration}ms
                                    </div>
                                </div>
                                <button
                                    onClick={() => deleteRecordedGesture(gesture.id)}
                                    className="rounded p-1 text-gray-400 hover:bg-red-500/20 hover:text-red-400"
                                    aria-label="Delete gesture"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="rounded-xl bg-primary-500/10 p-4 text-sm text-primary-300">
                <strong>How to record:</strong>
                <ol className="mt-2 list-inside list-decimal space-y-1 text-gray-400">
                    <li>Enter a unique label for your gesture</li>
                    <li>Click Start Recording</li>
                    <li>After the countdown, perform your gesture</li>
                    <li>Recording stops automatically after 3 seconds</li>
                    <li>Export gestures to train a custom model</li>
                </ol>
            </div>
        </div>
    );
}
