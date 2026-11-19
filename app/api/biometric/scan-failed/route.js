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
  const { reason } = body;
  const eventId = `${device.device_id}-FAIL-${Date.now()}`;
  const tele = getOrCreateTelemetry(device.device_id);
  tele.last_ping_ms = Date.now();
  tele.display_line1 = 'Not Recognised';
  tele.display_line2 = 'Try Again';
  tele.last_event_type = 'FAILED_SCAN';

  const pool = getPool();
  await pool.execute(`
    INSERT INTO biometric_scan_logs (event_id, device_id, fingerprint_slot, employee_id, action, message)
    VALUES (?, ?, NULL, NULL, 'REJECTED_UNKNOWN', ?)
  `, [eventId, device.device_id, reason || 'Unrecognized fingerprint attempt on sensor']);

  return NextResponse.json({ status: 'LOGGED' });
}
