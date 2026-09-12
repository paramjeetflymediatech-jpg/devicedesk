const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, desktopCapturer, systemPreferences, session } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { execSync } = require('child_process');
const screenshot = require('screenshot-desktop');
const axios = require('axios');
const AutoLaunch = require('auto-launch');

const pkg = require('./package.json');
const AGENT_VERSION = pkg.version || '1.0.0';

// Handle Command Line Flags (e.g. --version, -v, --status, --help)
const rawArgs = process.argv.slice(1);
const isVersionFlag = rawArgs.some(arg => ['-v', '--version', '-V', 'version', '/v', '/version'].includes(arg.toLowerCase()));
const isStatusFlag = rawArgs.some(arg => ['--status', '-s', 'status', '--info', '-i', 'info', '/status', '/info'].includes(arg.toLowerCase()));
const isHelpFlag = rawArgs.some(arg => ['--help', '-h', 'help', '/?', '/help'].includes(arg.toLowerCase()));

if (isVersionFlag) {
  console.log(`DeviceDesk Agent v${AGENT_VERSION}`);
  process.exit(0);
}

if (isHelpFlag) {
  console.log(`
DeviceDesk Agent - Desktop Screen & Activity Logger
Version: ${AGENT_VERSION}

Usage:
  devicedesk-agent [options]
  electron . [options]
  npm run version:check

Options:
  -v, --version, version      Display the current agent version
  -s, --status, --info        Display current agent status and configuration
  -h, --help                  Show this help and options reference
`);
  process.exit(0);
}

// Logger function to capture everything to a file safely
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
    let logDir;
    try { logDir = app.getPath('userData'); } catch (e) { logDir = process.cwd(); }
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, 'agent-log.txt'), logMessage + '\n', 'utf8');

    // Also write to current working directory if writable
    const localLogPath = path.join(process.cwd(), 'agent-activity-log.txt');
    try {
      fs.appendFileSync(localLogPath, logMessage + '\n', 'utf8');
    } catch (e) {}
  } catch (err) {
    // silently catch filesystem write errors
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

// Enable Wayland / PipeWire screen capture and disable SUID sandbox barrier for portable Linux distributions
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
}

// Disable GPU Hardware Acceleration on Windows to support RDP, Citrix, Virtual Desktops, and Multi-Monitor setups
if (process.platform === 'win32') {
  try {
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('disable-software-rasterizer');
  } catch (e) {
    console.warn('Windows GPU flags initialization warning:', e.message);
  }
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
      contextIsolation: false,
      backgroundThrottling: false
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
  tray.setToolTip(`DeviceDesk Agent v${AGENT_VERSION} - User Connected`);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '💻 DeviceDesk Agent (Active)',
      enabled: false
    },
    {
      label: `ℹ️ Version: v${AGENT_VERSION}`,
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
    agentVersion: AGENT_VERSION,
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

// Handle --status / --info CLI argument if invoked
if (isStatusFlag) {
  const conf = getActiveConfig();
  console.log(`
=========================================
      DeviceDesk Desktop Agent Status    
=========================================
  Version:       v${AGENT_VERSION}
  Platform:      ${process.platform} (${process.arch})
  Node Version:  ${process.version}
  Status:        ${conf.isLoggedIn ? 'ONLINE (Logged In)' : 'STANDBY (Not Logged In)'}
  Employee Name: ${conf.employeeName || 'N/A'}
  Employee ID:   ${conf.employeeId || 'N/A'}
  Department:    ${conf.department || 'N/A'}
  System Host:   ${conf.systemNumber || os.hostname()}
  Server URL:    ${conf.serverUrl}
=========================================
`);
  process.exit(0);
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
      agentVersion: AGENT_VERSION,
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
      agentVersion: AGENT_VERSION
    }, { timeout: 10000 });
    logToFile(`Ping Heartbeat sent successfully for ${config.employeeName} [STATUS: ONLINE]`, 'INFO');
  } catch (e) {
    logToFile(`Ping Heartbeat failed: ${formatAxiosError(e)} [STATUS: OFFLINE]`, 'WARN');
  }
}

// Multi-tier Native Linux CLI screenshot fallback
function captureLinuxNativeFallback() {
  const tmpPath = path.join(os.tmpdir(), `devicedesk_cap_${Date.now()}.png`);
  const commands = [
    `gnome-screenshot -f "${tmpPath}"`,
    `import -window root "${tmpPath}"`,
    `scrot "${tmpPath}"`,
    `grim "${tmpPath}"`
  ];

  for (const cmd of commands) {
    try {
      execSync(cmd, { timeout: 3500, stdio: 'ignore' });
      if (fs.existsSync(tmpPath) && fs.statSync(tmpPath).size > 0) {
        const fileBuf = fs.readFileSync(tmpPath);
        try { fs.unlinkSync(tmpPath); } catch (e) {}
        const natImg = nativeImage.createFromBuffer(fileBuf);
        const size = natImg.getSize();
        const targetWidth = Math.min(1024, size.width || 1024);
        const resized = natImg.resize({ width: targetWidth, quality: 'medium' });
        const jpegBuf = resized.toJPEG(55);
        if (jpegBuf && jpegBuf.length > 0) {
          return `data:image/jpeg;base64,${jpegBuf.toString('base64')}`;
        }
      }
    } catch (e) {
      // try next command
    }
  }
  return null;
}

