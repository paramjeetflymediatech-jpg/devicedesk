const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, desktopCapturer } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const screenshot = require('screenshot-desktop');
const axios = require('axios');
const AutoLaunch = require('auto-launch');

// Logger function to capture everything to a file
function logToFile(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}`;
  
  if (type === 'ERROR') {
    console.error(logMessage);
  } else if (type === 'WARN') {
    console.warn(logMessage);
  } else {
    console.log(logMessage);
  }
  
  try {
    // Write to standard appData log path
    let logDir;
    try { logDir = app.getPath('userData'); } catch (e) { logDir = __dirname; }
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, 'agent-log.txt'), logMessage + '\n', 'utf8');

    // ALSO write to current directory (d:\\devicedesk\\desktop-agent) so it is easily visible to developers
    const localLogPath = path.join(__dirname, 'agent-activity-log.txt');
    fs.appendFileSync(localLogPath, logMessage + '\n', 'utf8');
  } catch (err) {
    console.error(`[${timestamp}] [ERROR] Failed to write to log file:`, err.message);
  }
}

// Helper to extract detailed server error info dynamically
function formatAxiosError(err) {
  if (err.response) {
    // The server responded with a status code outside the 2xx range
    const dataStr = typeof err.response.data === 'object' ? JSON.stringify(err.response.data) : err.response.data;
    return `[Status: ${err.response.status}] [URL: ${err.config?.url}] Response: ${dataStr}`;
  } else if (err.request) {
    // The request was made but no response was received (e.g. server down, network issue)
    return `[Network/Timeout] [URL: ${err.config?.url}] Code: ${err.code || 'UNKNOWN_ERROR'}`;
  } else {
    // Something happened in setting up the request
    return `[Client Error] ${err.message}`;
  }
}

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
    logToFile(`Load agent config warning: ${err.message}`, 'WARN');
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
    logToFile(`Save agent config warning: ${err.message}`, 'WARN');
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
        agentAutoLauncher.enable().catch((err) => {
          logToFile(`AutoLaunch enable error: ${err.message}`, 'ERROR');
        });
      }
    }).catch((err) => {
      logToFile(`AutoLaunch check error: ${err.message}`, 'ERROR');
    });
  } catch (e) {
    logToFile(`AutoLaunch notice: ${e.message}`, 'WARN');
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
    logToFile(`Agent registered online for ${config.employeeName} (${config.employeeId}) [STATUS: ONLINE]`, 'INFO');
  } catch (e) {
    logToFile(`Agent online registration failed: ${formatAxiosError(e)} [STATUS: OFFLINE]`, 'WARN');
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
    logToFile(`Ping Heartbeat sent successfully for ${config.employeeName} [STATUS: ONLINE]`, 'INFO');
  } catch (e) {
    logToFile(`Ping Heartbeat failed: ${formatAxiosError(e)} [STATUS: OFFLINE]`, 'WARN');
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
    logToFile(`Native desktopCapturer notice: ${nativeErr.message}`, 'WARN');
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
      logToFile(`screenshot-desktop fallback notice: ${scErr.message}`, 'WARN');
    }
  }

  if (!base64Image) {
    logToFile('SCREENSHOT FAILED: Desktop capture produced empty image. No screenshot to upload.', 'WARN');
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

    logToFile(`SCREENSHOT UPLOAD SUCCESS: Desktop Screenshot uploaded successfully for ${config.employeeName} (${config.employeeId}) -> Status: ${res.status}`, 'INFO');
  } catch (err) {
    logToFile(`SCREENSHOT UPLOAD FAILED (Error): ${formatAxiosError(err)}`, 'ERROR');
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
      logToFile(`Login successful for user: ${user.name} (${user.id})`, 'INFO');
      registerAgentOnline();
      sendPingHeartbeat();
      startCaptureTimer();

      event.reply('login-result', { success: true, userConfig });
    } else {
      logToFile(`Login failed: ${res.data?.message || 'Unknown reason'}`, 'WARN');
      event.reply('login-result', { success: false, message: res.data?.message || 'Login failed.' });
    }
  } catch (err) {
    const uiErrorMsg = err.response?.data?.message || 'Server connection error.';
    logToFile(`Login error: ${formatAxiosError(err)}`, 'ERROR');
    event.reply('login-result', { success: false, message: uiErrorMsg });
  }
});

async function sendServerLog(action, details) {
  try {
    const config = getActiveConfig();
    const targetServer = config.serverUrl || 'https://devicedesk.flymediatech.com';
    const logUrl = `${targetServer}/api/developer/agent-logs`;
    
    await axios.post(logUrl, {
      employeeId: config.employeeId || 'UNKNOWN',
      employeeName: config.employeeName || 'Unknown Employee',
      action: action,
      details: details
    }, { timeout: 10000 });
  } catch (err) {
    logToFile(`Failed to send log to server: ${err.message}`, 'WARN');
  }
}

ipcMain.on('agent-logout', async () => {
  const config = getActiveConfig();
  if (config.isLoggedIn) {
    await sendServerLog('LOGOUT', `User ${config.employeeName} explicitly logged out from their ${process.platform} agent.`);
  }

  saveConfig({
    isLoggedIn: false,
    isConfigured: false
  });
  if (captureTimer) clearInterval(captureTimer);
  logToFile('User logged out from desktop agent.', 'INFO');
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
  logToFile('DeviceDesk Agent is starting...', 'INFO');
  setupAutoLaunch();
  createWindow();
  createTray();

  const config = getActiveConfig();
  logToFile(`Loaded config. isLoggedIn: ${config.isLoggedIn}, isConfigured: ${config.isConfigured}`, 'INFO');

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
