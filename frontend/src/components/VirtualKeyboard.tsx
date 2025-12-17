import React, { useState, useEffect, useCallback } from 'react';

interface VirtualKeyboardProps {
    isVisible: boolean;
    onClose: () => void;
    onKeyPress: (key: string) => void;
    cursorPosition?: { x: number; y: number };
}

const KEYBOARD_LAYOUT = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
    ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Backspace'],
    ['Ctrl', 'Alt', 'Space', 'Esc']
];

const getKeyWidth = (key: string): string => {
    switch (key) {
        case 'Space': return 'w-48';
        case 'Enter': return 'w-20';
        case 'Backspace': return 'w-24';
        case 'Shift': return 'w-20';
        default: return 'w-12';
    }
};

const getKeyLabel = (key: string, isShiftActive: boolean): string => {
    if (key === 'Space') return '␣';
    if (key === 'Backspace') return '⌫';
    if (key === 'Enter') return '↵';
    if (key === 'Esc') return 'Esc';
    if (isShiftActive && key.length === 1) {
        return key.toUpperCase();
    }
    return key;
};

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
    isVisible,
    onClose,
    onKeyPress,
    cursorPosition
}) => {
    const [isShiftActive, setIsShiftActive] = useState(false);
    const [hoveredKey, setHoveredKey] = useState<string | null>(null);
    const [lastPressedKey, setLastPressedKey] = useState<string | null>(null);

    // Detect which key the cursor is hovering over
    useEffect(() => {
        if (!isVisible || !cursorPosition) return;

        // Find the key element under cursor position
        const element = document.elementFromPoint(cursorPosition.x, cursorPosition.y);
        if (element && element.hasAttribute('data-key')) {
            const key = element.getAttribute('data-key');
            setHoveredKey(key);
        } else {
            setHoveredKey(null);
        }
    }, [cursorPosition, isVisible]);

    const handleKeyClick = useCallback((key: string) => {
        setLastPressedKey(key);
        setTimeout(() => setLastPressedKey(null), 150);

        if (key === 'Shift') {
            setIsShiftActive(!isShiftActive);
            return;
        }

        if (key === 'Esc') {
            onClose();
            return;
        }

        let keyToSend = key;
        if (isShiftActive && key.length === 1) {
            keyToSend = key.toUpperCase();
            setIsShiftActive(false);
        }

        onKeyPress(keyToSend);
    }, [isShiftActive, onClose, onKeyPress]);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-slideUp">
            {/* Keyboard container */}
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-gray-700/50">
                {/* Header */}
                <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-400 text-sm font-medium">
                        ⌨️ Virtual Keyboard
                    </span>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-1 rounded"
                    >
                        ✕
                    </button>
                </div>

                {/* Keyboard rows */}
                <div className="flex flex-col gap-1.5">
                    {KEYBOARD_LAYOUT.map((row, rowIndex) => (
                        <div key={rowIndex} className="flex justify-center gap-1.5">
                            {row.map((key) => {
                                const isHovered = hoveredKey === key;
                                const isPressed = lastPressedKey === key;
                                const isActive = key === 'Shift' && isShiftActive;

                                return (
                                    <button
                                        key={key}
                                        data-key={key}
                                        onClick={() => handleKeyClick(key)}
                                        className={`
                                            ${getKeyWidth(key)} h-12
                                            flex items-center justify-center
                                            rounded-lg font-medium text-sm
                                            transition-all duration-100
                                            ${isPressed
                                                ? 'bg-blue-500 text-white scale-95'
                                                : isHovered
                                                    ? 'bg-blue-600/80 text-white ring-2 ring-blue-400 shadow-lg shadow-blue-500/30'
                                                    : isActive
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                                            }
                                        `}
                                    >
                                        {getKeyLabel(key, isShiftActive)}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Instructions */}
                <div className="mt-3 text-center text-xs text-gray-500">
                    Move cursor over key, then <span className="text-blue-400">pinch</span> to type
                </div>
            </div>
        </div>
    );
};

export default VirtualKeyboard;
