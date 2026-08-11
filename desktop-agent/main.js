const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, desktopCapturer } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const screenshot = require('screenshot-desktop');
const axios = require('axios');
const AutoLaunch = require('auto-launch');

// Enable Wayland / PipeWire screen capture for modern Linux/Ubuntu distributions
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
}

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
    title: 'DeviceDesk Agent Login',
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
  tray.setToolTip('DeviceDesk Agent - User Connected');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '💻 DeviceDesk Agent (Active)',
      enabled: false
    },
    { type: 'separator' },
    {
      label: '👤 Account & Settings',
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

// Get Active Configuration with automatic OS Fallback & Dynamic Server URL Sanitization
function getActiveConfig() {
  const config = loadConfig();
  const osUser = os.userInfo() ? os.userInfo().username : 'employee';
  const osHost = os.hostname() || 'desktop';

  const employeeId = config.employeeId || osUser;
  const employeeName = config.employeeName || osUser;
  const userEmail = config.userEmail || '';
  const department = config.department || 'General';
  const systemNumber = config.systemNumber || osHost;

  let serverUrl = config.serverUrl || process.env.DEVICEDESK_SERVER_URL || 'https://devicedesk.flymediatech.com';
  if (!serverUrl || serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1')) {
    serverUrl = 'https://devicedesk.flymediatech.com';
  }
  serverUrl = serverUrl.replace(/\/$/, '');

  return {
    employeeId,
    employeeName,
    userEmail,
    department,
    systemNumber,
    serverUrl,
    isLoggedIn: !!config.isLoggedIn,
    isConfigured: !!config.isConfigured
  };
}

// Automatically register system on server startup
async function registerAgentOnline() {
  const config = getActiveConfig();
  if (!config.isLoggedIn) return;

  try {
    const regUrl = `${config.serverUrl}/api/agent/register`;
    await axios.post(regUrl, {
      employeeId: config.employeeId,
      employeeName: config.employeeName,
      department: config.department,
      systemNumber: config.systemNumber,
      osPlatform: process.platform || 'windows',
      serverUrl: config.serverUrl
    }, { timeout: 15000 });
    console.log(`[${new Date().toLocaleTimeString()}] Agent registered online for ${config.employeeName} (${config.employeeId})`);
  } catch (e) {
    console.warn(`[${new Date().toLocaleTimeString()}] Agent online registration notice:`, e.message);
  }
}

// Periodic Ping Heartbeat to Server (Every 60s)
async function sendPingHeartbeat() {
  const config = getActiveConfig();
  if (!config.isLoggedIn) return;

  try {
    const pingUrl = `${config.serverUrl}/api/agent/ping`;
    await axios.post(pingUrl, {
      employeeId: config.employeeId,
      employeeName: config.employeeName,
      department: config.department,
      systemNumber: config.systemNumber,
      osPlatform: process.platform || 'windows',
      agentVersion: '1.0.0'
    }, { timeout: 10000 });
  } catch (e) {
    // Silent fail on network ping timeout
  }
}

// Dual-Mode Screenshot Engine (Chromium Native desktopCapturer + screenshot-desktop fallback)
async function captureAndUpload() {
  const config = getActiveConfig();
  if (!config.isLoggedIn) return;

  let base64Image = '';

  // Method 1: Electron Native Chromium desktopCapturer (Bypasses Windows Defender Temp EXE Block)
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1024, height: 576 }
    });

    if (sources && sources.length > 0) {
      const primarySource = sources[0];
      const jpegBuf = primarySource.thumbnail.toJPEG(55);
      if (jpegBuf && jpegBuf.length > 0) {
        base64Image = `data:image/jpeg;base64,${jpegBuf.toString('base64')}`;
      }
    }
  } catch (nativeErr) {
    console.warn('Native desktopCapturer notice:', nativeErr.message);
  }

  // Method 2: Fallback to screenshot-desktop
  if (!base64Image) {
    try {
      const rawBuffer = await screenshot({ format: 'png' });
      if (rawBuffer && rawBuffer.length > 0) {
        const natImg = nativeImage.createFromBuffer(rawBuffer);
        const size = natImg.getSize();
        const targetWidth = Math.min(1024, size.width || 1024);
        const resized = natImg.resize({ width: targetWidth, quality: 'medium' });
        const jpegBuf = resized.toJPEG(55);
        base64Image = `data:image/jpeg;base64,${jpegBuf.toString('base64')}`;
      }
    } catch (scErr) {
      console.warn('screenshot-desktop fallback notice:', scErr.message);
    }
  }

  if (!base64Image) {
    console.warn(`[${new Date().toLocaleTimeString()}] Desktop capture produced empty image. Skipping upload cycle.`);
    return;
  }

  try {
    const targetUrl = `${config.serverUrl}/api/screenshots/upload`;

    // Upload payload to DeviceDesk Backend API
    const res = await axios.post(targetUrl, {
      employeeId: config.employeeId,
      employeeName: config.employeeName,
      department: config.department,
      base64Image: base64Image,
      captureType: 'FULL_DESKTOP',
      systemNumber: config.systemNumber,
      activityScore: 98
    }, {
      timeout: 30000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`[${new Date().toLocaleTimeString()}] Desktop Screenshot uploaded successfully for ${config.employeeName} (${config.employeeId}) -> Status: ${res.status}`);
  } catch (err) {
    console.warn(`[${new Date().toLocaleTimeString()}] Agent upload warning:`, err.response?.status || err.message);
  }
}

