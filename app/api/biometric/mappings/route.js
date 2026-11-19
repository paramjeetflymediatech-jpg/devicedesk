import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';

export async function GET() {
  try {
    const pool = getPool();
    const [mappings] = await pool.execute(`
      SELECT fm.*, e.name as employee_name, e.email, e.role, e.department, e.status as employee_status
      FROM fingerprint_mappings fm
      JOIN employees e ON CONVERT(fm.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
      ORDER BY fm.fingerprint_slot ASC
    `);

    return NextResponse.json({ success: true, mappings });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      employee_id,
      device_id = 'DEVICE001',
      fingerprint_slot,
      trigger_enroll = false
    } = body;

    const slot = Number(fingerprint_slot);
    if (!employee_id || !slot || slot < 1 || slot > 1000) {
      return NextResponse.json(
        { success: false, error: 'Valid employee_id and fingerprint_slot (1–1000) are required.' },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Verify employee exists
    const [empRows] = await pool.execute('SELECT id, name FROM employees WHERE id = ?', [String(employee_id)]);
    if (!empRows || empRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });
    }
    const empName = empRows[0].name;

    // Check if slot is already mapped to someone else on this device
    const [existingSlot] = await pool.execute(
      'SELECT employee_id FROM fingerprint_mappings WHERE device_id = ? AND fingerprint_slot = ? AND employee_id != ?',
      [device_id, slot, String(employee_id)]
    );

    // Insert or update mapping
    await pool.execute(`
      INSERT INTO fingerprint_mappings (employee_id, device_id, fingerprint_slot, is_active)
      VALUES (?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        employee_id = VALUES(employee_id),
        is_active = 1,
        enrolled_at = NOW()
    `, [String(employee_id), device_id, slot]);

    // Also update biometric_id in employees
    await pool.execute('UPDATE employees SET biometric_id = ? WHERE id = ?', [String(slot), String(employee_id)]);

    let queuedCommandId = null;
    if (trigger_enroll) {
      const [cmdResult] = await pool.execute(`
        INSERT INTO biometric_commands (device_id, command, fingerprint_slot, employee_id, status)
        VALUES (?, 'ENROLL', ?, ?, 'PENDING')
      `, [device_id, slot, String(employee_id)]);

      queuedCommandId = cmdResult.insertId;

      const safeEventId = `${device_id}-ENROLL-Q-${queuedCommandId}`;
      await pool.execute(`
        INSERT INTO biometric_scan_logs (event_id, device_id, fingerprint_slot, employee_id, action, message)
        VALUES (?, ?, ?, ?, 'ENROLL_QUEUED', ?)
      `, [
        safeEventId,
        device_id,
        slot,
        String(employee_id),
        `Enrollment queued for ${empName} (Slot #${slot}) — waiting for finger on sensor when LED turns Blue...`
      ]);
    }

    return NextResponse.json({
      success: true,
      message: trigger_enroll
        ? `Queued remote enrollment for Slot #${slot}! Place finger on R307 sensor when the LED turns Blue/Magenta.`
        : `Successfully mapped ${empName} to slot #${slot} on ${device_id}.`,
      queued_command_id: queuedCommandId
    });
  } catch (error) {
    console.error('Save mapping error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slot = Number(searchParams.get('slot'));
    const deviceId = searchParams.get('device_id') || 'DEVICE001';
    const triggerDelete = searchParams.get('trigger_delete') === 'true';

    if (!slot) {
      return NextResponse.json({ success: false, error: 'slot parameter is required.' }, { status: 400 });
    }

    const pool = getPool();
    await pool.execute(
      'DELETE FROM fingerprint_mappings WHERE device_id = ? AND fingerprint_slot = ?',
      [deviceId, slot]
    );

    await pool.execute('UPDATE employees SET biometric_id = NULL WHERE biometric_id = ?', [String(slot)]);

    if (triggerDelete) {
      await pool.execute(`
        INSERT INTO biometric_commands (device_id, command, fingerprint_slot, status)
        VALUES (?, 'DELETE', ?, 'PENDING')
      `, [deviceId, slot]);
    }

    return NextResponse.json({
      success: true,
      message: `Removed fingerprint mapping for slot #${slot} on ${deviceId}.`
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
