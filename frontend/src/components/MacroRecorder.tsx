import { useState, useEffect, useRef } from 'react';

interface MacroAction {
    type: 'click' | 'key' | 'scroll' | 'delay' | 'type';
    params: Record<string, any>;
    timestamp: number;
}

interface Macro {
    id: string;
    name: string;
    description: string;
    triggerGesture: string;
    actions: MacroAction[];
    createdAt: number;
    enabled: boolean;
}

export default function MacroRecorder() {
    const [macros, setMacros] = useState<Macro[]>(() => {
        const saved = localStorage.getItem('gestureflow-macros');
        return saved ? JSON.parse(saved) : [];
    });

    const [isRecording, setIsRecording] = useState(false);
    const [recordedActions, setRecordedActions] = useState<MacroAction[]>([]);
    const [macroName, setMacroName] = useState('');
    const [triggerGesture, setTriggerGesture] = useState('victory');
    const [showEditor, setShowEditor] = useState(false);
    const [editingMacro, setEditingMacro] = useState<Macro | null>(null);

    const recordingStartTime = useRef<number>(0);

    // Save macros to localStorage
    useEffect(() => {
        localStorage.setItem('gestureflow-macros', JSON.stringify(macros));
    }, [macros]);

    // Record keyboard/mouse events when recording
    useEffect(() => {
        if (!isRecording) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input
            if ((e.target as HTMLElement).tagName === 'INPUT') return;

            setRecordedActions(prev => [...prev, {
                type: 'key',
                params: {
                    key: e.key,
                    modifiers: {
                        ctrl: e.ctrlKey,
                        alt: e.altKey,
                        shift: e.shiftKey,
                        meta: e.metaKey
                    }
                },
                timestamp: Date.now() - recordingStartTime.current
            }]);
        };

        const handleClick = (e: MouseEvent) => {
            setRecordedActions(prev => [...prev, {
                type: 'click',
                params: {
                    button: e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle',
                    x: e.clientX,
                    y: e.clientY
                },
                timestamp: Date.now() - recordingStartTime.current
            }]);
        };

        const handleScroll = () => {
            setRecordedActions(prev => [...prev, {
                type: 'scroll',
                params: { direction: 'down', amount: 3 },
                timestamp: Date.now() - recordingStartTime.current
            }]);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('click', handleClick);
        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('click', handleClick);
            window.removeEventListener('scroll', handleScroll);
        };
    }, [isRecording]);

    const startRecording = () => {
        setRecordedActions([]);
        recordingStartTime.current = Date.now();
        setIsRecording(true);
    };

    const stopRecording = () => {
        setIsRecording(false);
        if (recordedActions.length > 0) {
            setShowEditor(true);
        }
    };

    const saveMacro = () => {
        if (!macroName.trim()) {
            alert('Please enter a macro name');
            return;
        }

        const newMacro: Macro = {
            id: `macro-${Date.now()}`,
            name: macroName,
            description: `${recordedActions.length} actions`,
            triggerGesture,
            actions: recordedActions,
            createdAt: Date.now(),
            enabled: true
        };

        setMacros(prev => [...prev, newMacro]);
        setShowEditor(false);
        setMacroName('');
        setRecordedActions([]);
    };

    const deleteMacro = (id: string) => {
        if (confirm('Delete this macro?')) {
            setMacros(prev => prev.filter(m => m.id !== id));
        }
    };

    const toggleMacro = (id: string) => {
        setMacros(prev => prev.map(m =>
            m.id === id ? { ...m, enabled: !m.enabled } : m
        ));
    };

    const playMacro = async (macro: Macro) => {
        // Send macro to backend for execution
        try {
            await fetch('http://localhost:8000/macro/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actions: macro.actions })
            });
        } catch (e) {
            console.error('Failed to execute macro:', e);
        }
    };

    const addManualAction = (type: MacroAction['type']) => {
        const action: MacroAction = {
            type,
            params: type === 'delay' ? { ms: 500 } : type === 'type' ? { text: '' } : {},
            timestamp: recordedActions.length > 0
                ? recordedActions[recordedActions.length - 1].timestamp + 100
                : 0
        };
        setRecordedActions(prev => [...prev, action]);
    };

    const updateActionParams = (index: number, params: Record<string, any>) => {
        setRecordedActions(prev => prev.map((a, i) =>
            i === index ? { ...a, params: { ...a.params, ...params } } : a
        ));
    };

    const removeAction = (index: number) => {
        setRecordedActions(prev => prev.filter((_, i) => i !== index));
    };

    const availableGestures = [
        { id: 'victory', label: '✌️ Victory' },
        { id: 'thumbs_up', label: '👍 Thumbs Up' },
        { id: 'thumbs_down', label: '👎 Thumbs Down' },
        { id: 'two_finger_pinch', label: '🤏 Two Finger Pinch' },
        { id: 'rock', label: '🤘 Rock' },
        { id: 'call', label: '🤙 Call' },
    ];

    return (
        <div className="card space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">🎬 Macro Recorder</h2>
                {!isRecording && !showEditor && (
                    <button
                        onClick={startRecording}
                        className="btn bg-red-600 hover:bg-red-500 text-white px-4 py-2 flex items-center gap-2"
                    >
                        <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
                        Record
                    </button>
                )}
            </div>

            {/* Recording Mode */}
            {isRecording && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-red-400 font-medium">Recording...</span>
                        <span className="text-gray-400 text-sm">
                            {recordedActions.length} actions captured
                        </span>
                    </div>

                    <p className="text-sm text-gray-400">
                        Perform actions (clicks, keypresses, scrolls) to record them.
                    </p>

                    {/* Live action list */}
                    <div className="max-h-32 overflow-y-auto space-y-1">
                        {recordedActions.slice(-5).map((action, i) => (
                            <div key={i} className="text-xs text-gray-400 flex items-center gap-2">
                                <span className="text-gray-500">{(action.timestamp / 1000).toFixed(1)}s</span>
                                <span className="capitalize">{action.type}</span>
                                {action.type === 'key' && (
                                    <span className="text-white">{action.params.key}</span>
                                )}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={stopRecording}
                        className="btn w-full bg-gray-700 hover:bg-gray-600 text-white"
                    >
                        Stop Recording
                    </button>
                </div>
            )}

            {/* Macro Editor */}
            {showEditor && (
                <div className="bg-primary-900/20 border border-primary-500/30 rounded-xl p-4 space-y-4">
                    <h3 className="font-medium text-white">Save Macro</h3>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Macro Name</label>
                        <input
                            type="text"
                            value={macroName}
                            onChange={(e) => setMacroName(e.target.value)}
                            placeholder="e.g., Copy and Paste"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Trigger Gesture</label>
                        <select
                            value={triggerGesture}
                            onChange={(e) => setTriggerGesture(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                        >
                            {availableGestures.map(g => (
                                <option key={g.id} value={g.id}>{g.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Action list */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">Actions ({recordedActions.length})</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => addManualAction('delay')}
                                    className="text-xs px-2 py-1 bg-white/5 rounded hover:bg-white/10"
                                >
                                    + Delay
                                </button>
                                <button
                                    onClick={() => addManualAction('type')}
                                    className="text-xs px-2 py-1 bg-white/5 rounded hover:bg-white/10"
                                >
                                    + Text
                                </button>
                            </div>
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1 bg-black/20 rounded-lg p-2">
                            {recordedActions.map((action, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs p-1 rounded hover:bg-white/5">
                                    <span className="text-gray-500 w-8">{i + 1}.</span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${action.type === 'click' ? 'bg-blue-500/20 text-blue-400' :
                                            action.type === 'key' ? 'bg-green-500/20 text-green-400' :
                                                action.type === 'delay' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-purple-500/20 text-purple-400'
                                        }`}>
                                        {action.type}
                                    </span>
                                    {action.type === 'key' && (
                                        <span className="text-white">{action.params.key}</span>
                                    )}
                                    {action.type === 'delay' && (
                                        <input
                                            type="number"
                                            value={action.params.ms}
                                            onChange={(e) => updateActionParams(i, { ms: Number(e.target.value) })}
                                            className="w-16 bg-white/5 rounded px-1 text-white"
                                        />
                                    )}
                                    {action.type === 'type' && (
                                        <input
                                            type="text"
                                            value={action.params.text || ''}
                                            onChange={(e) => updateActionParams(i, { text: e.target.value })}
                                            placeholder="text..."
                                            className="flex-1 bg-white/5 rounded px-1 text-white"
                                        />
                                    )}
                                    <button
                                        onClick={() => removeAction(i)}
                                        className="text-gray-500 hover:text-red-400 ml-auto"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={saveMacro}
                            className="btn flex-1 bg-green-600 hover:bg-green-500 text-white"
                        >
                            💾 Save Macro
                        </button>
                        <button
                            onClick={() => {
                                setShowEditor(false);
                                setRecordedActions([]);
                            }}
                            className="btn bg-gray-700 hover:bg-gray-600 text-white"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Saved Macros List */}
            {!isRecording && !showEditor && (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-400">Saved Macros</h3>

                    {macros.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <div className="text-4xl mb-2">🎬</div>
                            <p>No macros yet</p>
                            <p className="text-sm">Click "Record" to create your first macro</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {macros.map(macro => (
                                <div
                                    key={macro.id}
                                    className={`bg-white/5 rounded-lg p-3 ${!macro.enabled ? 'opacity-50' : ''
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-white">{macro.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {macro.actions.length} actions • Trigger: {macro.triggerGesture}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => playMacro(macro)}
                                                className="text-primary-400 hover:text-primary-300 p-1"
                                                title="Play"
                                            >
                                                ▶️
                                            </button>
                                            <button
                                                onClick={() => toggleMacro(macro.id)}
                                                className={`p-1 ${macro.enabled ? 'text-green-400' : 'text-gray-500'}`}
                                                title={macro.enabled ? 'Disable' : 'Enable'}
                                            >
                                                {macro.enabled ? '✓' : '○'}
                                            </button>
                                            <button
                                                onClick={() => deleteMacro(macro.id)}
                                                className="text-gray-500 hover:text-red-400 p-1"
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Info */}
            <div className="text-xs text-gray-500 border-t border-gray-700 pt-4">
                💡 Tip: Macros let you record multiple actions and bind them to a single gesture.
            </div>
        </div>
    );
}
