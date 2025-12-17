"""
Mouse Controller
Full mouse control using pyautogui and pynput
"""

import pyautogui
from pynput import mouse
from typing import Optional, Tuple
from dataclasses import dataclass
import threading
import time


# Configure pyautogui for ULTRA FAST response
pyautogui.FAILSAFE = False  # We use gesture-based safety instead (thumbs_down + fist = emergency stop)
pyautogui.PAUSE = 0        # Zero pause for maximum speed


@dataclass
class MousePosition:
    """Current mouse position"""
    x: int
    y: int


class MouseController:
    """
    Full mouse control for gesture-based interaction
    
    Control Modes:
    - absolute: Hand position maps directly to screen position
    - relative: Hand movement is relative (like trackpad/mouse)
    - fingertip: Fingertip position relative to wrist (rest hand on desk)
    
    Features:
    - Smooth cursor movement
    - Click (left, right, middle)
    - Double click
    - Drag and drop
    - Scroll (vertical and horizontal)
    """
    
    def __init__(
        self,
        sensitivity: float = 4.0,    # Higher for less arm movement
        smoothing: float = 0.2,      # Lower for faster response
        deadzone: float = 0.003,     # Small deadzone
        mode: str = "relative",      # Default to relative mode (most ergonomic)
        relative_speed: float = 20.0 # Speed multiplier for relative mode
    ):
        self.sensitivity = sensitivity
        self.smoothing = smoothing
        self.deadzone = deadzone
        self.mode = mode
        self.relative_speed = relative_speed
        
        # Screen dimensions
        self.screen_width, self.screen_height = pyautogui.size()
        
        # State
        self._is_dragging = False
        self._drag_button = "left"
        self._last_position: Optional[MousePosition] = None
        self._target_position: Optional[MousePosition] = None
        
        # For relative mode: track previous hand position
        self._prev_hand_x: Optional[float] = None
        self._prev_hand_y: Optional[float] = None
        self._frames_since_movement = 0
        
        # For fingertip mode: track wrist anchor
        self._wrist_x: Optional[float] = None
        self._wrist_y: Optional[float] = None
        
        # Smoothing thread
        self._smoothing_active = False
        self._smoothing_thread: Optional[threading.Thread] = None
        
        # pynput controller for some operations
        self._pynput_mouse = mouse.Controller()
    
    def set_mode(self, mode: str):
        """Set control mode: 'absolute', 'relative', or 'fingertip'"""
        if mode in ["absolute", "relative", "fingertip"]:
            self.mode = mode
            # Reset tracking state when mode changes
            self._prev_hand_x = None
            self._prev_hand_y = None
            self._wrist_x = None
            self._wrist_y = None
    
    def move_to(self, x: int, y: int, smooth: bool = True):
        """
        Move mouse to absolute position
        
        Args:
            x: X coordinate
            y: Y coordinate  
            smooth: Use smooth movement
        """
        # Clamp to screen bounds
        x = max(0, min(x, self.screen_width - 1))
        y = max(0, min(y, self.screen_height - 1))
        
        if smooth and self._last_position:
            # Apply smoothing
            smoothed_x = int(
                self._last_position.x * self.smoothing + 
                x * (1 - self.smoothing)
            )
            smoothed_y = int(
                self._last_position.y * self.smoothing + 
                y * (1 - self.smoothing)
            )
            pyautogui.moveTo(smoothed_x, smoothed_y, _pause=False)
            self._last_position = MousePosition(smoothed_x, smoothed_y)
        else:
            pyautogui.moveTo(x, y, _pause=False)
            self._last_position = MousePosition(x, y)
    
    def move_from_normalized(
        self,
        norm_x: float,
        norm_y: float,
        wrist_x: Optional[float] = None,
        wrist_y: Optional[float] = None,
        smooth: bool = True
    ):
        """
        Move mouse based on normalized coordinates (0-1)
        Uses the configured control mode.
        
        Args:
            norm_x: Normalized X (0-1) - palm center or fingertip
            norm_y: Normalized Y (0-1)
            wrist_x: Wrist X position (for fingertip mode)
            wrist_y: Wrist Y position (for fingertip mode)
            smooth: Use smooth movement
        """
        # FLIP X to correct mirror mode (webcam shows mirrored)
        norm_x = 1.0 - norm_x
        if wrist_x is not None:
            wrist_x = 1.0 - wrist_x
        
        if self.mode == "relative":
            self._move_relative_mode(norm_x, norm_y, smooth)
        elif self.mode == "fingertip" and wrist_x is not None and wrist_y is not None:
            self._move_fingertip_mode(norm_x, norm_y, wrist_x, wrist_y, smooth)
        else:
            self._move_absolute_mode(norm_x, norm_y, smooth)
    
    def _move_absolute_mode(self, norm_x: float, norm_y: float, smooth: bool):
        """Original absolute positioning mode"""
        center_x = 0.5
        center_y = 0.5
        
        # Calculate offset from center with sensitivity
        offset_x = (norm_x - center_x) * self.sensitivity
        offset_y = (norm_y - center_y) * self.sensitivity
        
        # Apply deadzone
        if abs(offset_x) < self.deadzone:
            offset_x = 0
        if abs(offset_y) < self.deadzone:
            offset_y = 0
        
        # Convert to screen coordinates
        screen_x = int((center_x + offset_x) * self.screen_width)
        screen_y = int((center_y + offset_y) * self.screen_height)
        
        self.move_to(screen_x, screen_y, smooth)
    
    def _move_relative_mode(self, norm_x: float, norm_y: float, smooth: bool):
        """
        DIRECT Relative Mode - True 1:1 tracking like a real mouse
        - Zero latency
        - No filtering
        """
        # Initialize on first frame
        if self._prev_hand_x is None:
            self._prev_hand_x = norm_x
            self._prev_hand_y = norm_y
            return
        
        # Calculate hand movement delta
        dx = norm_x - self._prev_hand_x
        dy = norm_y - self._prev_hand_y
        
        # Update previous position
        self._prev_hand_x = norm_x
        self._prev_hand_y = norm_y
        
        # NO FILTERING - every movement tracked
        # Direct conversion to pixels
        pixel_x = dx * self.screen_width * self.relative_speed * 0.25
        pixel_y = dy * self.screen_height * self.relative_speed * 0.25
        
        # Move cursor
        if abs(pixel_x) >= 0.5 or abs(pixel_y) >= 0.5:
            pyautogui.move(int(round(pixel_x)), int(round(pixel_y)), _pause=False)
    
    def _move_fingertip_mode(
        self,
        fingertip_x: float,
        fingertip_y: float,
        wrist_x: float,
        wrist_y: float,
        smooth: bool
    ):
        """
        Fingertip mode - track finger position relative to wrist
        Hand can rest on desk, only finger movements control cursor
        Very ergonomic for extended use
        """
        # Calculate fingertip offset from wrist
        offset_x = fingertip_x - wrist_x
        offset_y = fingertip_y - wrist_y
        
        # Apply deadzone
        if abs(offset_x) < self.deadzone:
            offset_x = 0
        if abs(offset_y) < self.deadzone:
            offset_y = 0
        
        # Finger range is small (~0.2 units), so amplify significantly
        # sensitivity of 4.0 means finger move of 0.1 units = 40% of screen
        amplified_x = offset_x * self.sensitivity * 5
        amplified_y = offset_y * self.sensitivity * 5
        
        # Map to screen (center-based)
        screen_x = int((0.5 + amplified_x) * self.screen_width)
        screen_y = int((0.5 + amplified_y) * self.screen_height)
        
        self.move_to(screen_x, screen_y, smooth)
    
    def reset_tracking(self):
        """Reset relative tracking (call when hand leaves frame or gesture changes)"""
        self._prev_hand_x = None
        self._prev_hand_y = None
        self._wrist_x = None
        self._wrist_y = None
    
    def move_relative(self, dx: int, dy: int):
        """Move mouse relative to current position"""
        pyautogui.moveRel(dx, dy, _pause=False)
        if self._last_position:
            self._last_position = MousePosition(
                self._last_position.x + dx,
                self._last_position.y + dy
            )
    
    def click(
        self,
        button: str = "left",
        clicks: int = 1,
        interval: float = 0.1
    ):
        """
        Perform mouse click
        
        Args:
            button: 'left', 'right', or 'middle'
            clicks: Number of clicks (1 for single, 2 for double)
            interval: Interval between clicks
        """
        pyautogui.click(button=button, clicks=clicks, interval=interval)
    
    def left_click(self):
        """Single left click"""
        self.click("left", 1)
    
    def right_click(self):
        """Single right click"""
        self.click("right", 1)
    
    def middle_click(self):
        """Single middle click"""
        self.click("middle", 1)
    
    def double_click(self, button: str = "left"):
        """Double click"""
        self.click(button, 2)
    
    def start_drag(self, button: str = "left"):
        """Start drag operation (mouse down)"""
        if not self._is_dragging:
            self._is_dragging = True
            self._drag_button = button
            pyautogui.mouseDown(button=button)
    
    def end_drag(self):
        """End drag operation (mouse up)"""
        if self._is_dragging:
            pyautogui.mouseUp(button=self._drag_button)
            self._is_dragging = False
    
    def drag_to(self, x: int, y: int, button: str = "left"):
        """Drag from current position to target"""
        if not self._is_dragging:
            self.start_drag(button)
        self.move_to(x, y, smooth=True)
    
    def scroll(
        self,
        direction: str = "down",
        amount: int = 3,
        horizontal: bool = False
    ):
        """
        Scroll the mouse wheel
        
        Args:
            direction: 'up', 'down', 'left', 'right'
            amount: Scroll amount (lines)
            horizontal: Use horizontal scroll
        """
        if direction == "up":
            pyautogui.scroll(amount)
        elif direction == "down":
            pyautogui.scroll(-amount)
        elif direction == "left":
            pyautogui.hscroll(-amount)
        elif direction == "right":
            pyautogui.hscroll(amount)
    
    def scroll_up(self, amount: int = 3):
        """Scroll up"""
        self.scroll("up", amount)
    
    def scroll_down(self, amount: int = 3):
        """Scroll down"""
        self.scroll("down", amount)
    
    def get_position(self) -> MousePosition:
        """Get current mouse position"""
        x, y = pyautogui.position()
        return MousePosition(x, y)
    
    def update_settings(
        self,
        sensitivity: Optional[float] = None,
        smoothing: Optional[float] = None,
        deadzone: Optional[float] = None,
        mode: Optional[str] = None,
        relative_speed: Optional[float] = None
    ):
        """Update controller settings"""
        if sensitivity is not None:
            self.sensitivity = max(0.1, min(10.0, sensitivity))
        if smoothing is not None:
            self.smoothing = max(0.0, min(0.95, smoothing))
        if deadzone is not None:
            self.deadzone = max(0.0, min(0.2, deadzone))
        if mode is not None:
            self.set_mode(mode)
        if relative_speed is not None:
            self.relative_speed = max(1.0, min(50.0, relative_speed))
    
    def is_dragging(self) -> bool:
        """Check if currently dragging"""
        return self._is_dragging
    
    def reset(self):
        """Reset controller state"""
        if self._is_dragging:
            self.end_drag()
        self._last_position = None
        self._target_position = None
        self.reset_tracking()


class CursorPreview:
    """
    Virtual cursor preview for showing where the gesture
    would move the real cursor
    """
    
    def __init__(self, screen_width: int, screen_height: int):
        self.screen_width = screen_width
        self.screen_height = screen_height
        self._preview_x = screen_width // 2
        self._preview_y = screen_height // 2
    
    def update(self, norm_x: float, norm_y: float, sensitivity: float = 1.0):
        """Update preview position from normalized coordinates"""
        self._preview_x = int(norm_x * self.screen_width * sensitivity)
        self._preview_y = int(norm_y * self.screen_height * sensitivity)
        
        # Clamp to bounds
        self._preview_x = max(0, min(self._preview_x, self.screen_width - 1))
        self._preview_y = max(0, min(self._preview_y, self.screen_height - 1))
    
    def get_position(self) -> Tuple[int, int]:
        """Get current preview position"""
        return (self._preview_x, self._preview_y)
    
    def to_dict(self) -> dict:
        """Get position as dict for JSON"""
        return {
            "x": self._preview_x,
            "y": self._preview_y,
            "screen_width": self.screen_width,
            "screen_height": self.screen_height
        }
