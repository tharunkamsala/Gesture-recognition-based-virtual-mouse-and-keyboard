/**
 * ActionMapper - Maps gestures to system actions
 * Supports both in-browser simulation and native connector
 */

import CryptoJS from 'crypto-js';
import type {
    Action,
    GestureResult,
    GestureMapping,
    SignedMessage,
    Landmark,
} from '../types';

type ActionCallback = (action: Action, gesture: GestureResult) => void;

interface ActionMapperConfig {
    useNativeConnector: boolean;
    nativeConnectorUrl: string;
    signatureSecret: string;
    onAction?: ActionCallback;
    onError?: (error: Error) => void;
}

export class ActionMapper {
    private config: ActionMapperConfig;
    private ws: WebSocket | null = null;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private isConnected: boolean = false;
    private pendingActions: SignedMessage[] = [];

    // Mouse state for drag operations
    private isDragging: boolean = false;
    private lastMousePosition: { x: number; y: number } = { x: 0, y: 0 };

    constructor(config: ActionMapperConfig) {
        this.config = config;
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<ActionMapperConfig>) {
        this.config = { ...this.config, ...config };

        if (config.useNativeConnector !== undefined) {
            if (config.useNativeConnector) {
                this.connect();
            } else {
                this.disconnect();
            }
        }
    }

    /**
     * Connect to native connector WebSocket
     */
    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            this.ws = new WebSocket(this.config.nativeConnectorUrl);

            this.ws.onopen = () => {
                this.isConnected = true;
                console.log('[ActionMapper] Connected to native connector');

                // Send pending actions
                while (this.pendingActions.length > 0) {
                    const msg = this.pendingActions.shift();
                    if (msg) {
                        this.ws?.send(JSON.stringify(msg));
                    }
                }
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                console.log('[ActionMapper] Disconnected from native connector');
                this.scheduleReconnect();
            };

            this.ws.onerror = (event) => {
                console.error('[ActionMapper] WebSocket error:', event);
                this.config.onError?.(new Error('WebSocket connection error'));
            };

