"""
App Launcher Module
Launch applications, open files and folders using system commands
Designed for macOS with cross-platform fallbacks
"""

import subprocess
import os
import platform
from typing import Optional, List, Dict
import logging

logger = logging.getLogger(__name__)


class AppLauncher:
    """
    Launch apps, open files, folders, and URLs
    Uses macOS 'open' command with cross-platform fallback
    """
    
    # Common macOS applications
    COMMON_APPS: Dict[str, str] = {
        "calculator": "Calculator",
        "notes": "Notes",
        "safari": "Safari",
        "chrome": "Google Chrome",
        "firefox": "Firefox",
        "vscode": "Visual Studio Code",
        "code": "Visual Studio Code",
        "terminal": "Terminal",
        "finder": "Finder",
        "music": "Music",
        "mail": "Mail",
        "messages": "Messages",
        "photos": "Photos",
        "preview": "Preview",
        "textedit": "TextEdit",
        "word": "Microsoft Word",
        "excel": "Microsoft Excel",
        "powerpoint": "Microsoft PowerPoint",
        "slack": "Slack",
        "zoom": "zoom.us",
        "spotify": "Spotify",
        "discord": "Discord",
        "notion": "Notion",
        "figma": "Figma",
        "xcode": "Xcode",
    }
    
    def __init__(self):
        self.system = platform.system()
    
    def launch_app(self, app_name: str) -> bool:
        """
        Launch an application by name
        
        Args:
            app_name: Application name (e.g., 'Calculator', 'Safari')
        
        Returns:
            True if launch successful, False otherwise
        """
        try:
            # Normalize app name
            normalized = app_name.lower().strip()
            actual_name = self.COMMON_APPS.get(normalized, app_name)
            
            if self.system == "Darwin":  # macOS
                # Try launching with 'open -a'
                result = subprocess.run(
                    ["open", "-a", actual_name],
                    capture_output=True,
                    timeout=5
                )
                if result.returncode == 0:
                    logger.info(f"Launched app: {actual_name}")
                    return True
                else:
                    logger.warning(f"Failed to launch: {actual_name}")
                    return False
                    
            elif self.system == "Windows":
                # Windows: use start command
                subprocess.Popen(["start", "", app_name], shell=True)
                return True
                
            elif self.system == "Linux":
                # Linux: try common launchers
                subprocess.Popen([app_name.lower()])
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"Error launching app '{app_name}': {e}")
            return False
    
    def open_file(self, file_path: str) -> bool:
        """
        Open a file with its default application
        
        Args:
            file_path: Path to the file
        
        Returns:
            True if successful, False otherwise
        """
        try:
            if not os.path.exists(file_path):
                logger.warning(f"File not found: {file_path}")
                return False
            
            if self.system == "Darwin":
                subprocess.run(["open", file_path], timeout=5)
            elif self.system == "Windows":
                os.startfile(file_path)
            elif self.system == "Linux":
                subprocess.run(["xdg-open", file_path], timeout=5)
            
            logger.info(f"Opened file: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error opening file '{file_path}': {e}")
            return False
    
    def open_folder(self, folder_path: str) -> bool:
        """
        Open a folder in the file manager
        
        Args:
            folder_path: Path to the folder
        
        Returns:
            True if successful, False otherwise
        """
        try:
            path = os.path.expanduser(folder_path)  # Handle ~ for home
            
            if not os.path.isdir(path):
                logger.warning(f"Folder not found: {path}")
                return False
            
            if self.system == "Darwin":
                subprocess.run(["open", path], timeout=5)
            elif self.system == "Windows":
                subprocess.run(["explorer", path], timeout=5)
            elif self.system == "Linux":
                subprocess.run(["xdg-open", path], timeout=5)
            
            logger.info(f"Opened folder: {path}")
            return True
            
        except Exception as e:
            logger.error(f"Error opening folder '{folder_path}': {e}")
            return False
    
    def open_url(self, url: str) -> bool:
        """
        Open a URL in the default browser
        
        Args:
            url: URL to open
        
        Returns:
            True if successful, False otherwise
        """
        try:
            import webbrowser
            webbrowser.open(url)
            logger.info(f"Opened URL: {url}")
            return True
        except Exception as e:
            logger.error(f"Error opening URL '{url}': {e}")
            return False
    
    def get_available_apps(self) -> List[str]:
        """
        Get list of common launchable apps
        
        Returns:
            List of app names
        """
        return list(self.COMMON_APPS.keys())
    
    def search_apps(self, query: str) -> List[str]:
        """
        Search for apps matching a query
        
        Args:
            query: Search string
        
        Returns:
            List of matching app names
        """
        query_lower = query.lower()
        return [
            name for name, app in self.COMMON_APPS.items()
            if query_lower in name.lower() or query_lower in app.lower()
        ]


# Global instance
app_launcher = AppLauncher()
