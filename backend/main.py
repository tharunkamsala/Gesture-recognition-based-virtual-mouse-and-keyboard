"""
GestureFlow Backend API
Receives gestures from frontend and executes system actions
MediaPipe runs in the browser - backend handles mouse/keyboard control only
"""

import asyncio
import json
from typing import Dict, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from actions import ShortcutsManager, MouseController


# Global state
shortcuts = ShortcutsManager()
mouse = MouseController()
control_enabled = True  # Always-on mode by default


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown"""
    yield
    shortcuts.reset()


app = FastAPI(
    title="GestureFlow API",
    description="Gesture-to-action execution API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS - allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Models ====================

class GestureEvent(BaseModel):
    gesture: str
    confidence: float
    hand_x: Optional[float] = None
    hand_y: Optional[float] = None


class GestureMapping(BaseModel):
    gesture: str
    action: str
    params: Dict = {}
    cooldown_ms: int = 500
    min_confidence: float = 0.8
    description: str = ""


class MouseSettings(BaseModel):
    enabled: Optional[bool] = None
    sensitivity: Optional[float] = None
    smoothing: Optional[float] = None
    deadzone: Optional[float] = None
    mode: Optional[str] = None  # 'absolute', 'relative', 'fingertip'
    relative_speed: Optional[float] = None


# ==================== Connection Manager ====================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections[:]:
            try:
                await connection.send_json(message)
            except:
                self.disconnect(connection)


manager = ConnectionManager()


# ==================== REST Endpoints ====================

@app.get("/")
async def root():
    return {"status": "ok", "service": "GestureFlow API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "control_enabled": control_enabled}


@app.post("/control/enable")
async def enable_control(enabled: bool = True):
    global control_enabled
    control_enabled = enabled
    if not enabled:
        shortcuts.reset()
    return {"status": "ok", "control_enabled": enabled}


@app.get("/mappings")
async def get_mappings():
    return shortcuts.get_all_mappings()


@app.post("/mappings")
async def update_mapping(mapping: GestureMapping):
    shortcuts.update_gesture_mapping(
        gesture=mapping.gesture,
        action=mapping.action,
        params=mapping.params,
        cooldown_ms=mapping.cooldown_ms,
        min_confidence=mapping.min_confidence,
        description=mapping.description
    )
    return {"status": "ok"}


@app.delete("/mappings/{gesture}")
async def delete_mapping(gesture: str):
    shortcuts.remove_gesture_mapping(gesture)
    return {"status": "ok"}


@app.get("/settings/mouse")
async def get_mouse_settings():
    return shortcuts.get_mouse_settings()


@app.put("/settings/mouse")
async def update_mouse_settings(settings: MouseSettings):
    shortcuts.update_mouse_settings(
        enabled=settings.enabled,
        sensitivity=settings.sensitivity,
        smoothing=settings.smoothing,
        deadzone=settings.deadzone,
        mode=settings.mode,
        relative_speed=settings.relative_speed
    )
    return {"status": "ok"}


@app.post("/gesture")
async def handle_gesture(event: GestureEvent):
    """Handle gesture from frontend and execute action"""
    global control_enabled
    
    if not control_enabled:
        return {"executed": False, "reason": "control_disabled"}
    
    # Move mouse if hand position provided
    if event.hand_x is not None and event.hand_y is not None:
        mouse_settings = shortcuts.get_mouse_settings()
        if mouse_settings.get("enabled", True):
            mouse.move_from_normalized(event.hand_x, event.hand_y)
    
    # Execute gesture action
    result = shortcuts.execute_gesture(event.gesture)
    
    if result:
        await manager.broadcast({
            "type": "action",
            "gesture": event.gesture,
            "action": result.get("action"),
            "success": result.get("success")
        })
        return {"executed": True, "action": result}
    
    return {"executed": False, "reason": "no_mapping"}


# ==================== Macro Execution ====================

class MacroAction(BaseModel):
    type: str  # 'click', 'key', 'scroll', 'delay', 'type'
    params: Dict = {}
    timestamp: int = 0

class MacroRequest(BaseModel):
    actions: List[MacroAction]

@app.post("/macro/execute")
async def execute_macro(request: MacroRequest):
    """Execute a macro (sequence of actions)"""
    import time
    import pyautogui
    
    results = []
    prev_timestamp = 0
    
    for action in request.actions:
        # Add delay based on timestamp difference
        delay_ms = action.timestamp - prev_timestamp
        if delay_ms > 0:
            time.sleep(delay_ms / 1000.0)
        prev_timestamp = action.timestamp
        
        try:
            if action.type == 'click':
                button = action.params.get('button', 'left')
                pyautogui.click(button=button)
                results.append({"type": "click", "success": True})
                
            elif action.type == 'key':
                key = action.params.get('key', '')
                modifiers = action.params.get('modifiers', {})
                
                # Build key combination
                keys_to_press = []
                if modifiers.get('ctrl'): keys_to_press.append('ctrl')
                if modifiers.get('alt'): keys_to_press.append('alt')
                if modifiers.get('shift'): keys_to_press.append('shift')
                if modifiers.get('meta'): keys_to_press.append('command')
                keys_to_press.append(key)
                
                pyautogui.hotkey(*keys_to_press)
                results.append({"type": "key", "key": key, "success": True})
                
            elif action.type == 'scroll':
                direction = action.params.get('direction', 'down')
                amount = action.params.get('amount', 3)
                scroll_amount = amount if direction == 'up' else -amount
                pyautogui.scroll(scroll_amount)
                results.append({"type": "scroll", "success": True})
                
            elif action.type == 'delay':
                ms = action.params.get('ms', 500)
                time.sleep(ms / 1000.0)
                results.append({"type": "delay", "ms": ms, "success": True})
                
            elif action.type == 'type':
                text = action.params.get('text', '')
                pyautogui.typewrite(text, interval=0.05)
                results.append({"type": "type", "success": True})
                
        except Exception as e:
            results.append({"type": action.type, "success": False, "error": str(e)})
    
    return {"status": "ok", "results": results}


# ==================== Multi-Monitor Support ====================

@app.get("/system/monitors")
async def get_monitors():
    """Get multi-monitor configuration"""
    import pyautogui
    
    # Get primary screen size
    primary_width, primary_height = pyautogui.size()
    
    # Try to get multi-monitor info (platform-specific)
    monitors = [{
        "id": 0,
        "name": "Primary",
        "width": primary_width,
        "height": primary_height,
        "x": 0,
        "y": 0,
        "is_primary": True
    }]
    
    # On macOS, try to get more monitor info
    try:
        import subprocess
        result = subprocess.run(
            ['system_profiler', 'SPDisplaysDataType', '-json'],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            import json
            data = json.loads(result.stdout)
            displays = data.get('SPDisplaysDataType', [{}])[0].get('spdisplays_ndrvs', [])
            
            monitors = []
            x_offset = 0
            for i, display in enumerate(displays):
                resolution = display.get('_spdisplays_resolution', '').split(' x ')
                if len(resolution) >= 2:
                    width = int(resolution[0])
                    height = int(resolution[1].split(' ')[0])
                else:
                    width, height = primary_width, primary_height
                    
                monitors.append({
                    "id": i,
                    "name": display.get('_name', f'Display {i}'),
                    "width": width,
                    "height": height,
                    "x": x_offset,
                    "y": 0,
                    "is_primary": i == 0
                })
                x_offset += width
    except:
        pass  # Fallback to primary monitor only
    
    total_width = sum(m['width'] for m in monitors)
    total_height = max(m['height'] for m in monitors)
    
    return {
        "monitors": monitors,
        "total_width": total_width,
        "total_height": total_height,
        "count": len(monitors)
    }


# ==================== WebSocket ====================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time gesture events from frontend"""
    await manager.connect(websocket)
    
    try:
        while True:
            data = await websocket.receive_json()
            await handle_ws_message(websocket, data)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket)


