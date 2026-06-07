const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let tray = null;
let win = null;
let backendProcess = null;
let currentVolume = 0.5; // Initial assumed volume
let windowWatcherInterval = null;

async function startWindowWatcher() {
    let lastActiveApp = null;
    const activeWinModule = await import('active-win');
    const activeWin = activeWinModule.default;

    windowWatcherInterval = setInterval(async () => {
        try {
            const active = await activeWin();
            if (active && active.owner.name !== lastActiveApp) {
                lastActiveApp = active.owner.name;
                console.log(`Active window changed to: ${lastActiveApp}`);
                if (win) {
                    win.webContents.send('active-window-changed', lastActiveApp);
                }
            }
        } catch (e) {
            console.error("Could not get active window:", e);
        }
    }, 1000);
}

// Function to start the Rust backend server
function startBackendServer() {
    let backendExecutable;
    const fs = require('fs');

    if (app.isPackaged) {
        // In production, the backend executable is in the resources path
        backendExecutable = path.join(process.resourcesPath, 'joycon-backend.exe');
    } else {
        // In development, search in release or debug target folder
        const releasePath = path.join(__dirname, '../../backend/target/release/joycon-backend.exe');
        const debugPath = path.join(__dirname, '../../backend/target/debug/joycon-backend.exe');
        
        if (fs.existsSync(releasePath)) {
            backendExecutable = releasePath;
        } else {
            backendExecutable = debugPath;
        }
    }

    console.log(`Spawning backend: ${backendExecutable}`);
    backendProcess = spawn(backendExecutable);

    backendProcess.stdout.on('data', (data) => {
        console.log(`Backend stdout: ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
        console.error(`Backend stderr: ${data}`);
    });

    backendProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
    });
}

function createWindow() {
    // Create the browser window.
    win = new BrowserWindow({
        width: 800,
        height: 600,
        show: false, // Hide the window initially
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // Remove the default menu bar (File, Edit, etc.) to clean up the window interface
    win.removeMenu();

    // In development, load from the Vite dev server. In production, load the built file.
    const isDev = !app.isPackaged;
    const startUrl = isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, '../build/index.html')}`;
    
    // Wait for the Python server to start before loading the URL
    setTimeout(() => {
        win.loadURL(startUrl);
    }, 5000); // 5-second delay


    // Open the DevTools.
    if (process.env.ELECTRON_START_URL) {
        win.webContents.openDevTools();
    }

    // Hide the window instead of closing it.
    win.on('close', (event) => {
        if (app.quitting) {
            win = null;
        } else {
            event.preventDefault();
            win.hide();
        }
    });
}

function createTray() {
    const iconPath = path.join(__dirname, 'icon.png'); // Path to your icon
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '設定',
            click: () => {
                if (win) {
                    win.show();
                    win.focus();
                }
            },
        },
        {
            label: '終了',
            click: () => {
                app.quitting = true;
                app.quit();
            },
        },
    ]);
    tray.setToolTip('Joy-Con PC Utility');
    tray.setContextMenu(contextMenu);

    // Single click to toggle window visibility
    tray.on('click', () => {
        if (win) {
            if (win.isVisible()) {
                win.hide();
            } else {
                win.show();
                win.focus();
            }
        }
    });

    // Double click to ensure window is shown and focused
    tray.on('double-click', () => {
        if (win) {
            win.show();
            win.focus();
        }
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
    startBackendServer();
    createWindow();
    createTray();
    startWindowWatcher();

    ipcMain.on('execute-shortcut', (event, shortcut) => {
        try {
            console.log(`Received shortcut to execute: ${shortcut}`);
            const keys = shortcut.toLowerCase().split('+').map(k => k.trim());
            let psKeys = "";
            keys.forEach(k => {
                if (k === 'ctrl' || k === 'control') psKeys += "^";
                else if (k === 'alt') psKeys += "%";
                else if (k === 'shift') psKeys += "+";
                else psKeys += k;
            });
            const { exec } = require('child_process');
            exec(`powershell -Command "[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.SendKeys]::SendWait('${psKeys}')"`);
            console.log(`Executed shortcut via PowerShell SendKeys: ${psKeys}`);
        } catch (e) {
            console.error("Failed to execute shortcut:", e);
        }
    });

    ipcMain.on('set-volume', (event, volume) => {
        try {
            const volumeThreshold = 0.05;
            let action = null;
            if (volume > currentVolume + volumeThreshold) {
                action = "[System.Windows.Forms.SendKeys]::SendWait([char]175)"; // Volume Up
                console.log('Volume up');
            } else if (volume < currentVolume - volumeThreshold) {
                action = "[System.Windows.Forms.SendKeys]::SendWait([char]174)"; // Volume Down
                console.log('Volume down');
            }
            if (action) {
                const { exec } = require('child_process');
                exec(`powershell -Command "[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); ${action}"`);
            }
            currentVolume = volume;
        } catch (e) {
            console.error("Failed to set volume:", e);
        }
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    // Do nothing, the app should stay open.
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Kill the backend process before the app quits
app.on('will-quit', () => {
    if (backendProcess) {
        backendProcess.kill();
        backendProcess = null;
    }
    if (windowWatcherInterval) {
        clearInterval(windowWatcherInterval);
    }
});
