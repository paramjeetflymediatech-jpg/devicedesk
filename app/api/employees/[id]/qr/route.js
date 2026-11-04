import { NextResponse } from 'next/server';
import { getPool } from '../../../db/db.js';
import QRCode from 'qrcode';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const pool = getPool();

    const [rows] = await pool.query(
      `SELECT id, name, email, role, department, avatarUrl, biometric_id 
       FROM employees 
       WHERE id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 });
    }

    const emp = rows[0];

    // Payload can be the employee's ID or numeric biometric ID
    const qrPayload = JSON.stringify({
      id: emp.id,
      bioId: emp.biometric_id || emp.id,
      name: emp.name,
      dept: emp.department || '',
      type: 'DEVICEDESK_CARD'
    });

    // Generate high-resolution PNG Data URL
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    });

    return NextResponse.json({
      success: true,
      employee: emp,
      qrDataUrl,
      qrPayload
    });

  } catch (error) {
    console.error('Error generating Employee QR Code:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

