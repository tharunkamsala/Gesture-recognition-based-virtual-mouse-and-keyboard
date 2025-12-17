const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Control
    onControlToggled: (callback) => {
        ipcRenderer.on('control-toggled', (event, enabled) => callback(enabled));
    },
    onEmergencyStop: (callback) => {
        ipcRenderer.on('emergency-stop', () => callback());
    },
    
    // Navigation
    onOpenCalibration: (callback) => {
        ipcRenderer.on('open-calibration', () => callback());
    },
    onOpenAnalytics: (callback) => {
        ipcRenderer.on('open-analytics', () => callback());
    },
    
    // System
    getPlatform: () => process.platform,
    getVersion: () => require('../package.json').version,
    
    // Notifications
    showNotification: (title, body) => {
        new Notification(title, { body });
    }
});

// Log that preload ran
console.log('GestureFlow Electron preload loaded');
