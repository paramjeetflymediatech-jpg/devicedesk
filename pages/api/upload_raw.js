import { promises as fs } from 'fs';
import { join } from 'path';
import Client from 'ssh2-sftp-client';
import mysql from 'mysql2/promise';

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'xlsx', 'xls', 'csv', 'docx', 'txt', 'mp4', 'webm', 'ogg', 'mov', 'm4v', 'avi', 'mkv', 'mp3', 'wav', 'm4a', 'aac', 'caf', '3gp', 'amr', 'psd', 'zip', 'rar'];

function isSafeExtension(filename) {
  if (!filename) return false;
  const parts = filename.split('.');
  if (parts.length < 2) return false;
  const ext = parts.pop().toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

function sanitizeFilename(filename) {
  if (!filename) return '';
  const parts = filename.split('.');
  const ext = parts.pop().toLowerCase();
  const base = parts.join('.');
  const cleanBase = base.replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueToken = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  return `${uniqueToken}_${cleanBase}.${ext}`;
}

async function getDbConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'devicedesk'
  });
}

async function checkAuth(req) {
  try {
    let userId = null;
    const authCookie = req.cookies['devicedesk_auth_user'];
    if (authCookie) {
      const parsed = JSON.parse(decodeURIComponent(authCookie));
      userId = parsed?.id || null;
    }

    if (!userId) {
      userId = req.headers['x-user-id'] || req.headers['authorization'];
    }

    if (!userId) return null;

    const db = await getDbConnection();
    const [rows] = await db.execute(
      'SELECT id, name, email, role, department, status FROM employees WHERE id = ? OR LOWER(email) = LOWER(?) LIMIT 1',
      [userId, String(userId).toLowerCase()]
    );
    await db.end();

    if (rows.length === 0) return null;
    if (rows[0].status && rows[0].status.toLowerCase() !== 'active') return null;
    return rows[0];
  } catch (err) {
    console.error('Raw session authentication check failed:', err);
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await checkAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Access Denied' });
    }

    const fileName = req.headers['x-file-name'] ? decodeURIComponent(req.headers['x-file-name']) : 'unknown.bin';
    if (!isSafeExtension(fileName)) {
      return res.status(400).json({ error: 'Unsafe or unsupported file type.' });
    }

    const uniqueFilename = sanitizeFilename(fileName);

    const chunks = [];
    let totalSize = 0;
    const MAX_SIZE = 2 * 1024 * 1024 * 1024;

    for await (const chunk of req) {
      chunks.push(chunk);
      totalSize += chunk.length;
      if (totalSize > MAX_SIZE) {
         return res.status(413).json({ error: 'File size exceeds 2GB maximum' });
      }
    }

    const buffer = Buffer.concat(chunks);
    const provider = String(getEnvVariable('STORAGE_PROVIDER', 'local')).toLowerCase().trim();

    let sftpSuccess = false;
    let fileUrl = '';

    if (provider === 'sftp') {
      const sftp = new Client();
      try {
        const host = getEnvVariable('WHM_SFTP_HOST', '2a00:1169:115:1590::');
        const port = parseInt(getEnvVariable('WHM_SFTP_PORT', '22'));
        const username = getEnvVariable('WHM_SFTP_USER', 'storage');
        const password = getEnvVariable('WHM_SFTP_PASS', '1Sparsh@2@2@');
        const config = { host, port, username, password, tryKeyboard: true, readyTimeout: 15000 };

        const keyPath = getEnvVariable('WHM_SFTP_KEY_PATH');
        if (keyPath && keyPath !== 'uploads' && keyPath.trim() !== '') {
          try {
            const stats = await fs.stat(keyPath);
            if (stats.isFile()) config.privateKey = await fs.readFile(keyPath, 'utf8');
          } catch (err) {}
        }

        await sftp.connect(config);
        const remoteDir = process.env.WHM_SFTP_REMOTE_PATH || '/uploads';
        const dirExists = await sftp.exists(remoteDir);
        if (!dirExists) await sftp.mkdir(remoteDir, true);

        const remoteFilePath = `${remoteDir.replace(/\/$/, '')}/${uniqueFilename}`;
        await sftp.put(buffer, remoteFilePath);
        sftpSuccess = true;

        const baseUrl = process.env.WHM_SFTP_BASE_URL;
        if (baseUrl) {
          const cleanBase = baseUrl.replace(/\/$/, '');
          fileUrl = `${cleanBase}/${uniqueFilename}`;
        } else {
          fileUrl = `/uploads/${uniqueFilename}`;
        }
      } catch (err) {
        console.error('Raw SFTP Upload failed, falling back to local:', err.message);
      } finally {
        try { await sftp.end(); } catch (e) {}
      }
    }

    if (!sftpSuccess) {
      const targetDir = join(process.cwd(), 'public', 'uploads');
      await fs.mkdir(targetDir, { recursive: true });
      const localFilePath = join(targetDir, uniqueFilename);
      await fs.writeFile(localFilePath, buffer);
      fileUrl = `/uploads/${uniqueFilename}`;
    }

    return res.status(200).json({ success: true, fileUrls: [fileUrl] });
  } catch (err) {
    console.error('Raw Upload Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error during raw upload' });
  }
}
