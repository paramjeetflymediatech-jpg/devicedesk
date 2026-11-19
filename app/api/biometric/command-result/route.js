import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';
import { authenticateBiometricDevice, getOrCreateTelemetry } from '../telemetry.js';

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    body = {};
  }

  const auth = await authenticateBiometricDevice(request, body);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const device = auth.device;
  const { command_id, success, message } = body;
  const tele = getOrCreateTelemetry(device.device_id);
  tele.last_ping_ms = Date.now();

  const pool = getPool();
  const [commands] = await pool.execute(`
    SELECT bc.*, e.name as employee_name
    FROM biometric_commands bc
    LEFT JOIN employees e ON bc.employee_id = e.id
    WHERE bc.id = ? AND bc.device_id = ?
    LIMIT 1
  `, [command_id, device.device_id]);

  if (!commands || commands.length === 0) {
    return NextResponse.json({ error: 'Command not found.' }, { status: 404 });
  }

  const cmd = commands[0];
  const finalStatus = success ? 'COMPLETED' : 'FAILED';

  await pool.execute(
    'UPDATE biometric_commands SET status = ?, result_message = ? WHERE id = ?',
    [finalStatus, message || '', cmd.id]
  );

  tele.display_line1 = success ? `${cmd.command} OK` : `${cmd.command} Failed`;
  tele.display_line2 = cmd.fingerprint_slot ? `Slot #${cmd.fingerprint_slot}` : '';

  const logAction = `${cmd.command}_${success ? 'SUCCESS' : 'FAILED'}`;
  const empLabel = cmd.employee_name || (cmd.employee_id ? `Employee #${cmd.employee_id}` : 'Terminal');
  const slotLabel = cmd.fingerprint_slot ? `Slot #${cmd.fingerprint_slot}` : 'All Slots';
  const logMsg = success
    ? (cmd.command === 'ENROLL'
        ? `Fingerprint enrolled successfully for ${empLabel} (${slotLabel})`
        : cmd.command === 'DELETE'
          ? `Fingerprint template deleted (${slotLabel})`
          : `All fingerprint templates cleared on ${device.device_id}`)
    : `${cmd.command} failed for ${empLabel} (${slotLabel}): ${message || 'Sensor timeout / mismatch'}`;

  const safeEventId = `${device.device_id}-CMD-${cmd.id}-${Date.now()}`;
  await pool.execute(`
    INSERT INTO biometric_scan_logs (event_id, device_id, fingerprint_slot, employee_id, action, message)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [safeEventId, device.device_id, cmd.fingerprint_slot || null, cmd.employee_id || null, logAction, logMsg]);

  if (success) {
    if (cmd.command === 'ENROLL' && cmd.employee_id && cmd.fingerprint_slot) {
      await pool.execute(`
        INSERT INTO fingerprint_mappings (employee_id, device_id, fingerprint_slot, is_active)
        VALUES (?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
          employee_id = VALUES(employee_id),
          is_active = 1,
          enrolled_at = NOW()
      `, [String(cmd.employee_id), device.device_id, Number(cmd.fingerprint_slot)]);

      try {
        await pool.execute(
          'UPDATE employees SET biometric_id = ? WHERE id = ?',
          [String(cmd.fingerprint_slot), String(cmd.employee_id)]
        );
      } catch (e) {}

    } else if (cmd.command === 'DELETE' && cmd.fingerprint_slot) {
      await pool.execute(
        'DELETE FROM fingerprint_mappings WHERE device_id = ? AND fingerprint_slot = ?',
        [device.device_id, Number(cmd.fingerprint_slot)]
      );

      try {
        await pool.execute(
          'UPDATE employees SET biometric_id = NULL WHERE biometric_id = ?',
          [String(cmd.fingerprint_slot)]
        );
      } catch (e) {}

    } else if (cmd.command === 'CLEAR_ALL') {
      await pool.execute('DELETE FROM fingerprint_mappings WHERE device_id = ?', [device.device_id]);
      try {
        await pool.execute('UPDATE employees SET biometric_id = NULL WHERE 1=1');
      } catch (e) {}
    }
  }

  return NextResponse.json({ status: 'OK', command_status: finalStatus });
}
