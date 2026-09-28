import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { downloadFile } from '../../api/utils/storageManager.js';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { path: pathSegments } = await params;
    if (!pathSegments || pathSegments.length === 0) {
      return new Response('File not found', { status: 404 });
    }

    const safeFilename = basename(pathSegments[pathSegments.length - 1]);
    const subfolder = pathSegments.slice(0, -1).join('/');
    const rootDir = process['cwd']();

    // 1. Direct local disk check
    const localPath = join(rootDir, 'public', 'uploads', ...pathSegments);
    let fileBuffer = null;
    try {
      fileBuffer = await fs.readFile(localPath);
    } catch (e) {
      // 2. Fallback to storageManager downloadFile (supports subfolders + SFTP fallback)
      try {
        fileBuffer = await downloadFile(safeFilename, subfolder);
      } catch (err2) {
        return new Response('File not found', { status: 404 });
      }
    }

    if (!fileBuffer) {
      return new Response('File not found', { status: 404 });
    }

    // Determine content type
    let contentType = 'application/octet-stream';
    const ext = safeFilename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg'].includes(ext)) contentType = 'image/jpeg';
    else if (ext === 'png') contentType = 'image/png';
    else if (ext === 'gif') contentType = 'image/gif';
    else if (ext === 'webp') contentType = 'image/webp';
    else if (ext === 'svg') contentType = 'image/svg+xml';
    else if (ext === 'pdf') contentType = 'application/pdf';

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    return new Response('Error loading file', { status: 500 });
  }
}
