"""
Keyboard Controller
Full keyboard control using pyautogui, pynput, and keyboard
"""

import pyautogui
from pynput import keyboard
from typing import List, Optional, Union
import time


# Configure pyautogui
pyautogui.PAUSE = 0.02


class KeyboardController:
    """
    Full keyboard control for gesture-based interaction
    
    Features:
    - Single key press
    - Key combinations (shortcuts)
    - Key hold and release
    - Text typing
    """
    
    # Key name mappings
    SPECIAL_KEYS = {
        "ctrl": "ctrl",
        "control": "ctrl",
        "alt": "alt",
        "shift": "shift",
        "meta": "win",
        "win": "win",
        "windows": "win",
        "cmd": "command",
        "command": "command",
        "enter": "enter",
        "return": "enter",
        "space": "space",
        "tab": "tab",
        "escape": "esc",
        "esc": "esc",
        "backspace": "backspace",
        "delete": "delete",
        "up": "up",
        "down": "down",
        "left": "left",
        "right": "right",
        "home": "home",
        "end": "end",
        "pageup": "pageup",
        "pagedown": "pagedown",
        "f1": "f1", "f2": "f2", "f3": "f3", "f4": "f4",
        "f5": "f5", "f6": "f6", "f7": "f7", "f8": "f8",
        "f9": "f9", "f10": "f10", "f11": "f11", "f12": "f12",
    }
    
    def __init__(self):
        self._held_keys: List[str] = []
        self._pynput_keyboard = keyboard.Controller()
    
    def _normalize_key(self, key: str) -> str:
        """Normalize key name to pyautogui format"""
        key_lower = key.lower().strip()
        return self.SPECIAL_KEYS.get(key_lower, key_lower)
    
    def press(self, key: str):
        """
        Press and release a single key
        
        Args:
            key: Key to press (e.g., 'a', 'enter', 'f1')
        """
        normalized = self._normalize_key(key)
        pyautogui.press(normalized)
    
    def key_down(self, key: str):
        """Hold a key down"""
        normalized = self._normalize_key(key)
        if normalized not in self._held_keys:
            pyautogui.keyDown(normalized)
            self._held_keys.append(normalized)
    
    def key_up(self, key: str):
        """Release a held key"""
        normalized = self._normalize_key(key)
        if normalized in self._held_keys:
            pyautogui.keyUp(normalized)
            self._held_keys.remove(normalized)
    
    def release_all(self):
        """Release all held keys"""
        for key in self._held_keys[:]:
            try:
                pyautogui.keyUp(key)
            except Exception:
                pass
        self._held_keys.clear()
    
    def hotkey(self, *keys: str, interval: float = 0.05):
        """
        Press a key combination (hotkey)
        
        Args:
            keys: Keys to press together (e.g., 'ctrl', 'c')
            interval: Interval between key presses
        """
        normalized_keys = [self._normalize_key(k) for k in keys]
        pyautogui.hotkey(*normalized_keys, interval=interval)
    
    def shortcut(self, keys: List[str]):
        """
        Execute a keyboard shortcut
        
        Args:
            keys: List of keys (e.g., ['ctrl', 'c'])
        """
        if not keys:
            return
        
        if len(keys) == 1:
            self.press(keys[0])
        else:
            self.hotkey(*keys)
    
    def type_text(self, text: str, interval: float = 0.02):
        """
        Type a string of text
        
        Args:
            text: Text to type
            interval: Interval between characters
        """
        pyautogui.write(text, interval=interval)
    
    # Common shortcuts as convenience methods
    def copy(self):
        """Ctrl+C / Cmd+C"""
        self.hotkey("ctrl", "c")
    
    def paste(self):
        """Ctrl+V / Cmd+V"""
        self.hotkey("ctrl", "v")
    
    def cut(self):
        """Ctrl+X / Cmd+X"""
        self.hotkey("ctrl", "x")
    
    def undo(self):
        """Ctrl+Z / Cmd+Z"""
        self.hotkey("ctrl", "z")
    
    def redo(self):
        """Ctrl+Y / Cmd+Shift+Z"""
        self.hotkey("ctrl", "y")
    
    def select_all(self):
        """Ctrl+A / Cmd+A"""
        self.hotkey("ctrl", "a")
    
    def save(self):
        """Ctrl+S / Cmd+S"""
        self.hotkey("ctrl", "s")
    
    def find(self):
        """Ctrl+F / Cmd+F"""
        self.hotkey("ctrl", "f")
    
    def alt_tab(self):
        """Alt+Tab to switch windows"""
        self.hotkey("alt", "tab")
    
    def show_desktop(self):
        """Win+D to show desktop"""
        self.hotkey("win", "d")
    
    def close_window(self):
        """Alt+F4 to close window"""
        self.hotkey("alt", "f4")
    
    def new_tab(self):
        """Ctrl+T for new tab"""
        self.hotkey("ctrl", "t")
    
    def close_tab(self):
        """Ctrl+W to close tab"""
        self.hotkey("ctrl", "w")
    
    def refresh(self):
        """F5 / Ctrl+R to refresh"""
        self.press("f5")
    
    def escape(self):
        """Press Escape"""
        self.press("esc")
    
    def enter(self):
        """Press Enter"""
        self.press("enter")
    
    def space(self):
        """Press Space"""
        self.press("space")
    
    def backspace(self):
        """Press Backspace"""
        self.press("backspace")
    
    def arrow_up(self):
        """Press Up arrow"""
        self.press("up")
    
    def arrow_down(self):
        """Press Down arrow"""
        self.press("down")
    
    def arrow_left(self):
        """Press Left arrow"""
        self.press("left")
    
    def arrow_right(self):
        """Press Right arrow"""
        self.press("right")
    
    def volume_up(self):
        """Increase volume"""
        self.press("volumeup")
    
    def volume_down(self):
        """Decrease volume"""
        self.press("volumedown")
    
    def volume_mute(self):
        """Toggle mute"""
        self.press("volumemute")
    
    def play_pause(self):
        """Play/Pause media"""
        self.press("playpause")
    
    def __del__(self):
        """Ensure all keys are released on destruction"""
        self.release_all()
