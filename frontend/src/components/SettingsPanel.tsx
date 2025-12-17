import { useAppStore } from '../store/useAppStore';
import { useState, useEffect } from 'react';

interface MouseSettings {
    mode: 'relative' | 'absolute' | 'fingertip';
    sensitivity: number;
    smoothing: number;
    deadzone: number;
    relative_speed: number;
    enabled: boolean;
}

export default function SettingsPanel() {
    const {
        settings,
        updateCalibration,
        updateDetection,
        updateAccessibility,
        updateSettings
    } = useAppStore();

    // Local state for backend settings
    const [mouseMode, setMouseMode] = useState<'relative' | 'absolute' | 'fingertip'>('relative');
    const [relativeSpeed, setRelativeSpeed] = useState(20);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [soundVolume, setSoundVolume] = useState(0.3); // Low volume for peaceful feedback
    const [debugMode, setDebugMode] = useState(false);
    const [fatigueEnabled, setFatigueEnabled] = useState(true);
    const [sessionTime, setSessionTime] = useState(0);
    const [breakReminder, setBreakReminder] = useState(30); // minutes
    const [lowPowerMode, setLowPowerMode] = useState(false); // Reduce CPU usage

    // Load settings from backend on mount
    useEffect(() => {
        fetch('http://localhost:8000/settings/mouse')
            .then(res => res.json())
            .then((data: MouseSettings) => {
                if (data.mode) setMouseMode(data.mode);
                if (data.relative_speed) setRelativeSpeed(data.relative_speed);
            })
            .catch(() => { /* Backend might not be running */ });
    }, []);

    // Session timer for fatigue detection
    useEffect(() => {
        if (!fatigueEnabled) return;
        const interval = setInterval(() => {
            setSessionTime(t => t + 1);
        }, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [fatigueEnabled]);

    // Break reminder alert
    useEffect(() => {
        if (fatigueEnabled && sessionTime > 0 && sessionTime % breakReminder === 0) {
            // Play notification sound if enabled
            if (soundEnabled) {
                playSound('notification');
            }
            alert(`⏰ You've been using gesture control for ${sessionTime} minutes. Consider taking a break!`);
        }
    }, [sessionTime, breakReminder, fatigueEnabled, soundEnabled]);

    const playSound = (type: 'click' | 'scroll' | 'notification') => {
        if (!soundEnabled) return;
        // Using Web Audio API for sounds
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        gainNode.gain.value = soundVolume * 0.3;

        switch (type) {
            case 'click':
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                break;
            case 'scroll':
                oscillator.frequency.value = 400;
                oscillator.type = 'triangle';
                break;
            case 'notification':
                oscillator.frequency.value = 600;
                oscillator.type = 'sine';
                break;
        }

        oscillator.start();
        setTimeout(() => {
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            setTimeout(() => oscillator.stop(), 100);
        }, 50);
    };

    // Update backend when mode changes
    const updateBackendSettings = async (updates: Partial<MouseSettings>) => {
        try {
            await fetch('http://localhost:8000/settings/mouse', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
        } catch (e) {
            console.error('Failed to update backend settings:', e);
        }
    };

    const handleModeChange = (mode: 'relative' | 'absolute' | 'fingertip') => {
        setMouseMode(mode);
        updateBackendSettings({ mode });
        if (soundEnabled) playSound('click');
    };

    const handleRelativeSpeedChange = (speed: number) => {
        setRelativeSpeed(speed);
        updateBackendSettings({ relative_speed: speed });
    };

    const exportConfig = () => {
        const config = {
            settings,
            mouseMode,
            relativeSpeed,
            soundEnabled,
            soundVolume,
            debugMode,
            fatigueEnabled,
            breakReminder
        };
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gestureflow-config.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const importConfig = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const config = JSON.parse(e.target?.result as string);
                    if (config.settings) updateSettings(config.settings);
                    if (config.mouseMode) handleModeChange(config.mouseMode);
                    if (config.relativeSpeed) handleRelativeSpeedChange(config.relativeSpeed);
                    if (config.soundEnabled !== undefined) setSoundEnabled(config.soundEnabled);
                    if (config.soundVolume !== undefined) setSoundVolume(config.soundVolume);
                    if (config.debugMode !== undefined) setDebugMode(config.debugMode);
                    if (config.fatigueEnabled !== undefined) setFatigueEnabled(config.fatigueEnabled);
                    if (config.breakReminder !== undefined) setBreakReminder(config.breakReminder);
                    alert('✅ Configuration imported successfully!');
                } catch (err) {
                    alert('❌ Failed to import configuration');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    return (
        <div className="card space-y-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white sticky top-0 bg-gray-900/95 py-2 -mt-2">
                ⚙️ Settings
            </h2>

            {/* Control Mode - NEW */}
            <section className="bg-gradient-to-r from-primary-900/30 to-accent-900/30 rounded-xl p-4 border border-primary-500/20">
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-primary-400">
                    🎮 Control Mode
                </h3>
                <div className="grid grid-cols-3 gap-2 mb-3">
                    {(['relative', 'absolute', 'fingertip'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => handleModeChange(mode)}
                            className={`p-3 rounded-lg text-center transition-all ${mouseMode === mode
                                ? 'bg-primary-600 text-white ring-2 ring-primary-400'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            <div className="text-xl mb-1">
                                {mode === 'relative' ? '🖱️' : mode === 'absolute' ? '📍' : '👆'}
                            </div>
                            <div className="text-xs font-medium capitalize">{mode}</div>
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-400">
                    {mouseMode === 'relative' && '🖱️ Trackpad mode: Small movements control full screen (most ergonomic)'}
                    {mouseMode === 'absolute' && '📍 Direct mode: Hand position = screen position'}
                    {mouseMode === 'fingertip' && '👆 Fingertip mode: Only finger movement matters (rest hand on desk)'}
                </p>

                {/* Relative Speed - only show for relative mode */}
                {mouseMode === 'relative' && (
                    <div className="mt-4">
                        <label className="mb-2 flex items-center justify-between text-sm text-gray-300">
                            <span>Cursor Speed</span>
                            <span className="text-primary-400">{relativeSpeed}x</span>
                        </label>
                        <input
                            type="range"
                            min="5"
                            max="50"
                            step="1"
                            value={relativeSpeed}
                            onChange={(e) => handleRelativeSpeedChange(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>
                )}
            </section>

            {/* Sound Feedback - NEW */}
            <section>
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">
                    🔊 Sound Feedback
                </h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-sm text-gray-300">Enable Sounds</span>
                            <p className="text-xs text-gray-500">Audio feedback for actions</p>
                        </div>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={soundEnabled}
                                onChange={(e) => setSoundEnabled(e.target.checked)}
                            />
                            <span className="toggle-track" />
                            <span className="toggle-thumb" />
                        </label>
                    </div>

                    {soundEnabled && (
                        <div>
                            <label className="mb-2 flex items-center justify-between text-sm text-gray-300">
                                <span>Volume</span>
                                <span className="text-primary-400">{Math.round(soundVolume * 100)}%</span>
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={soundVolume}
                                onChange={(e) => setSoundVolume(Number(e.target.value))}
                                className="w-full"
                            />
                            <button
                                onClick={() => playSound('click')}
                                className="mt-2 text-xs text-primary-400 hover:text-primary-300"
                            >
                                🔊 Test Sound
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Detection Settings */}
            <section>
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">
                    👁️ Detection
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="mb-2 flex items-center justify-between text-sm text-gray-300">
                            <span>Detection Confidence</span>
                            <span className="text-primary-400">
                                {(settings.detection.minDetectionConfidence * 100).toFixed(0)}%
                            </span>
                        </label>
                        <input
                            type="range"
                            min="0.3"
                            max="0.95"
                            step="0.05"
                            value={settings.detection.minDetectionConfidence}
                            onChange={(e) => updateDetection({ minDetectionConfidence: Number(e.target.value) })}
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label className="mb-2 flex items-center justify-between text-sm text-gray-300">
                            <span>Tracking Confidence</span>
                            <span className="text-primary-400">
                                {(settings.detection.minTrackingConfidence * 100).toFixed(0)}%
                            </span>
                        </label>
                        <input
                            type="range"
                            min="0.3"
                            max="0.95"
                            step="0.05"
                            value={settings.detection.minTrackingConfidence}
                            onChange={(e) => updateDetection({ minTrackingConfidence: Number(e.target.value) })}
                            className="w-full"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Enable Dynamic Gestures</span>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={settings.detection.enableDynamicGestures}
                                onChange={(e) => updateDetection({ enableDynamicGestures: e.target.checked })}
                            />
                            <span className="toggle-track" />
                            <span className="toggle-thumb" />
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Max Hands</span>
                        <select
                            value={settings.detection.maxNumHands}
                            onChange={(e) => updateDetection({ maxNumHands: Number(e.target.value) as 1 | 2 })}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-white"
                        >
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Mouse Control */}
            <section>
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">
                    🖱️ Mouse Control
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="mb-2 flex items-center justify-between text-sm text-gray-300">
                            <span>Sensitivity</span>
                            <span className="text-primary-400">
                                {settings.calibration.sensitivity.toFixed(1)}x
                            </span>
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="10"
                            step="0.5"
                            value={settings.calibration.sensitivity}
                            onChange={(e) => {
                                updateCalibration({ sensitivity: Number(e.target.value) });
                                updateBackendSettings({ sensitivity: Number(e.target.value) });
                            }}
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label className="mb-2 flex items-center justify-between text-sm text-gray-300">
                            <span>Smoothing</span>
                            <span className="text-primary-400">
                                {(settings.calibration.smoothing * 100).toFixed(0)}%
                            </span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="0.95"
                            step="0.05"
                            value={settings.calibration.smoothing}
                            onChange={(e) => {
                                updateCalibration({ smoothing: Number(e.target.value) });
                                updateBackendSettings({ smoothing: Number(e.target.value) });
                            }}
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label className="mb-2 flex items-center justify-between text-sm text-gray-300">
                            <span>Deadzone</span>
                            <span className="text-primary-400">
                                {(settings.calibration.deadzone * 100).toFixed(0)}%
                            </span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="0.2"
                            step="0.01"
                            value={settings.calibration.deadzone}
                            onChange={(e) => {
                                updateCalibration({ deadzone: Number(e.target.value) });
                                updateBackendSettings({ deadzone: Number(e.target.value) });
                            }}
                            className="w-full"
                        />
                    </div>
                </div>
            </section>

            {/* Debug Mode - NEW */}
            <section>
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">
                    🔧 Debug Mode
                </h3>
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-sm text-gray-300">Show Debug Overlay</span>
                        <p className="text-xs text-gray-500">FPS, latency, gesture confidence</p>
                    </div>
                    <label className="toggle">
                        <input
                            type="checkbox"
                            checked={debugMode}
                            onChange={(e) => {
                                setDebugMode(e.target.checked);
                                // Dispatch event to show debug overlay
                                window.dispatchEvent(new CustomEvent('toggle-debug', { detail: e.target.checked }));
                            }}
                        />
                        <span className="toggle-track" />
                        <span className="toggle-thumb" />
                    </label>
                </div>
            </section>

            {/* Low Power Mode - NEW */}
            <section>
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">
                    🔋 Power Saving
                </h3>
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-sm text-gray-300">Low Power Mode</span>
                        <p className="text-xs text-gray-500">15fps instead of 30fps, saves battery</p>
                    </div>
                    <label className="toggle">
                        <input
                            type="checkbox"
                            checked={lowPowerMode}
                            onChange={(e) => {
                                setLowPowerMode(e.target.checked);
                                window.dispatchEvent(new CustomEvent('low-power-mode', { detail: e.target.checked }));
                            }}
                        />
                        <span className="toggle-track" />
                        <span className="toggle-thumb" />
                    </label>
                </div>
                {lowPowerMode && (
                    <div className="mt-2 text-xs text-yellow-400/80 bg-yellow-500/10 rounded-lg p-2">
                        ⚡ Low power mode active - slight increase in latency
                    </div>
                )}
            </section>

            {/* Fatigue Detection - NEW */}
            <section>
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">
                    💪 Fatigue Prevention
                </h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-sm text-gray-300">Break Reminders</span>
                            <p className="text-xs text-gray-500">Alert after extended use</p>
                        </div>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={fatigueEnabled}
                                onChange={(e) => setFatigueEnabled(e.target.checked)}
                            />
                            <span className="toggle-track" />
                            <span className="toggle-thumb" />
                        </label>
                    </div>

                    {fatigueEnabled && (
                        <>
                            <div>
                                <label className="mb-2 flex items-center justify-between text-sm text-gray-300">
                                    <span>Remind every</span>
                                    <span className="text-primary-400">{breakReminder} min</span>
                                </label>
                                <input
                                    type="range"
                                    min="10"
                                    max="60"
                                    step="5"
                                    value={breakReminder}
                                    onChange={(e) => setBreakReminder(Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                            <div className="text-sm text-gray-400 bg-white/5 rounded-lg p-3">
                                ⏱️ Session time: <span className="text-primary-400 font-medium">{sessionTime} min</span>
                                <button
                                    onClick={() => setSessionTime(0)}
                                    className="ml-3 text-xs text-gray-500 hover:text-white"
                                >
                                    Reset
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </section>

            {/* Privacy Mode - NEW */}
            <section>
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">
                    🔒 Privacy
                </h3>
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                        <span className="text-lg">✓</span>
                        <span>All processing happens locally on your device</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        Camera data never leaves your computer. No cloud processing.
                    </p>
                </div>
            </section>

            {/* Accessibility */}
            <section>
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">
                    ♿ Accessibility
                </h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-sm text-gray-300">High Contrast Mode</span>
                            <p className="text-xs text-gray-500">Increase color contrast</p>
                        </div>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={settings.accessibility.highContrast}
                                onChange={(e) => updateAccessibility({ highContrast: e.target.checked })}
                            />
                            <span className="toggle-track" />
                            <span className="toggle-thumb" />
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-sm text-gray-300">Large Buttons</span>
                            <p className="text-xs text-gray-500">Increase touch target size</p>
                        </div>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={settings.accessibility.largeButtons}
                                onChange={(e) => updateAccessibility({ largeButtons: e.target.checked })}
                            />
                            <span className="toggle-track" />
                            <span className="toggle-thumb" />
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-sm text-gray-300">Reduced Motion</span>
                            <p className="text-xs text-gray-500">Disable animations</p>
                        </div>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={settings.accessibility.reducedMotion}
                                onChange={(e) => updateAccessibility({ reducedMotion: e.target.checked })}
                            />
                            <span className="toggle-track" />
                            <span className="toggle-thumb" />
                        </label>
                    </div>
                </div>
            </section>

            {/* Native Connector */}
            <section>
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">
                    🔌 Backend Connection
                </h3>
                <div className="space-y-3">
                    <div>
                        <label className="mb-2 block text-sm text-gray-300">Backend URL</label>
                        <input
                            type="text"
                            value={settings.nativeConnectorUrl}
                            onChange={(e) => updateSettings({ nativeConnectorUrl: e.target.value })}
                            placeholder="ws://localhost:8000/ws"
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-gray-500"
                        />
                    </div>
                </div>
            </section>

            {/* Import/Export - NEW */}
            <section>
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">
                    💾 Configuration
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={exportConfig}
                        className="btn btn-secondary flex items-center justify-center gap-2"
                    >
                        📤 Export
                    </button>
                    <button
                        onClick={importConfig}
                        className="btn btn-secondary flex items-center justify-center gap-2"
                    >
                        📥 Import
                    </button>
                </div>
            </section>

            {/* Reset Button */}
            <button
                onClick={() => {
                    if (confirm('Reset all settings to defaults?')) {
                        window.location.reload();
                    }
                }}
                className="btn btn-secondary w-full"
            >
                🔄 Reset to Defaults
            </button>
        </div>
    );
}
