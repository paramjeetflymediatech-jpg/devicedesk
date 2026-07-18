import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, basename } from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { filename } = await params;
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Sanitize the filename to prevent directory traversal
    const safeFilename = basename(filename);
    const filePath = join(process.cwd(), 'uploads', safeFilename);

    const fileBuffer = await readFile(filePath);

    // Determine content type based on extension
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
    return new Response('File not found', { status: 404 });
  }
}