// IPC Handlers for Agent UI & Login
ipcMain.on('get-config', (event) => {
  const config = getActiveConfig();
  event.reply('config-data', config);
});

ipcMain.on('agent-login', async (event, { identifier, password, serverUrl }) => {
  let targetServer = serverUrl || 'https://devicedesk.flymediatech.com';
  targetServer = targetServer.replace(/\/$/, '');
  const osHost = os.hostname() || 'desktop';

  try {
    const loginUrl = `${targetServer}/api/agent/login`;
    const res = await axios.post(loginUrl, {
      identifier,
      password,
      systemNumber: osHost,
      serverUrl: targetServer,
      osPlatform: process.platform || 'windows'
    }, { timeout: 15000 });

    if (res.data && res.data.success) {
      const user = res.data.user;
      const userConfig = saveConfig({
        employeeId: user.id,
        employeeName: user.name,
        userEmail: user.email,
        department: user.department,
        systemNumber: osHost,
        serverUrl: targetServer,
        isLoggedIn: true,
        isConfigured: true
      });

      // Trigger immediate registration & activity loops
      registerAgentOnline();
      sendPingHeartbeat();
      startCaptureTimer();

      event.reply('login-result', { success: true, userConfig });
    } else {
      event.reply('login-result', { success: false, message: res.data?.message || 'Login failed.' });
    }
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message || 'Server connection error.';
    event.reply('login-result', { success: false, message: errorMsg });
  }
});

ipcMain.on('agent-logout', () => {
  saveConfig({
    isLoggedIn: false,
    isConfigured: false
  });
  if (captureTimer) clearInterval(captureTimer);
  console.log('User logged out from desktop agent.');
});

ipcMain.on('hide-window', () => {
  if (mainWindow) mainWindow.hide();
});

function startCaptureTimer() {
  if (captureTimer) clearInterval(captureTimer);
  const config = getActiveConfig();
  if (!config.isLoggedIn) return;

  // Immediate capture after 5 seconds
  setTimeout(captureAndUpload, 5000);

  // Periodic capture loop every 3 minutes (180,000 ms)
  captureTimer = setInterval(captureAndUpload, 180000);
}

app.whenReady().then(() => {
  setupAutoLaunch();
  createWindow();
  createTray();

  const config = getActiveConfig();

  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }

  // Register online and start monitoring only if user is logged in
  if (config.isLoggedIn) {
    registerAgentOnline();
    sendPingHeartbeat();
    startCaptureTimer();
  }

  // Periodic heartbeat every 60 seconds (60,000 ms)
  setInterval(sendPingHeartbeat, 60000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
