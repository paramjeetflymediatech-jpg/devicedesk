import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');

    const uploadDir = join(process.cwd(), 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const fileUrls = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uniqueFilename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const filepath = join(uploadDir, uniqueFilename);
        await writeFile(filepath, buffer);
        fileUrls.push(`/uploads/${uniqueFilename}`);
      }
    } else {
      // Fallback for single file upload
      const file = formData.get('file');
      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uniqueFilename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const filepath = join(uploadDir, uniqueFilename);
        await writeFile(filepath, buffer);
        fileUrls.push(`/uploads/${uniqueFilename}`);
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
    console.error('File Upload Error:', err);
    return NextResponse.json({ success: false, error: 'File upload failed' }, { status: 500 });
  }
}
