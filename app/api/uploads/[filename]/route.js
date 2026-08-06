import { NextResponse } from 'next/server';
import { basename } from 'path';
import { downloadFile, checkAuth } from '../../utils/storageManager.js';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    // 1. Session authentication and active database account check
    const user = await checkAuth();
    if (!user) {
      return new Response('Unauthorized: Please log in to view attachments', { status: 401 });
    }

    const { filename } = await params;
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Sanitize to prevent path traversal
    const safeFilename = basename(filename);

    // Download/retrieve file buffer (either local or SFTP depending on STORAGE_PROVIDER)
    const fileBuffer = await downloadFile(safeFilename);

    // Determine content type based on extension
    let contentType = 'application/octet-stream';
    const ext = safeFilename.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg'].includes(ext)) contentType = 'image/jpeg';
    else if (ext === 'png') contentType = 'image/png';
    else if (ext === 'gif') contentType = 'image/gif';
    else if (ext === 'webp') contentType = 'image/webp';
    else if (ext === 'svg') contentType = 'image/svg+xml';
    else if (ext === 'pdf') contentType = 'application/pdf';
    else if (['xlsx', 'xls'].includes(ext)) contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (ext === 'csv') contentType = 'text/csv';
    else if (ext === 'txt') contentType = 'text/plain';
    else if (ext === 'mp4') contentType = 'video/mp4';
    else if (ext === 'webm') contentType = 'video/webm';
    else if (ext === 'ogg') contentType = 'video/ogg';
    else if (['mov', 'qt'].includes(ext)) contentType = 'video/quicktime';
    else if (ext === 'm4v') contentType = 'video/x-m4v';
    else if (ext === 'avi') contentType = 'video/x-msvideo';
    else if (ext === 'mkv') contentType = 'video/x-matroska';

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.warn('File Retrieval Notice:', err.message);
    return new Response('File not found or access error', { status: 404 });
  }
}