// Multi-Mode Screenshot Engine (Persistent WebRTC Stream -> Chromium desktopCapturer -> screenshot-desktop -> Native CLI fallback)
async function getScreenshotBase64() {
  // Method 1: Persistent WebRTC Stream from Renderer (Prevents repeated GNOME Wayland ScreenCast prompts)
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      const streamFrame = await new Promise((resolve) => {
        let timer = null;

        const responseHandler = (event, res) => {
          if (timer) clearTimeout(timer);
          ipcMain.removeListener('frame-capture-response', responseHandler);
          if (res && res.success && res.base64Image) {
            resolve(res.base64Image);
          } else {
            resolve(null);
          }
        };

        timer = setTimeout(() => {
          ipcMain.removeListener('frame-capture-response', responseHandler);
          resolve(null);
        }, 5000);

        ipcMain.once('frame-capture-response', responseHandler);
        mainWindow.webContents.send('request-frame-capture');
      });

      if (streamFrame) {
        return streamFrame;
      }
    } catch (streamErr) {
      logToFile(`Persistent stream capture notice: ${streamErr.message}`, 'WARN');
    }
  }

  // Method 2: Electron Native Chromium desktopCapturer (Works silently on Windows, macOS, and Linux X11)
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1024, height: 576 }
    });

    if (sources && sources.length > 0) {
      const validSource = sources.find(s => s.thumbnail && !s.thumbnail.isEmpty()) || sources[0];
      if (validSource && validSource.thumbnail && !validSource.thumbnail.isEmpty()) {
        const jpegBuf = validSource.thumbnail.toJPEG(55);
        if (jpegBuf && jpegBuf.length > 0) {
          return `data:image/jpeg;base64,${jpegBuf.toString('base64')}`;
        }
      }
    }
  } catch (nativeErr) {
    logToFile(`Native desktopCapturer notice: ${nativeErr.message}`, 'WARN');
  }

  // Method 3: Fallback to screenshot-desktop
  try {
    const rawBuffer = await screenshot({ format: 'png' });
    if (rawBuffer && rawBuffer.length > 0) {
      const natImg = nativeImage.createFromBuffer(rawBuffer);
      const size = natImg.getSize();
      const targetWidth = Math.min(1024, size.width || 1024);
      const resized = natImg.resize({ width: targetWidth, quality: 'medium' });
      const jpegBuf = resized.toJPEG(55);
      return `data:image/jpeg;base64,${jpegBuf.toString('base64')}`;
    }
  } catch (scErr) {
    logToFile(`screenshot-desktop fallback notice: ${scErr.message}`, 'WARN');
  }

  // Method 4: Linux Native Tools (gnome-screenshot, import, scrot, grim)
  if (process.platform === 'linux') {
    const cliCapture = captureLinuxNativeFallback();
    if (cliCapture) return cliCapture;
  }

  return null;
}

async function captureAndUpload() {
  const config = getActiveConfig();
  if (!config.isLoggedIn) return;

  const base64Image = await getScreenshotBase64();

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

  // Automatically approve display capture streams for renderer
  if (session && session.defaultSession) {
    try {
      if (typeof session.defaultSession.setDisplayMediaRequestHandler === 'function') {
        session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
          desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
            if (sources && sources.length > 0) {
              callback({ video: sources[0] });
            } else {
              callback({ video: null });
            }
          }).catch(() => {
            callback({ video: null });
          });
        });
      }

      if (typeof session.defaultSession.setPermissionRequestHandler === 'function') {
        session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
          callback(true);
        });
      }
    } catch (sessErr) {
      logToFile(`Session handler notice: ${sessErr.message}`, 'WARN');
    }
  }

  setupAutoLaunch();
  createWindow();
  createTray();

  // Check macOS Screen Recording permissions
  if (process.platform === 'darwin' && systemPreferences && systemPreferences.getMediaAccessStatus) {
    try {
      const status = systemPreferences.getMediaAccessStatus('screen');
      logToFile(`macOS Screen Recording Access Status: ${status}`, 'INFO');
      if (status !== 'granted') {
        logToFile('NOTICE: macOS Screen Recording permission required. Please enable DeviceDeskAgent in System Settings -> Privacy & Security -> Screen Recording.', 'WARN');
      }
    } catch (e) {
      logToFile(`macOS media access check warning: ${e.message}`, 'WARN');
    }
  }

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
