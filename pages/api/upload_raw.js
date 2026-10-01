import { promises as fs } from 'fs';
import { join } from 'path';
import Client from 'ssh2-sftp-client';
import { checkAuth, isSafeExtension, sanitizeFilename } from '../../app/api/utils/storageManager.js';

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

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
    const rawSubfolder = req.headers['x-subfolder'] || req.headers['x-folder'] || 'chat';
    const now = new Date();
    const monthFolder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let subfolder = rawSubfolder ? String(rawSubfolder).replace(/^\/+|\/+$/g, '') : '';
    if (!subfolder) {
      subfolder = monthFolder;
    } else if (!/\/\d{4}-\d{2}$|^\d{4}-\d{2}$/.test(subfolder)) {
      subfolder = `${subfolder}/${monthFolder}`;
    }

    let sftpSuccess = false;
    let fileUrl = '';

    if (provider === 'sftp') {
      const sftp = new Client();
      try {
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
            if (stats.isFile()) config.privateKey = await fs.readFile(keyPath, 'utf8');
          } catch (err) {}
        }

        await sftp.connect(config);
        let remoteDir = getEnvVariable('WHM_SFTP_REMOTE_PATH', process.env.WHM_SFTP_REMOTE_PATH || '/uploads');
        if (subfolder) {
          remoteDir = `${remoteDir.replace(/\/$/, '')}/${subfolder.replace(/^\//, '')}`;
        }
        const dirExists = await sftp.exists(remoteDir);
        if (!dirExists) await sftp.mkdir(remoteDir, true);

        const remoteFilePath = `${remoteDir.replace(/\/$/, '')}/${uniqueFilename}`;
        await sftp.put(buffer, remoteFilePath);
        sftpSuccess = true;

        // Clean up any local copy if present on VPS
        try {
          const rootDir = process.cwd();
          const cleanPaths = [
            join(rootDir, 'public', 'uploads', subfolder.replace(/^\//, ''), uniqueFilename),
            join(rootDir, 'public', 'uploads', subfolder.replace(/^\//, ''), fileName),
            join(rootDir, 'public', 'uploads', uniqueFilename),
            join(rootDir, 'public', 'uploads', fileName)
          ];
          for (const cp of cleanPaths) {
            fs.unlink(cp).catch(() => {});
          }
        } catch (cleanErr) {}

        const baseUrl = getEnvVariable('WHM_SFTP_BASE_URL', process.env.WHM_SFTP_BASE_URL || 'https://storage.flymediatech.com/uploads');
        if (baseUrl) {
          const cleanBase = baseUrl.replace(/\/$/, '');
          const folderPath = subfolder ? `/${subfolder.replace(/^\//, '')}` : '';
          fileUrl = `${cleanBase}${folderPath}/${uniqueFilename}`;
        } else {
          fileUrl = subfolder ? `/uploads/${subfolder.replace(/^\//, '')}/${uniqueFilename}` : `/uploads/${uniqueFilename}`;
        }
      } catch (err) {
        console.error('Raw SFTP Upload failed, falling back to local:', err.message);
      } finally {
        try { await sftp.end(); } catch (e) {}
      }
    }

    if (!sftpSuccess) {
      const targetDir = subfolder 
        ? join(process.cwd(), 'public', 'uploads', subfolder.replace(/^\//, ''))
        : join(process.cwd(), 'public', 'uploads');
      await fs.mkdir(targetDir, { recursive: true });
      const localFilePath = join(targetDir, uniqueFilename);
      await fs.writeFile(localFilePath, buffer);
      fileUrl = subfolder ? `/uploads/${subfolder.replace(/^\//, '')}/${uniqueFilename}` : `/uploads/${uniqueFilename}`;
    }

    return res.status(200).json({ success: true, fileUrls: [fileUrl] });
  } catch (err) {
    console.error('Raw Upload Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error during raw upload' });
  }
}
