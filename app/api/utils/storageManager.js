import Client from 'ssh2-sftp-client';
import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { cookies } from 'next/headers';
import { getDbConnection } from '../db/db.js';

// Whitelist of allowed extensions for security
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'xlsx', 'xls', 'csv', 'docx', 'txt', 'mp4', 'webm', 'ogg', 'mov', 'm4v', 'avi', 'mkv', 'mp3', 'wav', 'm4a', 'aac', 'caf', '3gp', 'amr', 'psd', 'zip', 'rar'];

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
      let rawCookieValue = null;

      if (req && req.cookies) {
        if (typeof req.cookies.get === 'function') {
          // Next.js App Router Request (NextRequest)
          const c = req.cookies.get('devicedesk_auth_user');
          rawCookieValue = c?.value || null;
        } else if (typeof req.cookies === 'object') {
          // Next.js Pages Router Request (NextApiRequest)
          rawCookieValue = req.cookies['devicedesk_auth_user'] || null;
        }
      }

      // Check raw Cookie header if not yet found
      if (!rawCookieValue && req && req.headers) {
        let cookieHeader = '';
        if (typeof req.headers.get === 'function') {
          cookieHeader = req.headers.get('cookie') || '';
        } else if (typeof req.headers.cookie === 'string') {
          cookieHeader = req.headers.cookie;
        } else if (typeof req.headers['cookie'] === 'string') {
          cookieHeader = req.headers['cookie'];
        }
        if (cookieHeader) {
          const match = cookieHeader.match(/(?:^|;\s*)devicedesk_auth_user=([^;]*)/);
          if (match) {
            rawCookieValue = decodeURIComponent(match[1]);
          }
        }
      }

      // Fallback to next/headers cookies() only if no req provided (App Router server component context)
      if (!rawCookieValue && !req) {
        try {
          const cookieStore = await cookies();
          const c = cookieStore.get('devicedesk_auth_user');
          rawCookieValue = c?.value || null;
        } catch (e) {
          // Ignore if called outside request scope
        }
      }

      if (rawCookieValue) {
        const decoded = typeof rawCookieValue === 'string' && rawCookieValue.startsWith('%') 
          ? decodeURIComponent(rawCookieValue) 
          : rawCookieValue;
        const parsed = typeof decoded === 'object' ? decoded : JSON.parse(decoded);
        userId = parsed?.id || null;
      }
    } catch (e) {
      // Quiet fail if cookie parsing fails
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
      return null;
    }

    const db = await getDbConnection();
    const [rows] = await db.execute(
      'SELECT id, name, email, role, department, status FROM employees WHERE id = ? OR LOWER(email) = LOWER(?) LIMIT 1',
      [userId, String(userId).toLowerCase()]
    );
    if (rows.length === 0) {
      console.log('checkAuth failed: User not found in DB for ID/Email:', userId);
      return null;
    }
    if (rows[0].status && rows[0].status.toLowerCase() !== 'active') {
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
  const host = getEnvVariable('WHM_SFTP_HOST', '200.108.205.92.host.secureserver.net');
  const port = parseInt(getEnvVariable('WHM_SFTP_PORT', '22'));
  const username = getEnvVariable('WHM_SFTP_USER', 'storage');
  const password = getEnvVariable('WHM_SFTP_PASS', '1Sparsh@2@2@');

  const config = {
    host,
    port,
    username,
    password,
    tryKeyboard: true,
    readyTimeout: 30000,
    keepaliveInterval: 10000,
    keepaliveCountMax: 3,
    retries: 2,
    retry_factor: 2,
    retry_min_delay: 1500
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
 * Returns the current year-month folder name in YYYY-MM format (e.g., '2026-10')
 */
export function getCurrentMonthFolder() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Uploads a file buffer either locally or to remote SFTP storage under a month-wise subfolder.
 */
export async function uploadFile(buffer, filename, subfolder = '') {
  if (!isSafeExtension(filename)) {
    throw new Error('Unsafe or unsupported file type. Upload rejected.');
  }

  const uniqueFilename = sanitizeFilename(filename);
  const provider = String(getEnvVariable('STORAGE_PROVIDER', 'local')).toLowerCase().trim();

  // Organize folders month-wise (e.g., 'chat/2026-10' or 'devicedesk/screenshots/2026-10')
  const monthFolder = getCurrentMonthFolder();
  let cleanSubfolder = subfolder ? String(subfolder).replace(/^\/+|\/+$/g, '') : '';
  if (!cleanSubfolder) {
    cleanSubfolder = monthFolder;
  } else if (!/\/\d{4}-\d{2}$|^\d{4}-\d{2}$/.test(cleanSubfolder)) {
    cleanSubfolder = `${cleanSubfolder}/${monthFolder}`;
  }

  let sftpSuccess = false;
  if (provider === 'sftp') {
    const sftp = new Client();
    try {
      const config = await getSftpConfig();
      await sftp.connect(config);

      let remoteDir = getEnvVariable('WHM_SFTP_REMOTE_PATH', process.env.WHM_SFTP_REMOTE_PATH || '/uploads');
      if (cleanSubfolder) {
        remoteDir = `${remoteDir.replace(/\/$/, '')}/${cleanSubfolder}`;
      }

      const dirExists = await sftp.exists(remoteDir);
      if (!dirExists) {
        await sftp.mkdir(remoteDir, true);
      }

      const remoteFilePath = `${remoteDir.replace(/\/$/, '')}/${uniqueFilename}`;
      await sftp.put(buffer, remoteFilePath);
      sftpSuccess = true;

      // Ensure no local disk copy is retained on VPS if upload to remote WHM was successful
      try {
        const rootDir = process['cwd']();
        const cleanTargets = [
          join(rootDir, 'public', 'uploads', cleanSubfolder, uniqueFilename),
          join(rootDir, 'public', 'uploads', cleanSubfolder, filename),
          join(rootDir, 'public', 'uploads', subfolder ? subfolder.replace(/^\//, '') : '', uniqueFilename),
          join(rootDir, 'public', 'uploads', subfolder ? subfolder.replace(/^\//, '') : '', filename),
          join(rootDir, 'public', 'uploads', uniqueFilename),
          join(rootDir, 'public', 'uploads', filename),
          join(rootDir, 'uploads', uniqueFilename),
          join(rootDir, 'uploads', filename)
        ];
        for (const target of cleanTargets) {
          fs.unlink(target).catch(() => {});
        }
      } catch (cleanErr) {}

      // Return full public URL if WHM_SFTP_BASE_URL is defined, else relative path
      const baseUrl = getEnvVariable('WHM_SFTP_BASE_URL', process.env.WHM_SFTP_BASE_URL || 'https://storage.flymediatech.com/uploads');
      if (baseUrl) {
        const cleanBase = baseUrl.replace(/\/$/, '');
        const folderPath = cleanSubfolder ? `/${cleanSubfolder}` : '';
        return `${cleanBase}${folderPath}/${uniqueFilename}`;
      }

      return cleanSubfolder ? `/uploads/${cleanSubfolder}/${uniqueFilename}` : uniqueFilename;
    } catch (err) {
      console.error('SFTP Upload failed, falling back to local:', err.message);
    } finally {
      try { await sftp.end(); } catch (e) {}
    }
  }
  
  if (!sftpSuccess) {
    // Local storage fallback
    const rootDir = process['cwd']();
    const targetDir = cleanSubfolder 
      ? join(rootDir, 'public', 'uploads', cleanSubfolder)
      : join(rootDir, 'public', 'uploads');

    await fs.mkdir(targetDir, { recursive: true });
    const localFilePath = join(targetDir, uniqueFilename);
    await fs.writeFile(localFilePath, buffer);

    if (cleanSubfolder) {
      return `/uploads/${cleanSubfolder}/${uniqueFilename}`;
    }
    return `/uploads/${uniqueFilename}`;
  }
}

/**
 * Downloads a file buffer either from local disk or from remote SFTP storage.
 */
export async function downloadFile(filename, subfolder = '') {
  const safeFilename = basename(filename);
  const provider = String(getEnvVariable('STORAGE_PROVIDER', 'local')).toLowerCase().trim();
  const currentMonth = getCurrentMonthFolder();

  // Auto-detect screenshots subfolder if filename starts with scr_
  if (!subfolder && safeFilename.startsWith('scr_')) {
    subfolder = `devicedesk/screenshots/${currentMonth}`;
  }

  // 1. FAST LOCAL CHECK FIRST: If file exists locally on disk, return it immediately without network delay
  const rootDir = process['cwd']();
  const candidateLocalPaths = [
    subfolder ? join(rootDir, 'public', 'uploads', subfolder.replace(/^\//, ''), safeFilename) : null,
    subfolder ? join(rootDir, 'public', 'uploads', subfolder.replace(/^\//, ''), currentMonth, safeFilename) : null,
    join(rootDir, 'public', 'uploads', 'chat', currentMonth, safeFilename),
    join(rootDir, 'public', 'uploads', 'chat', safeFilename),
    join(rootDir, 'public', 'uploads', 'devicedesk', 'screenshots', currentMonth, safeFilename),
    join(rootDir, 'public', 'uploads', 'devicedesk', 'screenshots', safeFilename),
    join(rootDir, 'public', 'uploads', safeFilename),
    join(rootDir, 'uploads', safeFilename)
  ].filter(Boolean);

  for (const lPath of candidateLocalPaths) {
    try {
      return await fs.readFile(lPath);
    } catch (e) {}
  }

  // 2. REMOTE SFTP CHECK (only if configured and file is not found locally)
  if (provider === 'sftp') {
    const sftp = new Client();
    try {
      const config = await getSftpConfig();
      await sftp.connect(config);

      const baseRemoteDir = getEnvVariable('WHM_SFTP_REMOTE_PATH', process.env.WHM_SFTP_REMOTE_PATH || '/uploads');
      let remoteDir = baseRemoteDir;
      if (subfolder) {
        remoteDir = `${remoteDir.replace(/\/$/, '')}/${subfolder.replace(/^\//, '')}`;
      }

      const remoteCandidates = [
        `${remoteDir.replace(/\/$/, '')}/${safeFilename}`,
        `${baseRemoteDir.replace(/\/$/, '')}/chat/${currentMonth}/${safeFilename}`,
        `${baseRemoteDir.replace(/\/$/, '')}/chat/${safeFilename}`,
        `${baseRemoteDir.replace(/\/$/, '')}/devicedesk/screenshots/${currentMonth}/${safeFilename}`,
        `${baseRemoteDir.replace(/\/$/, '')}/devicedesk/screenshots/${safeFilename}`,
        `${baseRemoteDir.replace(/\/$/, '')}/${currentMonth}/${safeFilename}`,
        `${baseRemoteDir.replace(/\/$/, '')}/${safeFilename}`
      ];

      for (const rPath of remoteCandidates) {
        try {
          if (await sftp.exists(rPath)) {
            const fileBuffer = await sftp.get(rPath);
            return fileBuffer;
          }
        } catch (subErr) {}
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
    const uploadsIdx = pathParts.indexOf('uploads');
    if (uploadsIdx !== -1 && pathParts.length > uploadsIdx + 2) {
      subfolder = pathParts.slice(uploadsIdx + 1, pathParts.length - 1).join('/');
    } else if (pathParts.length > 2) {
      subfolder = pathParts.slice(0, pathParts.length - 1).join('/');
    }
  } catch (e) {}

  // Always cleanup local disk copies immediately if present
  try {
    const rootDir = process['cwd']();
    const currentMonth = getCurrentMonthFolder();
    const pathsToUnlink = [
      subfolder ? join(rootDir, 'public', 'uploads', subfolder, safeFilename) : null,
      join(rootDir, 'public', 'uploads', 'chat', currentMonth, safeFilename),
      join(rootDir, 'public', 'uploads', 'chat', safeFilename),
      join(rootDir, 'public', 'uploads', 'devicedesk', 'screenshots', currentMonth, safeFilename),
      join(rootDir, 'public', 'uploads', 'devicedesk', 'screenshots', safeFilename),
      join(rootDir, 'public', 'uploads', 'screenshots', safeFilename),
      join(rootDir, 'public', 'uploads', safeFilename),
      join(rootDir, 'uploads', safeFilename)
    ].filter(Boolean);

    for (const p of pathsToUnlink) {
      fs.unlink(p).catch(() => {});
    }
  } catch (e) {}

  try {
    const provider = String(getEnvVariable('STORAGE_PROVIDER', 'local')).toLowerCase().trim();
    if (provider === 'sftp') {
      const sftp = new Client();
      try {
        const config = await getSftpConfig();
        await sftp.connect(config);

        const baseRemoteDir = getEnvVariable('WHM_SFTP_REMOTE_PATH', process.env.WHM_SFTP_REMOTE_PATH || '/uploads');
        const currentMonth = getCurrentMonthFolder();
        let remoteDir = baseRemoteDir;
        if (subfolder) {
          remoteDir = `${remoteDir.replace(/\/$/, '')}/${subfolder.replace(/^\//, '')}`;
        }

        const candidatePaths = [
          `${remoteDir.replace(/\/$/, '')}/${safeFilename}`,
          `${baseRemoteDir.replace(/\/$/, '')}/chat/${currentMonth}/${safeFilename}`,
          `${baseRemoteDir.replace(/\/$/, '')}/chat/${safeFilename}`,
          `${baseRemoteDir.replace(/\/$/, '')}/devicedesk/screenshots/${currentMonth}/${safeFilename}`,
          `${baseRemoteDir.replace(/\/$/, '')}/devicedesk/screenshots/${safeFilename}`,
          `${baseRemoteDir.replace(/\/$/, '')}/${currentMonth}/${safeFilename}`,
          `${baseRemoteDir.replace(/\/$/, '')}/${safeFilename}`
        ];

        for (const rPath of candidatePaths) {
          try {
            if (await sftp.exists(rPath)) {
              await sftp.delete(rPath);
            }
          } catch (delSubErr) {}
        }
      } finally {
        await sftp.end();
      }
    }
  } catch (err) {
    console.warn(`deleteFile notice for "${safeFilename}":`, err.message);
  }
}
