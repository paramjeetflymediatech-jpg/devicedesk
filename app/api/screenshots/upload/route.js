import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { uploadFile, deleteFile } from '../../utils/storageManager.js';

export async function POST(req) {
  try {
    const pool = await getDbConnection();
    const contentType = req.headers.get('content-type') || '';
    let employeeId = '';
    let employeeName = '';
    let department = '';
    let shiftId = '';
    let ipAddress = '';
    let systemNumber = '';
    let activityScore = 100;
    let fileBuffer = null;
    let fileExtension = 'jpg';
    let captureType = 'FULL_DESKTOP';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') || formData.get('screenshot');
      employeeId = formData.get('employeeId') || 'EMP-UNKNOWN';
      employeeName = formData.get('employeeName') || 'Unknown Employee';
      department = formData.get('department') || 'General';
      shiftId = formData.get('shiftId') || null;
      ipAddress = formData.get('ipAddress') || req.headers.get('x-forwarded-for') || '127.0.0.1';
      systemNumber = formData.get('systemNumber') || 'N/A';
      captureType = formData.get('captureType') || 'FULL_DESKTOP';
      activityScore = parseInt(formData.get('activityScore') || '100', 10);

      if (file) {
        const bytes = await file.arrayBuffer();
        fileBuffer = Buffer.from(bytes);
        const nameParts = file.name ? file.name.split('.') : [];
        if (nameParts.length > 1) {
          fileExtension = nameParts.pop().toLowerCase();
        }
      }
    } else {
      const body = await req.json();
      employeeId = body.employeeId || 'EMP-UNKNOWN';
      employeeName = body.employeeName || 'Unknown Employee';
      department = body.department || 'General';
      shiftId = body.shiftId || null;
      ipAddress = body.ipAddress || req.headers.get('x-forwarded-for') || '127.0.0.1';
      systemNumber = body.systemNumber || 'N/A';
      captureType = body.captureType || 'FULL_DESKTOP';
      activityScore = body.activityScore !== undefined ? parseInt(body.activityScore, 10) : 100;

      if (body.base64Image) {
        const base64Data = body.base64Image.replace(/^data:image\/\w+;base64,/, '');
        fileBuffer = Buffer.from(base64Data, 'base64');
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ success: false, error: 'No image data provided' }, { status: 400 });
    }

    const screenshotId = uuidv4();
    const fileName = `scr_${employeeId}_${Date.now()}_${screenshotId.slice(0, 8)}.${fileExtension}`;

    // 1. Ensure local public/uploads/devicedesk/screenshots directory exists
    const subfolderPath = path.join('devicedesk', 'screenshots');
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', subfolderPath);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 2. Save image binary directly to public/uploads/devicedesk/screenshots/
    const filePath = path.join(uploadDir, fileName);
    await fs.promises.writeFile(filePath, fileBuffer);

    // 3. Sync to remote SFTP if configured
    let imageUrl = `/uploads/devicedesk/screenshots/${fileName}`;
    try {
      if (process.env.STORAGE_PROVIDER === 'sftp') {
        const sftpUrl = await uploadFile(fileBuffer, fileName, 'devicedesk/screenshots');
        if (sftpUrl) imageUrl = sftpUrl;
      } else if (process.env.WHM_SFTP_BASE_URL) {
        const cleanBase = process.env.WHM_SFTP_BASE_URL.replace(/\/$/, '');
        imageUrl = `${cleanBase}/devicedesk/screenshots/${fileName}`;
      }
    } catch (sftpErr) {
      console.warn('SFTP sync notice:', sftpErr.message);
    }

    // 4. Ensure screenshots table exists dynamically
    await pool.query(`
      CREATE TABLE IF NOT EXISTS screenshots (
        id VARCHAR(100) PRIMARY KEY,
        employeeId VARCHAR(50) NOT NULL,
        employeeName VARCHAR(100) NOT NULL,
        department VARCHAR(100),
        imageUrl TEXT NOT NULL,
        capturedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        shiftId VARCHAR(100),
        ipAddress VARCHAR(50),
        systemNumber VARCHAR(50),
        captureType VARCHAR(50) DEFAULT 'FULL_DESKTOP',
        activityScore INT DEFAULT 100,
        INDEX idx_emp (employeeId),
        INDEX idx_capturedAt (capturedAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Dynamically ensure column exists
    try {
      await pool.query(`ALTER TABLE screenshots ADD COLUMN captureType VARCHAR(50) DEFAULT 'FULL_DESKTOP'`);
    } catch (e) {
      /* column already exists */
    }

    // 5. Save screenshot record with /uploads/screenshots/... route
    await pool.query(
      `INSERT INTO screenshots (id, employeeId, employeeName, department, imageUrl, shiftId, ipAddress, systemNumber, captureType, activityScore)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [screenshotId, employeeId, employeeName, department, imageUrl, shiftId, ipAddress, systemNumber, captureType, activityScore]
    );

    // 6. Automated 180-Day Cleanup Maintenance
    try {
      const [oldRows] = await pool.query(
        `SELECT imageUrl FROM screenshots WHERE capturedAt < NOW() - INTERVAL 180 DAY`
      );
      if (oldRows && oldRows.length > 0) {
        for (const row of oldRows) {
          if (row.imageUrl) {
            const relPath = row.imageUrl.replace(/^\//, '');
            const fullPath = path.join(process.cwd(), 'public', relPath);
            if (fs.existsSync(fullPath)) {
              try { fs.unlinkSync(fullPath); } catch (e) { /* ignore */ }
            }
            try { await deleteFile(row.imageUrl); } catch (e) { /* ignore */ }
          }
        }
        await pool.query(
          `DELETE FROM screenshots WHERE capturedAt < NOW() - INTERVAL 180 DAY`
        );
      }
    } catch (cleanErr) {
      console.warn('180-day cleanup notice:', cleanErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Screenshot uploaded successfully',
      data: {
        id: screenshotId,
        imageUrl,
        capturedAt: new Date().toISOString(),
        captureType
      }
    });

  } catch (err) {
    console.error('Upload screenshot error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
