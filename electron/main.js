const { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let tray;
let backendProcess;
let isControlEnabled = true;

// Create the main browser window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets/icon.png'),
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#0f172a',
        show: false // Don't show until ready
    });

    // Load the frontend
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Handle window close - minimize to tray instead
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            return false;
        }
    });
}

// Create system tray
function createTray() {
    // Create tray icon (using emoji as placeholder - should use actual icon file)
    const iconPath = path.join(__dirname, 'assets/tray-icon.png');
    let trayIcon;
    
    try {
        trayIcon = nativeImage.createFromPath(iconPath);
    } catch {
        // Create a simple placeholder icon if file doesn't exist
        trayIcon = nativeImage.createEmpty();
    }

    tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: '✋ GestureFlow',
            enabled: false
        },
        { type: 'separator' },
        {
            label: isControlEnabled ? '🟢 Control Enabled' : '🔴 Control Disabled',
            click: () => toggleControl()
        },
        {
            label: '⚙️ Open Settings',
            click: () => {
                mainWindow.show();
                mainWindow.focus();
            }
        },
        { type: 'separator' },
        {
            label: '🎯 Calibrate',
            click: () => {
                mainWindow.show();
                mainWindow.webContents.send('open-calibration');
            }
        },
        {
            label: '📊 Analytics',
            click: () => {
                mainWindow.show();
                mainWindow.webContents.send('open-analytics');
            }
        },
        { type: 'separator' },
        {
            label: '❌ Quit GestureFlow',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('GestureFlow - Gesture Control');
    tray.setContextMenu(contextMenu);

    // Double-click to show window
    tray.on('double-click', () => {
        mainWindow.show();
        mainWindow.focus();
    });
}

// Toggle gesture control
function toggleControl() {
    isControlEnabled = !isControlEnabled;
    
    // Update tray menu
    createTray();
    
    // Notify renderer
    mainWindow.webContents.send('control-toggled', isControlEnabled);
    
    // Update backend
    fetch('http://localhost:8000/control/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: isControlEnabled })
    }).catch(() => {});
}

// Register global shortcuts
function registerShortcuts() {
    // Toggle control: Cmd+Shift+G (Mac) or Ctrl+Shift+G (Windows/Linux)
    globalShortcut.register('CommandOrControl+Shift+G', () => {
        toggleControl();
    });

    // Emergency stop: Escape (when control is enabled)
    globalShortcut.register('Escape', () => {
        if (isControlEnabled) {
            isControlEnabled = false;
            createTray();
            mainWindow.webContents.send('emergency-stop');
            fetch('http://localhost:8000/control/enable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: false })
            }).catch(() => {});
        }
    });

    // Open/focus window: Cmd+Shift+F (Mac) or Ctrl+Shift+F
    globalShortcut.register('CommandOrControl+Shift+F', () => {
        mainWindow.show();
        mainWindow.focus();
    });
}

// Start the Python backend
function startBackend() {
    const backendPath = path.join(__dirname, '../backend');
    
    backendProcess = spawn('python3', ['main.py'], {
        cwd: backendPath,
        stdio: 'pipe'
    });

    backendProcess.stdout.on('data', (data) => {
        console.log(`Backend: ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
        console.error(`Backend Error: ${data}`);
    });

    backendProcess.on('close', (code) => {
        console.log(`Backend exited with code ${code}`);
    });
}

// Stop the backend
function stopBackend() {
    if (backendProcess) {
        backendProcess.kill();
    }
}

// App lifecycle
app.whenReady().then(() => {
    createWindow();
    createTray();
    registerShortcuts();
    
    // Start backend in production
    if (process.env.NODE_ENV !== 'development') {
        startBackend();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        } else {
            mainWindow.show();
        }
    });
});

app.on('window-all-closed', () => {
    // Don't quit on window close (keep in tray)
});

app.on('before-quit', () => {
    app.isQuitting = true;
    stopBackend();
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

// Handle second instance (prevent multiple instances)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

// Auto-start on login (can be toggled in settings)
if (process.platform === 'darwin') {
    app.setLoginItemSettings({
        openAtLogin: false, // Set to true to auto-start
        openAsHidden: true
    });
}
