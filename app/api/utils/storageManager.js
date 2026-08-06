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
      const cookieStore = await cookies();
      const authCookie = cookieStore.get('devicedesk_auth_user');
      if (authCookie && authCookie.value) {
        const parsed = JSON.parse(decodeURIComponent(authCookie.value));
        userId = parsed?.id || null;
      }
    } catch (e) {}

    // 2. Try reading x-user-id header (Mobile App)
    if (!userId && req) {
      if (typeof req.headers?.get === 'function') {
        userId = req.headers.get('x-user-id') || req.headers.get('authorization');
      } else if (req.headers) {
        userId = req.headers['x-user-id'] || req.headers['authorization'];
      }
    }

    if (!userId) {
      return null;
    }

    const db = await getDbConnection();
    const [rows] = await db.execute(
      'SELECT id, name, email, role, status FROM employees WHERE id = ? LIMIT 1',
      [userId]
    );
    if (rows.length === 0 || rows[0].status !== 'Active') {
      return null;
    }
    return rows[0];
  } catch (err) {
    console.error('Session authentication check failed:', err);
    return null;
  }
}

/**
 * Safely resolves the SFTP configuration, using a private key file if it exists,
 * or falling back to password auth.
 */
async function getSftpConfig() {
  const config = {
    host: process.env.WHM_SFTP_HOST,
    port: parseInt(process.env.WHM_SFTP_PORT || '22'),
    username: process.env.WHM_SFTP_USER,
  };

  const keyPath = process.env.WHM_SFTP_KEY_PATH;
  if (keyPath) {
    try {
      const stats = await fs.stat(keyPath);
      if (stats.isFile()) {
        config.privateKey = await fs.readFile(keyPath, 'utf8');
        return config;
      }
    } catch (err) {
      console.warn(`WHM_SFTP_KEY_PATH file not found or unreadable ("${keyPath}"). Falling back to password auth.`);
    }
  }

  config.password = process.env.WHM_SFTP_PASS;
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
  const provider = process.env.STORAGE_PROVIDER || 'local';

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

      // Return full public URL if WHM_SFTP_BASE_URL is defined, else relative path
      const baseUrl = process.env.WHM_SFTP_BASE_URL;
      if (baseUrl) {
        const cleanBase = baseUrl.replace(/\/$/, '');
        const folderPath = subfolder ? `/${subfolder.replace(/^\//, '')}` : '';
        return `${cleanBase}${folderPath}/${uniqueFilename}`;
      }

      return subfolder ? `/uploads/${subfolder.replace(/^\//, '')}/${uniqueFilename}` : uniqueFilename;
    } finally {
      await sftp.end();
    }
  } else {
    // Local storage fallback
    const targetDir = subfolder 
      ? join(process.cwd(), 'public', 'uploads', subfolder.replace(/^\//, ''))
      : join(process.cwd(), 'uploads');

    await fs.mkdir(targetDir, { recursive: true });
    const localFilePath = join(targetDir, uniqueFilename);
    await fs.writeFile(localFilePath, buffer);

    if (subfolder) {
      return `/uploads/${subfolder.replace(/^\//, '')}/${uniqueFilename}`;
    }
    return uniqueFilename;
  }
}

/**
 * Downloads a file buffer either from local disk or from remote SFTP storage.
 */
export async function downloadFile(filename, subfolder = '') {
  const safeFilename = basename(filename);
  const provider = process.env.STORAGE_PROVIDER || 'local';

  // Auto-detect screenshots subfolder if filename starts with scr_
  if (!subfolder && safeFilename.startsWith('scr_')) {
    subfolder = 'devicedesk/screenshots';
  }

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

      if (!fileExists) {
        throw new Error(`File '${safeFilename}' not found on remote SFTP storage.`);
      }

      const fileBuffer = await sftp.get(remoteFilePath);
      return fileBuffer;
    } finally {
      await sftp.end();
    }
  } else {
    // Local storage fallback
    const targetDir = subfolder 
      ? join(process.cwd(), 'public', 'uploads', subfolder.replace(/^\//, ''))
      : join(process.cwd(), 'uploads');
      
    const localFilePath = join(targetDir, safeFilename);
    try {
      return await fs.readFile(localFilePath);
    } catch (err) {
      // Fallback to public/uploads/ or uploads/ root
      const rootPath = join(process.cwd(), 'public', 'uploads', safeFilename);
      return await fs.readFile(rootPath);
    }
  }
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
