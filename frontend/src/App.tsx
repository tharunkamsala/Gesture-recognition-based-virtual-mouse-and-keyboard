import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from './store/useAppStore';

// Components
import WebcamCapture from './components/WebcamCapture';
import ControlPanel from './components/ControlPanel';
import GestureMappingPanel from './components/GestureMappingPanel';
import SettingsPanel from './components/SettingsPanel';
import RecordingPanel from './components/RecordingPanel';
import StatusBar from './components/StatusBar';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import DebugOverlay from './components/DebugOverlay';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import CalibrationWizard from './components/CalibrationWizard';
import MacroRecorder from './components/MacroRecorder';

function App() {
    const {
        activePanel,
        setActivePanel,
        settings,
    } = useAppStore();

    // Keyboard state
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [controlActive, setControlActive] = useState(true);
    const [showCalibration, setShowCalibration] = useState(false);

    // Check if first time user (show calibration)
    useEffect(() => {
        const hasCalibrated = localStorage.getItem('gestureflow-calibration');
        const hasSeenWelcome = localStorage.getItem('gestureflow-welcomed');
        if (!hasCalibrated && !hasSeenWelcome) {
            // Show welcome prompt after a short delay
            const timer = setTimeout(() => {
                if (confirm('Welcome to GestureFlow! Would you like to calibrate your gesture space for better accuracy?')) {
                    setShowCalibration(true);
                }
                localStorage.setItem('gestureflow-welcomed', 'true');
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    // Handle keyboard key press - send to backend
    const handleKeyPress = useCallback((key: string) => {
        // Send key press via WebSocket (handled by WebcamCapture)
        const event = new CustomEvent('gesture-keypress', { detail: { key } });
        window.dispatchEvent(event);
    }, []);

    // Listen for keyboard toggle events from WebSocket
    useEffect(() => {
        const handleShowKeyboard = () => setShowKeyboard(true);
        const handleControlStopped = () => setControlActive(false);

        window.addEventListener('show-keyboard', handleShowKeyboard);
        window.addEventListener('control-stopped', handleControlStopped);

        return () => {
            window.removeEventListener('show-keyboard', handleShowKeyboard);
            window.removeEventListener('control-stopped', handleControlStopped);
        };
    }, []);

    // Apply accessibility settings
    useEffect(() => {
        const root = document.documentElement;
        if (settings.accessibility.highContrast) {
            root.classList.add('high-contrast');
        } else {
            root.classList.remove('high-contrast');
        }

        if (settings.accessibility.reducedMotion) {
            root.style.setProperty('--animation-duration', '0s');
        } else {
            root.style.removeProperty('--animation-duration');
        }
    }, [settings.accessibility]);

    const handleCalibrationComplete = () => {
        setShowCalibration(false);
    };

    const navItems = [
        { id: 'detection', label: 'Detection', icon: '👁️' },
        { id: 'mappings', label: 'Mappings', icon: '⚡' },
        { id: 'analytics', label: 'Analytics', icon: '📊' },
        { id: 'macros', label: 'Macros', icon: '🎬' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
        { id: 'recording', label: 'Record', icon: '🎥' },
    ] as const;

    return (
        <div className={`min-h-screen ${settings.accessibility.largeButtons ? 'text-lg' : ''}`}>
            {/* Skip link for accessibility */}
            <a href="#main-content" className="skip-link">
                Skip to main content
            </a>

            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-white/10 bg-gray-950/80 backdrop-blur-xl">
                <div className="mx-auto max-w-7xl px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-xl">
                                ✋
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">GestureFlow</h1>
                                <p className="text-xs text-gray-400">Gesture Recognition System</p>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="flex gap-1 flex-wrap" role="navigation" aria-label="Main navigation">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActivePanel(item.id as any)}
                                    className={`btn ${activePanel === item.id
                                        ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                                        : 'btn-secondary'
                                        } ${settings.accessibility.largeButtons ? 'btn-large' : ''}`}
                                    aria-current={activePanel === item.id ? 'page' : undefined}
                                >
                                    <span aria-hidden="true">{item.icon}</span>
                                    <span className="hidden sm:inline">{item.label}</span>
                                </button>
                            ))}
                        </nav>

                        {/* Calibration Button */}
                        <button
                            onClick={() => setShowCalibration(true)}
                            className="hidden lg:flex items-center gap-2 text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
                        >
                            🎯 Calibrate
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main id="main-content" className="mx-auto max-w-7xl px-4 py-8">
                <div className="grid gap-8 lg:grid-cols-[1fr,400px]">
                    {/* Left Column - Webcam */}
                    <div className="space-y-6">
                        <WebcamCapture />
                        <ControlPanel />
                    </div>

                    {/* Right Column - Panels */}
                    <div className="space-y-6">
                        {activePanel === 'detection' && <ControlPanel showDetailed />}
                        {activePanel === 'mappings' && <GestureMappingPanel />}
                        {activePanel === 'analytics' && <AnalyticsDashboard />}
                        {activePanel === 'macros' && <MacroRecorder />}
                        {activePanel === 'settings' && <SettingsPanel />}
                        {activePanel === 'recording' && <RecordingPanel />}
                    </div>
                </div>
            </main>

            {/* Status Bar */}
            <StatusBar />

            {/* Debug Overlay - controlled by settings toggle */}
            <DebugOverlay />

            {/* Virtual Keyboard Overlay */}
            <VirtualKeyboard
                isVisible={showKeyboard}
                onClose={() => setShowKeyboard(false)}
                onKeyPress={handleKeyPress}
            />

            {/* Calibration Wizard */}
            {showCalibration && (
                <CalibrationWizard
                    onComplete={handleCalibrationComplete}
                    onCancel={() => setShowCalibration(false)}
                />
            )}

            {/* Control Status & Emergency Stop */}
            <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
                {/* Status Indicator */}
                <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${controlActive
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${controlActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    {controlActive ? 'Control Active' : 'Control Paused'}
                </div>

                {/* Emergency Stop */}
                {controlActive && (
                    <button
                        onClick={() => {
                            setControlActive(false);
                            window.dispatchEvent(new CustomEvent('emergency-stop'));
                        }}
                        className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors flex items-center gap-2 shadow-lg"
                    >
                        🛑 STOP
                    </button>
                )}
            </div>
        </div>
    );
}

export default App;

