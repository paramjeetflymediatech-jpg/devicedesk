import Client from 'ssh2-sftp-client';
import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { cookies } from 'next/headers';
import { getDbConnection } from '../db/db.js';

// Whitelist of allowed extensions for security
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'xlsx', 'xls', 'csv', 'doc', 'docx', 'txt', 'mp4', 'webm', 'ogg', 'mov', 'm4v', 'avi', 'mkv', 'mp3', 'wav', 'm4a', 'aac', 'caf', '3gp', 'amr'];

/**
 * Checks if a filename has a whitelisted safe extension.
 */
export function isSafeExtension(filename) {
  if (!filename) return false;
  const parts = filename.split('.');
  if (parts.length < 2) return false;
  const ext = parts.pop().toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Sanitizes the filename by removing path traversal characters and non-alphanumeric symbols,
 * and pre-pends a unique high-entropy timestamp to prevent collisions.
 */
export function sanitizeFilename(filename) {
  if (!filename) return '';
  const parts = filename.split('.');
  const ext = parts.pop().toLowerCase();
  const base = parts.join('.');
  // Keep only alphanumeric characters, dashes, and underscores
  const cleanBase = base.replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueToken = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  return `${uniqueToken}_${cleanBase}.${ext}`;
}

/**
 * Verifies that the requester has a valid, active user account by reading cookies
 * and verifying against the database.
 */
export async function checkAuth(req) {
  try {
    let userId = null;

    // 1. Try reading cookie (Web App)
    try {
      let authCookie = null;
      if (req && req.cookies && typeof req.cookies.get === 'function') {
        authCookie = req.cookies.get('devicedesk_auth_user');
      } else {
        const cookieStore = await cookies();
        authCookie = cookieStore.get('devicedesk_auth_user');
      }

      if (authCookie && authCookie.value) {
        const parsed = JSON.parse(decodeURIComponent(authCookie.value));
        userId = parsed?.id || null;
      }
    } catch (e) {
      console.warn("Failed to read auth cookie:", e);
    }

    // 2. Try reading x-user-id header (Mobile App)
    if (!userId && req) {
      if (typeof req.headers?.get === 'function') {
        userId = req.headers.get('x-user-id') || req.headers.get('authorization');
      } else if (req.headers) {
        userId = req.headers['x-user-id'] || req.headers['authorization'];
      }
    }

    if (!userId) {
      console.log('checkAuth failed: no userId found from cookies or headers');
      return null;
    }

    const db = await getDbConnection();
    const [rows] = await db.execute(
      'SELECT id, name, email, role, department, status FROM employees WHERE id = ? LIMIT 1',
      [userId]
    );
    if (rows.length === 0) {
      console.log('checkAuth failed: User not found in DB for ID:', userId);
      return null;
    }
    if (rows[0].status !== 'Active') {
      console.log('checkAuth failed: User status is not Active. Status:', rows[0].status);
      return null;
    }
    return rows[0];
  } catch (err) {
    console.error('Session authentication check failed:', err);
    return null;
  }
}

function getEnvVariable(key, fallback = '') {
  if (process.env[key] && process.env[key].trim() !== '') {
    return process.env[key].trim();
  }
  try {
    const fsSync = require('fs');
    const pathSync = require('path');
    const envPath = pathSync.resolve(process.cwd(), '.env.local');
    if (fsSync.existsSync(envPath)) {
      const content = fsSync.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match && match[1] === key) {
          let val = match[2] || '';
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          return val.trim();
        }
      }
    }
  } catch (e) {}
  return fallback;
}

/**
 * Safely resolves the SFTP configuration, using a private key file if it exists,
 * or falling back to password auth.
 */
async function getSftpConfig() {
  const host = getEnvVariable('WHM_SFTP_HOST', '2a00:1169:115:1590::');
  const port = parseInt(getEnvVariable('WHM_SFTP_PORT', '22'));
  const username = getEnvVariable('WHM_SFTP_USER', 'storage');
  const password = getEnvVariable('WHM_SFTP_PASS', '1Sparsh@2@2@');

  const config = {
    host,
    port,
    username,
    password,
    tryKeyboard: true,
    readyTimeout: 15000,
    retries: 1,
    retry_factor: 1,
    retry_min_delay: 1000
  };

  const keyPath = getEnvVariable('WHM_SFTP_KEY_PATH');
  if (keyPath && keyPath !== 'uploads' && keyPath.trim() !== '') {
    try {
      const stats = await fs.stat(keyPath);
      if (stats.isFile()) {
        config.privateKey = await fs.readFile(keyPath, 'utf8');
      }
    } catch (err) {
      // Fall back to password auth
    }
  }

  return config;
}

