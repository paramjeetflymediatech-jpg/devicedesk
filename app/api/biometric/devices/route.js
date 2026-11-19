import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';

export async function GET() {
  try {
    const pool = getPool();
    const [devices] = await pool.execute(`
      SELECT d.*,
        (SELECT COUNT(*) FROM fingerprint_mappings fm WHERE fm.device_id = d.device_id AND fm.is_active = 1) as enrolled_count
      FROM biometric_devices d
      ORDER BY d.id ASC
    `);

    return NextResponse.json({ success: true, devices });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { device_id, name, location = 'Main Office Entrance', api_key } = body;

    if (!device_id || !name || !api_key) {
      return NextResponse.json(
        { success: false, error: 'device_id, name, and api_key are required.' },
        { status: 400 }
      );
    }

    const pool = getPool();
    await pool.execute(`
      INSERT INTO biometric_devices (device_id, name, location, api_key, is_active)
      VALUES (?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        location = VALUES(location),
        api_key = VALUES(api_key),
        is_active = 1
    `, [device_id.trim(), name.trim(), location.trim(), api_key.trim()]);

    return NextResponse.json({ success: true, message: `Device ${device_id} saved successfully.` });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
