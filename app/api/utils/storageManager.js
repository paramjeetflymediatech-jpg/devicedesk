import Client from 'ssh2-sftp-client';
import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { cookies } from 'next/headers';
import { getDbConnection } from '../db/db.js';

// Whitelist of allowed extensions for security
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'xlsx', 'xls', 'csv', 'doc', 'docx', 'txt', 'mp4', 'webm', 'ogg', 'mov', 'm4v', 'avi', 'mkv'];

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
export async function checkAuth() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('devicedesk_auth_user');
    if (!authCookie || !authCookie.value) {
      return null;
    }
    const user = JSON.parse(decodeURIComponent(authCookie.value));
    if (!user || !user.id) {
      return null;
    }
    const db = await getDbConnection();
    const [rows] = await db.execute(
      'SELECT id, name, email, role, status FROM employees WHERE id = ? LIMIT 1',
      [user.id]
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
 * Uploads a file buffer either locally or to remote SFTP storage.
 */
export async function uploadFile(buffer, filename) {
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

      const remoteDir = process.env.WHM_SFTP_REMOTE_PATH || '/uploads';
      const dirExists = await sftp.exists(remoteDir);
      if (!dirExists) {
        await sftp.mkdir(remoteDir, true);
      }

      const remoteFilePath = remoteDir.endsWith('/') 
        ? `${remoteDir}${uniqueFilename}` 
        : `${remoteDir}/${uniqueFilename}`;

      await sftp.put(buffer, remoteFilePath);
      return uniqueFilename;
    } finally {
      await sftp.end();
    }
  } else {
    // Local storage fallback
    const uploadDir = join(process.cwd(), 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    const localFilePath = join(uploadDir, uniqueFilename);
    await fs.writeFile(localFilePath, buffer);
    return uniqueFilename;
  }
}

/**
 * Downloads a file buffer either from local disk or from remote SFTP storage.
 */
export async function downloadFile(filename) {
  const safeFilename = basename(filename);
  const provider = process.env.STORAGE_PROVIDER || 'local';

  if (provider === 'sftp') {
    const sftp = new Client();
    try {
      const config = await getSftpConfig();
      await sftp.connect(config);

      const remoteDir = process.env.WHM_SFTP_REMOTE_PATH || '/uploads';
      const remoteFilePath = remoteDir.endsWith('/') 
        ? `${remoteDir}${safeFilename}` 
        : `${remoteDir}/${safeFilename}`;

      const fileExists = await sftp.exists(remoteFilePath);
      if (!fileExists) {
        throw new Error('File not found on remote SFTP storage.');
      }

      const fileBuffer = await sftp.get(remoteFilePath);
      return fileBuffer;
    } finally {
      await sftp.end();
    }
  } else {
    // Local storage fallback
    const localFilePath = join(process.cwd(), 'uploads', safeFilename);
    return await fs.readFile(localFilePath);
  }
}
