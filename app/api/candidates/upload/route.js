import { NextResponse } from 'next/server';
import { uploadFile, isSafeExtension } from '../../utils/storageManager.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');
    const fileUrls = [];

    const processUpload = async (file) => {
      if (!file || !file.name) return;

      if (!isSafeExtension(file.name)) {
        throw new Error(`File type rejected: "${file.name}" is not an allowed extension.`);
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      if (buffer.length > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds 10MB limit: "${file.name}"`);
      }

      const uploadResult = await uploadFile(buffer, file.name);
      let finalUrl = uploadResult;

      if (typeof uploadResult === 'string') {
        if (uploadResult.startsWith('http://') || uploadResult.startsWith('https://') || uploadResult.startsWith('/')) {
          finalUrl = uploadResult;
        } else {
          const baseUrl = process.env.WHM_SFTP_BASE_URL;
          if (baseUrl) {
            const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            finalUrl = `${cleanBaseUrl}/${uploadResult}`;
          } else {
            finalUrl = `/api/uploads/${uploadResult}`;
          }
        }
      }

      if (typeof finalUrl === 'string') {
        finalUrl = finalUrl.replace(/(https?:\/\/storage\.flymediatech\.com\/uploads\/)+/g, 'https://storage.flymediatech.com/uploads/');
      }

      fileUrls.push(finalUrl);
    };

    if (files && files.length > 0) {
      for (const file of files) {
        await processUpload(file);
      }
    } else {
      const file = formData.get('file');
      if (file) {
        await processUpload(file);
      }
    }

    if (fileUrls.length === 0) {
      return NextResponse.json({ success: false, error: 'No files uploaded' }, { status: 400 });
    }

    return NextResponse.json({ success: true, fileUrls });
  } catch (err) {
    console.error('Candidate File Upload Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'File upload failed' }, { status: 500 });
  }
}
