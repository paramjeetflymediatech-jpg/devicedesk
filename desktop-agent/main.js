const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');
const os = require('os');
const screenshot = require('screenshot-desktop');
const axios = require('axios');
const Store = require('electron-store');
const AutoLaunch = require('auto-launch');

const store = new Store();
let mainWindow = null;
let tray = null;
let captureTimer = null;

// Initialize AutoLaunch for System Startup (Windows, Linux, Mac)
const agentAutoLauncher = new AutoLaunch({
  name: 'DeviceDeskAgent',
  path: process.execPath,
});

agentAutoLauncher.enable().catch((err) => {
  console.warn('Auto launch enable notice:', err.message);
});

// Single instance lock to prevent duplicate tray agents running
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 620,
    resizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    title: 'DeviceDesk Agent Setup',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Hide to system tray instead of quitting on close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  let iconPath = path.join(__dirname, 'assets', 'icon.png');
  let trayIcon = nativeImage.createFromPath(iconPath);
  if (trayIcon.isEmpty()) {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('DeviceDesk Agent - Automated Desktop Logger');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '💻 DeviceDesk Agent (Active)',
      enabled: false
    },
    { type: 'separator' },
    {
      label: '⚙️ Configure Employee Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: '📸 Take Instant Capture Now',
      click: () => {
        captureAndUpload();
      }
    },
    { type: 'separator' },
    {
      label: '❌ Exit Agent',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Get Active Configuration with automatic OS Fallback (Ensures agent captures instantly on ANY system)
function getActiveConfig() {
  const config = store.get('config') || {};
  const osUser = os.userInfo() ? os.userInfo().username : 'employee';
  const osHost = os.hostname() || 'desktop';

  const employeeId = config.employeeId || osUser;
  const employeeName = config.employeeName || osUser;
  const department = config.department || 'General';
  const systemNumber = config.systemNumber || osHost;

  let serverUrl = config.serverUrl || 'https://devicedesk.flymediatech.com';
  if (!serverUrl || serverUrl.includes('localhost')) {
    serverUrl = 'https://devicedesk.flymediatech.com';
  }

  return {
    employeeId,
    employeeName,
    department,
    systemNumber,
    serverUrl,
    isConfigured: !!config.isConfigured
  };
}

// Screenshot Capture & Upload Engine
async function captureAndUpload() {
  const config = getActiveConfig();

  try {
    // 1. Capture Full Multi-Monitor OS Desktop Screen
    const imgBuffer = await screenshot({ format: 'jpeg' });
    if (!imgBuffer || imgBuffer.length === 0) return;

    const base64Image = `data:image/jpeg;base64,${imgBuffer.toString('base64')}`;
    const targetUrl = `${config.serverUrl.replace(/\/$/, '')}/api/screenshots/upload`;

    // 2. Upload to DeviceDesk Backend API
    const response = await axios.post(targetUrl, {
      employeeId: config.employeeId,
      employeeName: config.employeeName,
      department: config.department,
      base64Image: base64Image,
      captureType: 'FULL_DESKTOP',
      systemNumber: config.systemNumber,
      activityScore: 98
    }, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`[${new Date().toLocaleTimeString()}] Screenshot uploaded successfully for ${config.employeeName} (${config.employeeId}) -> ${config.serverUrl}`);
  } catch (err) {
    console.warn(`[${new Date().toLocaleTimeString()}] Agent upload warning:`, err.message);
  }
}

// IPC Handlers for Settings UI
ipcMain.on('get-config', (event) => {
  const config = getActiveConfig();
  event.reply('config-data', config);
});

ipcMain.on('save-config', (event, config) => {
  store.set('config', { ...config, isConfigured: true });
  console.log('Employee configuration updated:', config.employeeId);
  
  // Trigger immediate capture and restart loop
  captureAndUpload();
  startCaptureTimer();
});

ipcMain.on('hide-window', () => {
  if (mainWindow) mainWindow.hide();
});

function startCaptureTimer() {
  if (captureTimer) clearInterval(captureTimer);
  
  // Immediate capture after 5 seconds
  setTimeout(captureAndUpload, 5000);

  // Periodic capture loop every 3 minutes (180,000 ms)
  captureTimer = setInterval(captureAndUpload, 180000);
}

app.on('ready', () => {
  createWindow();
  createTray();

  // Show setup window on launch
  mainWindow.show();
  mainWindow.focus();

  // Start automated monitoring immediately
  startCaptureTimer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