/**
 * Uploads a file buffer either locally or to remote SFTP storage under an optional subfolder.
 */
export async function uploadFile(buffer, filename, subfolder = '') {
  if (!isSafeExtension(filename)) {
    throw new Error('Unsafe or unsupported file type. Upload rejected.');
  }

  const uniqueFilename = sanitizeFilename(filename);
  const provider = String(getEnvVariable('STORAGE_PROVIDER', 'local')).toLowerCase().trim();

  let sftpSuccess = false;
  if (provider === 'sftp') {
    const sftp = new Client();
    try {
      const config = await getSftpConfig();
      await sftp.connect(config);

      let remoteDir = process.env.WHM_SFTP_REMOTE_PATH || '/uploads';
      if (subfolder) {
        remoteDir = `${remoteDir.replace(/\/$/, '')}/${subfolder.replace(/^\//, '')}`;
      }

      const dirExists = await sftp.exists(remoteDir);
      if (!dirExists) {
        await sftp.mkdir(remoteDir, true);
      }

      const remoteFilePath = `${remoteDir.replace(/\/$/, '')}/${uniqueFilename}`;
      await sftp.put(buffer, remoteFilePath);
      sftpSuccess = true;

      // Return full public URL if WHM_SFTP_BASE_URL is defined, else relative path
      const baseUrl = process.env.WHM_SFTP_BASE_URL;
      if (baseUrl) {
        const cleanBase = baseUrl.replace(/\/$/, '');
        const folderPath = subfolder ? `/${subfolder.replace(/^\//, '')}` : '';
        return `${cleanBase}${folderPath}/${uniqueFilename}`;
      }

      return subfolder ? `/uploads/${subfolder.replace(/^\//, '')}/${uniqueFilename}` : uniqueFilename;
    } catch (err) {
      console.error('SFTP Upload failed, falling back to local:', err.message);
    } finally {
      try { await sftp.end(); } catch (e) {}
    }
  }
  
  if (!sftpSuccess) {
    // Local storage fallback
    const targetDir = subfolder 
      ? join(process.cwd(), 'public', 'uploads', subfolder.replace(/^\//, ''))
      : join(process.cwd(), 'public', 'uploads');

    await fs.mkdir(targetDir, { recursive: true });
    const localFilePath = join(targetDir, uniqueFilename);
    await fs.writeFile(localFilePath, buffer);

    if (subfolder) {
      return `/uploads/${subfolder.replace(/^\//, '')}/${uniqueFilename}`;
    }
    return `/uploads/${uniqueFilename}`;
  }
}

/**
 * Downloads a file buffer either from local disk or from remote SFTP storage.
 */
export async function downloadFile(filename, subfolder = '') {
  const safeFilename = basename(filename);
  const provider = String(process.env.STORAGE_PROVIDER || 'local').toLowerCase().trim();

  // Auto-detect screenshots subfolder if filename starts with scr_
  if (!subfolder && safeFilename.startsWith('scr_')) {
    subfolder = 'devicedesk/screenshots';
  }

  // 1. FAST LOCAL CHECK FIRST: If file exists locally on disk, return it immediately without network delay
  const targetDir = subfolder 
    ? join(process.cwd(), 'public', 'uploads', subfolder.replace(/^\//, ''))
    : join(process.cwd(), 'uploads');
  const localFilePath = join(targetDir, safeFilename);

  try {
    return await fs.readFile(localFilePath);
  } catch (e) {
    // Try root public/uploads/ or uploads/
    try {
      const rootPath = join(process.cwd(), 'public', 'uploads', safeFilename);
      return await fs.readFile(rootPath);
    } catch (errRoot) {
      // Not found locally, proceed to remote SFTP if configured
    }
  }

  // 2. REMOTE SFTP CHECK (only if configured and file is not found locally)
  if (provider === 'sftp') {
    const sftp = new Client();
    try {
      const config = await getSftpConfig();
      await sftp.connect(config);

      let remoteDir = process.env.WHM_SFTP_REMOTE_PATH || '/uploads';
      if (subfolder) {
        remoteDir = `${remoteDir.replace(/\/$/, '')}/${subfolder.replace(/^\//, '')}`;
      }

      let remoteFilePath = `${remoteDir.replace(/\/$/, '')}/${safeFilename}`;
      let fileExists = await sftp.exists(remoteFilePath);

      // Fallback Check 1: devicedesk/screenshots subfolder
      if (!fileExists) {
        const deviceDeskPath = `${(process.env.WHM_SFTP_REMOTE_PATH || '/uploads').replace(/\/$/, '')}/devicedesk/screenshots/${safeFilename}`;
        if (await sftp.exists(deviceDeskPath)) {
          remoteFilePath = deviceDeskPath;
          fileExists = true;
        }
      }

      // Fallback Check 2: legacy screenshots subfolder
      if (!fileExists) {
        const screenshotsPath = `${(process.env.WHM_SFTP_REMOTE_PATH || '/uploads').replace(/\/$/, '')}/screenshots/${safeFilename}`;
        if (await sftp.exists(screenshotsPath)) {
          remoteFilePath = screenshotsPath;
          fileExists = true;
        }
      }

      // Fallback Check 3: root uploads directory
      if (!fileExists) {
        const rootPath = `${(process.env.WHM_SFTP_REMOTE_PATH || '/uploads').replace(/\/$/, '')}/${safeFilename}`;
        if (await sftp.exists(rootPath)) {
          remoteFilePath = rootPath;
          fileExists = true;
        }
      }

      if (fileExists) {
        const fileBuffer = await sftp.get(remoteFilePath);
        return fileBuffer;
      }
    } catch (sftpErr) {
      console.warn(`SFTP download notice for "${safeFilename}":`, sftpErr.message);
    } finally {
      try { await sftp.end(); } catch (e) {}
    }
  }

  throw new Error(`File '${safeFilename}' could not be found locally or on remote storage.`);
}

/**
 * Deletes a file from local disk or remote SFTP storage given its URL or filename.
 * Silently ignores errors if the file doesn't exist.
 */
export async function deleteFile(fileUrlOrName) {
  if (!fileUrlOrName) return;

  const safeFilename = basename(fileUrlOrName);
  if (!safeFilename || !isSafeExtension(safeFilename)) return;

  let subfolder = '';
  try {
    const urlObj = new URL(fileUrlOrName, 'http://localhost');
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length > 2) {
      const lastFolder = pathParts[pathParts.length - 2];
      if (lastFolder !== 'uploads') {
        subfolder = lastFolder;
      }
    }
  } catch (e) {}

  // Always cleanup local disk copies immediately if present
  try {
    const pathsToUnlink = [
      join(process.cwd(), 'public', 'uploads', 'devicedesk', 'screenshots', safeFilename),
      join(process.cwd(), 'public', 'uploads', 'screenshots', safeFilename),
      join(process.cwd(), 'public', 'uploads', safeFilename),
      join(process.cwd(), 'uploads', safeFilename)
    ];
    for (const p of pathsToUnlink) {
      fs.unlink(p).catch(() => {});
    }
  } catch (e) {}

  try {
    const provider = String(process.env.STORAGE_PROVIDER || 'local').toLowerCase().trim();
    if (provider === 'sftp') {
      const sftp = new Client();
      try {
        const config = await getSftpConfig();
        await sftp.connect(config);

        let remoteDir = process.env.WHM_SFTP_REMOTE_PATH || '/uploads';
        if (subfolder) {
          remoteDir = `${remoteDir.replace(/\/$/, '')}/${subfolder}`;
        }

        const remoteFilePath = `${remoteDir.replace(/\/$/, '')}/${safeFilename}`;
        const fileExists = await sftp.exists(remoteFilePath);
        if (fileExists) {
          await sftp.delete(remoteFilePath);
        }
      } finally {
        await sftp.end();
      }
    }
  } catch (err) {
    console.warn(`deleteFile notice for "${safeFilename}":`, err.message);
  }
}