async def handle_ws_message(websocket: WebSocket, data: dict):
    """Handle incoming WebSocket messages"""
    global control_enabled
    
    msg_type = data.get("type", "")
    
    if msg_type == "gesture":
        # Gesture detected in browser
        if control_enabled:
            gesture = data.get("gesture", "")
            confidence = data.get("confidence", 0)
            hand_x = data.get("hand_x")
            hand_y = data.get("hand_y")
            wrist_x = data.get("wrist_x")  # For fingertip mode
            wrist_y = data.get("wrist_y")
            fingertip_x = data.get("fingertip_x")  # Index finger tip
            fingertip_y = data.get("fingertip_y")
            
            # IMPORTANT: Only move cursor for TRACKING gestures (open_palm)
            # DO NOT move cursor during ACTION gestures (fist, pinch, etc.)
            # This prevents cursor drift when making a click motion
            tracking_gestures = ["open_palm"]  # Gestures that should move the cursor
            action_gestures = ["fist", "pinch", "pinch_hold", "two_finger_pinch"]  # Gestures that click/act
            
            if hand_x is not None and hand_y is not None:
                mouse_settings = shortcuts.get_mouse_settings()
                if mouse_settings.get("enabled", True):
                    # Only move cursor for tracking gestures
                    # Skip movement for action gestures to prevent click position drift
                    if gesture in tracking_gestures:
                        # Pass wrist position for fingertip mode support
                        mouse.move_from_normalized(
                            hand_x, hand_y,
                            wrist_x=wrist_x,
                            wrist_y=wrist_y
                        )
                    elif gesture in action_gestures:
                        # Reset tracking when action gesture detected
                        # This prevents cursor jump when resuming tracking
                        mouse.reset_tracking()
                    else:
                        # For other gestures (scrolling, pointing), still allow movement
                        mouse.move_from_normalized(
                            hand_x, hand_y,
                            wrist_x=wrist_x,
                            wrist_y=wrist_y
                        )
            
            # === MOVEMENT-BASED SCROLLING ===
            # Use VICTORY gesture (two fingers) for reliable scrolling
            # Move hand up = scroll up, move hand down = scroll down
            scroll_gestures = ["point_up", "point_down", "victory"]
            fingertip_delta_y = data.get("fingertip_delta_y", 0)
            
            # Debug: print gesture info
            if gesture in scroll_gestures:
                print(f"SCROLL GESTURE: {gesture}, delta_y: {fingertip_delta_y:.4f}")
            
            if gesture in scroll_gestures and abs(fingertip_delta_y) > 0.003:  # Lower threshold
                # Initialize scroll accumulator
                if not hasattr(handle_ws_message, '_scroll_accum'):
                    handle_ws_message._scroll_accum = 0
                
                handle_ws_message._scroll_accum += fingertip_delta_y
                
                # Scroll when accumulated enough movement (lowered threshold)
                scroll_threshold = 0.01  # Lower = more sensitive
                if abs(handle_ws_message._scroll_accum) > scroll_threshold:
                    scroll_amount = max(1, int(abs(handle_ws_message._scroll_accum / scroll_threshold))) * 3
                    # Positive delta = finger moved down = scroll down
                    # Negative delta = finger moved up = scroll up
                    if handle_ws_message._scroll_accum > 0:
                        print(f"SCROLLING DOWN: {scroll_amount}")
                        mouse.scroll("down", scroll_amount)
                    else:
                        print(f"SCROLLING UP: {scroll_amount}")
                        mouse.scroll("up", scroll_amount)
                    handle_ws_message._scroll_accum = 0
                    
                # Skip normal gesture execution for scroll gestures
                result = {"gesture": gesture, "action": "scroll", "success": True}
            else:
                # Execute normal action
                result = shortcuts.execute_gesture(gesture)
            
            # Handle special signals from action execution
            action_result = result.get("success") if result else None
            
            if action_result == "STOP_CONTROL":
                # Safety stop triggered
                control_enabled = False
                shortcuts.reset()
                await websocket.send_json({
                    "type": "control_stopped",
                    "gesture": gesture,
                    "reason": "safety_gesture"
                })
            elif action_result == "SHOW_KEYBOARD":
                # Request frontend to show virtual keyboard
                await websocket.send_json({
                    "type": "show_keyboard",
                    "gesture": gesture
                })
            else:
                await websocket.send_json({
                    "type": "action_result",
                    "gesture": gesture,
                    "action": result.get("action") if result else None,
                    "success": result.get("success") if result else False
                })
    
    elif msg_type == "enable_control":
        control_enabled = data.get("enabled", True)
        if not control_enabled:
            shortcuts.reset()
        await websocket.send_json({
            "type": "ack",
            "action": "enable_control",
            "enabled": control_enabled
        })
    
    elif msg_type == "get_state":
        await websocket.send_json({
            "type": "state",
            "control_enabled": control_enabled,
            "mappings": shortcuts.get_all_mappings()
        })


# ==================== Main ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
