const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const screenshot = require('screenshot-desktop');
const axios = require('axios');
const AutoLaunch = require('auto-launch');

let mainWindow = null;
let tray = null;
let captureTimer = null;

// Crash-proof native JSON file storage
function getConfigFile() {
  try {
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    return path.join(userDataPath, 'agent-config.json');
  } catch (e) {
    return path.join(__dirname, 'agent-config.json');
  }
}

function loadConfig() {
  try {
    const filePath = getConfigFile();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn('Load agent config warning:', err.message);
  }
  return {};
}

function saveConfig(data) {
  try {
    const filePath = getConfigFile();
    const existing = loadConfig();
    const merged = { ...existing, ...data };
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf8');
    return merged;
  } catch (err) {
    console.warn('Save agent config warning:', err.message);
    return data;
  }
}

// Safely initialize AutoLaunch on startup without crashing process
function setupAutoLaunch() {
  try {
    const agentAutoLauncher = new AutoLaunch({
      name: 'DeviceDeskAgent',
      path: process.execPath
    });
    agentAutoLauncher.isEnabled().then((isEnabled) => {
      if (!isEnabled) {
        agentAutoLauncher.enable().catch(() => {});
      }
    }).catch(() => {});
  } catch (e) {
    console.warn('AutoLaunch notice:', e.message);
  }
}

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

// Get Active Configuration with automatic OS Fallback
function getActiveConfig() {
  const config = loadConfig();
  const osUser = os.userInfo() ? os.userInfo().username : 'employee';
  const osHost = os.hostname() || 'desktop';

  const employeeId = config.employeeId || osUser;
  const employeeName = config.employeeName || osUser;
  const department = config.department || 'General';
  const systemNumber = config.systemNumber || osHost;

  let serverUrl = config.serverUrl || process.env.DEVICEDESK_SERVER_URL || 'https://devicedesk.flymediatech.com';

  return {
    employeeId,
    employeeName,
    department,
    systemNumber,
    serverUrl,
    isConfigured: !!config.isConfigured
  };
}

// Screenshot Capture & Upload Engine (With high-performance image compression)
async function captureAndUpload() {
  const config = getActiveConfig();

  try {
    // 1. Capture Full Multi-Monitor OS Desktop Screen
    const rawBuffer = await screenshot({ format: 'png' });
    if (!rawBuffer || rawBuffer.length === 0) return;

    // 2. Compress & Resize using Electron nativeImage (Ensures payload is < 200 KB so uploads never fail)
    let base64Image = '';
    try {
      const natImg = nativeImage.createFromBuffer(rawBuffer);
      const size = natImg.getSize();
      const targetWidth = Math.min(1280, size.width || 1280);
      const resized = natImg.resize({ width: targetWidth });
      const jpegBuf = resized.toJPEG(70);
      base64Image = `data:image/jpeg;base64,${jpegBuf.toString('base64')}`;
    } catch (compErr) {
      base64Image = `data:image/jpeg;base64,${rawBuffer.toString('base64')}`;
    }

    const targetUrl = `${config.serverUrl.replace(/\/$/, '')}/api/screenshots/upload`;

    // 3. Upload to DeviceDesk Backend API
    await axios.post(targetUrl, {
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

    console.log(`[${new Date().toLocaleTimeString()}] Desktop Screenshot uploaded successfully for ${config.employeeName} (${config.employeeId}) -> ${config.serverUrl}`);
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
  saveConfig({ ...config, isConfigured: true });
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

app.whenReady().then(() => {
  setupAutoLaunch();
  createWindow();
  createTray();

  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }

  // Start automated monitoring immediately
  startCaptureTimer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