            this.ws.onmessage = (event) => {
                try {
                    const response = JSON.parse(event.data);
                    console.log('[ActionMapper] Response:', response);
                } catch {
                    console.log('[ActionMapper] Raw message:', event.data);
                }
            };
        } catch (error) {
            console.error('[ActionMapper] Connection failed:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Disconnect from native connector
     */
    disconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.isConnected = false;
    }

    /**
     * Schedule reconnection attempt
     */
    private scheduleReconnect() {
        if (this.reconnectTimeout) return;

        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            if (this.config.useNativeConnector) {
                this.connect();
            }
        }, 3000);
    }

    /**
     * Execute action for a gesture
     */
    executeAction(mapping: GestureMapping, gesture: GestureResult): boolean {
        const { action } = mapping;

        if (action.type === 'none') {
            return true;
        }

        // Callback for UI feedback
        this.config.onAction?.(action, gesture);

        // Execute based on mode
        if (this.config.useNativeConnector) {
            return this.executeNativeAction(action);
        } else {
            return this.executeBrowserAction(action, gesture);
        }
    }

    /**
     * Execute action via native connector
     */
    private executeNativeAction(action: Action): boolean {
        const message = this.createSignedMessage(action);

        if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            return true;
        } else {
            // Queue for later
            this.pendingActions.push(message);
            if (this.pendingActions.length > 10) {
                this.pendingActions.shift(); // Prevent queue overflow
            }
            return false;
        }
    }

    /**
     * Create signed message for native connector
     */
    private createSignedMessage(action: Action): SignedMessage {
        const payload = {
            action,
            timestamp: Date.now(),
            nonce: this.generateNonce(),
        };

        const payloadString = JSON.stringify(payload);
        const signature = CryptoJS.HmacSHA256(
            payloadString,
            this.config.signatureSecret
        ).toString(CryptoJS.enc.Hex);

        return { payload, signature };
    }

    /**
     * Generate random nonce
     */
    private generateNonce(): string {
        return CryptoJS.lib.WordArray.random(16).toString();
    }

    /**
     * Execute action in browser (simulated events)
     */
    private executeBrowserAction(action: Action, gesture: GestureResult): boolean {
        try {
            switch (action.type) {
                case 'keyboard':
                    this.simulateKeyboard(action.keys, action.modifiers);
                    break;

                case 'mouse_click':
                    this.simulateMouseClick(action.button, action.clickType);
                    break;

                case 'mouse_scroll':
                    this.simulateMouseScroll(action.direction, action.speed);
                    break;

                case 'mouse_move':
                    this.simulateMouseMove(gesture.landmarks, action.speed);
                    break;

                case 'mouse_drag':
                    this.simulateMouseDrag(gesture.landmarks, action.button);
                    break;

                case 'command':
                    console.log('[ActionMapper] Command:', action.command);
                    // Commands require native connector
                    break;
            }
            return true;
        } catch (error) {
            console.error('[ActionMapper] Browser action failed:', error);
            return false;
        }
    }

    /**
     * Simulate keyboard event
     */
    private simulateKeyboard(keys: string[], modifiers?: string[]) {
        const activeElement = document.activeElement as HTMLElement;

        keys.forEach((key) => {
            const eventInit: KeyboardEventInit = {
                key,
                code: this.getKeyCode(key),
                keyCode: this.getKeyCodeNumber(key),
                which: this.getKeyCodeNumber(key),
                bubbles: true,
                cancelable: true,
                ctrlKey: modifiers?.includes('ctrl'),
                altKey: modifiers?.includes('alt'),
                shiftKey: modifiers?.includes('shift'),
                metaKey: modifiers?.includes('meta'),
            };

            activeElement?.dispatchEvent(new KeyboardEvent('keydown', eventInit));
            activeElement?.dispatchEvent(new KeyboardEvent('keyup', eventInit));
        });
    }

    /**
     * Simulate mouse click
     */
    private simulateMouseClick(
        button: 'left' | 'right' | 'middle',
        clickType: 'single' | 'double'
    ) {
        const buttonNum = button === 'left' ? 0 : button === 'right' ? 2 : 1;

        const eventInit: MouseEventInit = {
            bubbles: true,
            cancelable: true,
            button: buttonNum,
            clientX: this.lastMousePosition.x,
            clientY: this.lastMousePosition.y,
        };

        const target = document.elementFromPoint(
            this.lastMousePosition.x,
            this.lastMousePosition.y
        ) || document.body;

        target.dispatchEvent(new MouseEvent('mousedown', eventInit));
        target.dispatchEvent(new MouseEvent('mouseup', eventInit));
        target.dispatchEvent(new MouseEvent('click', eventInit));

        if (clickType === 'double') {
            target.dispatchEvent(new MouseEvent('dblclick', eventInit));
        }
    }

    /**
     * Simulate mouse scroll
     */
    private simulateMouseScroll(
        direction: 'up' | 'down' | 'left' | 'right',
        speed: number
    ) {
        const deltaMultiplier = 100 * speed;

        let deltaX = 0;
        let deltaY = 0;

        switch (direction) {
            case 'up':
                deltaY = -deltaMultiplier;
                break;
            case 'down':
                deltaY = deltaMultiplier;
                break;
            case 'left':
                deltaX = -deltaMultiplier;
                break;
            case 'right':
                deltaX = deltaMultiplier;
                break;
        }

        window.scrollBy({
            left: deltaX,
            top: deltaY,
            behavior: 'smooth',
        });
    }

    /**
     * Simulate mouse move based on hand position
     */
    private simulateMouseMove(landmarks: Landmark[], speed: number) {
        // Use index finger tip as cursor position
        const indexTip = landmarks[8];

        // Map normalized coordinates to screen
        const x = indexTip.x * window.innerWidth;
        const y = indexTip.y * window.innerHeight;

        // Apply smoothing
        const smoothedX = this.lastMousePosition.x + (x - this.lastMousePosition.x) * speed;
        const smoothedY = this.lastMousePosition.y + (y - this.lastMousePosition.y) * speed;

        this.lastMousePosition = { x: smoothedX, y: smoothedY };

        // Dispatch mousemove event
        const target = document.elementFromPoint(smoothedX, smoothedY) || document.body;
        target.dispatchEvent(
            new MouseEvent('mousemove', {
                bubbles: true,
                cancelable: true,
                clientX: smoothedX,
                clientY: smoothedY,
            })
        );
    }

    /**
     * Simulate mouse drag
     */
    private simulateMouseDrag(landmarks: Landmark[], button: 'left' | 'right') {
        const indexTip = landmarks[8];
        const x = indexTip.x * window.innerWidth;
        const y = indexTip.y * window.innerHeight;

        const buttonNum = button === 'left' ? 0 : 2;

        if (!this.isDragging) {
            // Start drag
            this.isDragging = true;
            const target = document.elementFromPoint(x, y) || document.body;
            target.dispatchEvent(
                new MouseEvent('mousedown', {
                    bubbles: true,
                    cancelable: true,
                    button: buttonNum,
                    clientX: x,
                    clientY: y,
                })
            );
        }

        // Continue drag
        const target = document.elementFromPoint(x, y) || document.body;
        target.dispatchEvent(
            new MouseEvent('mousemove', {
                bubbles: true,
                cancelable: true,
                buttons: button === 'left' ? 1 : 2,
                clientX: x,
                clientY: y,
            })
        );

        this.lastMousePosition = { x, y };
    }

    /**
     * End drag operation
     */
    endDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            const target =
                document.elementFromPoint(
                    this.lastMousePosition.x,
                    this.lastMousePosition.y
                ) || document.body;

            target.dispatchEvent(
                new MouseEvent('mouseup', {
                    bubbles: true,
                    cancelable: true,
                    clientX: this.lastMousePosition.x,
                    clientY: this.lastMousePosition.y,
                })
            );
        }
    }

    /**
     * Get key code for key string
     */
    private getKeyCode(key: string): string {
        const codeMap: Record<string, string> = {
            Enter: 'Enter',
            Escape: 'Escape',
            Space: 'Space',
            ArrowUp: 'ArrowUp',
            ArrowDown: 'ArrowDown',
            ArrowLeft: 'ArrowLeft',
            ArrowRight: 'ArrowRight',
            Backspace: 'Backspace',
            Tab: 'Tab',
        };

        return codeMap[key] || `Key${key.toUpperCase()}`;
    }

    /**
     * Get numeric key code
     */
    private getKeyCodeNumber(key: string): number {
        const codeMap: Record<string, number> = {
            Enter: 13,
            Escape: 27,
            Space: 32,
            ArrowUp: 38,
            ArrowDown: 40,
            ArrowLeft: 37,
            ArrowRight: 39,
            Backspace: 8,
            Tab: 9,
        };

        if (codeMap[key]) return codeMap[key];
        if (key.length === 1) return key.toUpperCase().charCodeAt(0);
        return 0;
    }

    /**
     * Get connection status
     */
    getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
        if (!this.config.useNativeConnector) return 'disconnected';
        if (this.isConnected) return 'connected';
        if (this.ws?.readyState === WebSocket.CONNECTING) return 'connecting';
        return 'disconnected';
    }

    /**
     * Cleanup
     */
    destroy() {
        this.disconnect();
        this.isDragging = false;
        this.pendingActions = [];
    }
}
