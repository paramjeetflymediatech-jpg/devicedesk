import { NextResponse } from 'next/server';
import { uploadFile, checkAuth, isSafeExtension } from '../utils/storageManager.js';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request) {
  try {
    // 1. Session authentication and DB active status check
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Access Denied' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files');
    const fileUrls = [];

    // Helper to process a single file upload safely
    const processUpload = async (file) => {
      if (!file || !file.name) return;

      // Validate file extension
      if (!isSafeExtension(file.name)) {
        throw new Error(`File type rejected: "${file.name}" is not an allowed extension.`);
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Validate file size
      if (buffer.length > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds 10MB limit: "${file.name}"`);
      }

      // Upload file (either locally or to WHM SFTP)
      const uniqueFilename = await uploadFile(buffer, file.name);

      // Determine return URL
      const baseUrl = process.env.WHM_SFTP_BASE_URL;
      if (baseUrl) {
        // Direct URL to WHM storage
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        fileUrls.push(`${cleanBaseUrl}/${uniqueFilename}`);
      } else {
        // Proxied URL via Next.js
        fileUrls.push(`/api/uploads/${uniqueFilename}`);
      }
    };

    if (files && files.length > 0) {
      for (const file of files) {
        await processUpload(file);
      }
    } else {
      // Fallback for single file upload
      const file = formData.get('file');
      if (file) {
        await processUpload(file);
      }
    }

    if (fileUrls.length === 0) {
      return NextResponse.json({ success: false, error: 'No files uploaded' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      fileUrls 
    });
  } catch (err) {
    console.error('Secure File Upload Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'File upload failed' }, { status: 500 });
  }
}
