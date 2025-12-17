"""
Shortcuts Manager
Executes system actions based on gesture-action mappings
"""

from typing import Dict, Any, Optional
import json
import os
from pathlib import Path

from .mouse_controller import MouseController
from .keyboard_controller import KeyboardController


class ShortcutsManager:
    """
    Manages execution of system actions based on gesture mappings
    Loads configuration from JSON file
    """
    
    def __init__(
        self,
        config_path: Optional[str] = None,
        mouse_controller: Optional[MouseController] = None,
        keyboard_controller: Optional[KeyboardController] = None
    ):
        self.mouse = mouse_controller or MouseController()
        self.keyboard = keyboard_controller or KeyboardController()
        
        # Load config
        if config_path is None:
            config_path = str(Path(__file__).parent.parent / "config" / "gesture_map.json")
        
        self.config_path = config_path
        self.config = self._load_config()
        
        # Apply mouse settings from config
        mouse_settings = self.config.get("mouse_control", {})
        self.mouse.update_settings(
            sensitivity=mouse_settings.get("sensitivity"),
            smoothing=mouse_settings.get("smoothing"),
            deadzone=mouse_settings.get("deadzone"),
            mode=mouse_settings.get("mode"),
            relative_speed=mouse_settings.get("relative_speed")
        )
    
    def _load_config(self) -> Dict:
        """Load gesture mapping configuration"""
        try:
            with open(self.config_path, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            return {"gestures": {}, "mouse_control": {}, "settings": {}}
        except json.JSONDecodeError:
            return {"gestures": {}, "mouse_control": {}, "settings": {}}
    
    def save_config(self):
        """Save current configuration to file"""
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
        with open(self.config_path, "w") as f:
            json.dump(self.config, f, indent=2)
    
    def get_gesture_mapping(self, gesture: str) -> Optional[Dict]:
        """Get action mapping for a gesture"""
        return self.config.get("gestures", {}).get(gesture)
    
    def execute_action(self, action_type: str, params: Dict[str, Any]) -> bool:
        """
        Execute a system action
        
        Args:
            action_type: Type of action (e.g., 'left_click', 'scroll', 'key_press')
            params: Action parameters
            
        Returns:
            True if action was executed successfully
        """
        try:
            # Mouse actions
            if action_type == "left_click":
                self.mouse.left_click()
            elif action_type == "right_click":
                self.mouse.right_click()
            elif action_type == "middle_click":
                self.mouse.middle_click()
            elif action_type == "double_click":
                button = params.get("button", "left")
                self.mouse.double_click(button)
            elif action_type == "scroll":
                direction = params.get("direction", "down")
                amount = params.get("amount", 3)
                self.mouse.scroll(direction, amount)
            elif action_type == "drag":
                # Drag is handled by controller state, just toggle
                if self.mouse.is_dragging():
                    self.mouse.end_drag()
                else:
                    button = params.get("button", "left")
                    self.mouse.start_drag(button)
            elif action_type == "move_to":
                x = params.get("x", 0)
                y = params.get("y", 0)
                self.mouse.move_to(x, y)
            
            # Keyboard actions
            elif action_type == "key_press":
                key = params.get("key", "")
                if key:
                    self.keyboard.press(key)
            elif action_type == "shortcut":
                keys = params.get("keys", [])
                if keys:
                    self.keyboard.shortcut(keys)
            elif action_type == "type_text":
                text = params.get("text", "")
                if text:
                    self.keyboard.type_text(text)
            
            # Common shortcuts
            elif action_type == "copy":
                self.keyboard.copy()
            elif action_type == "paste":
                self.keyboard.paste()
            elif action_type == "cut":
                self.keyboard.cut()
            elif action_type == "undo":
                self.keyboard.undo()
            elif action_type == "redo":
                self.keyboard.redo()
            elif action_type == "save":
                self.keyboard.save()
            elif action_type == "select_all":
                self.keyboard.select_all()
            elif action_type == "alt_tab":
                self.keyboard.alt_tab()
            elif action_type == "show_desktop":
                self.keyboard.show_desktop()
            elif action_type == "close_window":
                self.keyboard.close_window()
            elif action_type == "escape":
                self.keyboard.escape()
            elif action_type == "enter":
                self.keyboard.enter()
            elif action_type == "space":
                self.keyboard.space()
            
            # Media controls
            elif action_type == "volume_up":
                self.keyboard.volume_up()
            elif action_type == "volume_down":
                self.keyboard.volume_down()
            elif action_type == "volume_mute":
                self.keyboard.volume_mute()
            elif action_type == "play_pause":
                self.keyboard.play_pause()
            
            # Control actions - these return special signals
            elif action_type == "stop_control":
                # Signal to disable gesture control (handled by main.py)
                return "STOP_CONTROL"
            
            elif action_type == "show_keyboard":
                # Signal to show virtual keyboard in frontend
                return "SHOW_KEYBOARD"
            
            # No-op actions
            elif action_type == "stop" or action_type == "none":
                pass
            
            else:
                print(f"Unknown action type: {action_type}")
                return False
            
            return True
            
        except Exception as e:
            print(f"Error executing action {action_type}: {e}")
            return False
    
    def execute_gesture(self, gesture: str) -> Optional[Dict]:
        """
        Execute action mapped to a gesture
        
        Args:
            gesture: Gesture name (e.g., 'fist', 'open_palm')
            
        Returns:
            Dict with execution result, or None if no mapping
        """
        mapping = self.get_gesture_mapping(gesture)
        if not mapping:
            return None
        
        action_type = mapping.get("action", "none")
        params = mapping.get("params", {})
        
        success = self.execute_action(action_type, params)
        
        return {
            "gesture": gesture,
            "action": action_type,
            "params": params,
            "success": success,
            "description": mapping.get("description", "")
        }
    
    def update_gesture_mapping(
        self,
        gesture: str,
        action: str,
        params: Dict[str, Any],
        cooldown_ms: int = 500,
        min_confidence: float = 0.8,
        description: str = ""
    ):
        """Update or add a gesture mapping"""
        if "gestures" not in self.config:
            self.config["gestures"] = {}
        
        self.config["gestures"][gesture] = {
            "action": action,
            "params": params,
            "cooldown_ms": cooldown_ms,
            "min_confidence": min_confidence,
            "description": description
        }
        
        self.save_config()
    
    def remove_gesture_mapping(self, gesture: str):
        """Remove a gesture mapping"""
        if gesture in self.config.get("gestures", {}):
            del self.config["gestures"][gesture]
            self.save_config()
    
    def get_all_mappings(self) -> Dict:
        """Get all gesture mappings"""
        return self.config.get("gestures", {})
    
    def update_mouse_settings(
        self,
        enabled: Optional[bool] = None,
        sensitivity: Optional[float] = None,
        smoothing: Optional[float] = None,
        deadzone: Optional[float] = None,
        mode: Optional[str] = None,
        relative_speed: Optional[float] = None
    ):
        """Update mouse control settings"""
        if "mouse_control" not in self.config:
            self.config["mouse_control"] = {}
        
        if enabled is not None:
            self.config["mouse_control"]["enabled"] = enabled
        if sensitivity is not None:
            self.config["mouse_control"]["sensitivity"] = sensitivity
            self.mouse.update_settings(sensitivity=sensitivity)
        if smoothing is not None:
            self.config["mouse_control"]["smoothing"] = smoothing
            self.mouse.update_settings(smoothing=smoothing)
        if deadzone is not None:
            self.config["mouse_control"]["deadzone"] = deadzone
            self.mouse.update_settings(deadzone=deadzone)
        if mode is not None:
            self.config["mouse_control"]["mode"] = mode
            self.mouse.update_settings(mode=mode)
        if relative_speed is not None:
            self.config["mouse_control"]["relative_speed"] = relative_speed
            self.mouse.update_settings(relative_speed=relative_speed)
        
        self.save_config()
    
    def get_mouse_settings(self) -> Dict:
        """Get mouse control settings"""
        return self.config.get("mouse_control", {})
    
    def reset(self):
        """Reset controllers to safe state"""
        self.mouse.reset()
        self.keyboard.release_all()
