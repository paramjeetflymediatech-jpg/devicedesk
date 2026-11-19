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
    return NextResponse.json(
      {
        status: 'UNAUTHORIZED',
        error: auth.error,
        display_line1: auth.display_line1,
        display_line2: auth.display_line2
      },
      { status: auth.status }
    );
  }

  const device = auth.device;
  const tele = getOrCreateTelemetry(device.device_id);
  const nowMs = Date.now();

  tele.last_ping_ms = nowMs;
  tele.ping_count += 1;
  if (body.wifi_ssid !== undefined) tele.wifi_ssid = String(body.wifi_ssid);
  if (body.ip_address !== undefined) tele.ip_address = String(body.ip_address);
  if (body.rssi !== undefined && !isNaN(Number(body.rssi))) {
    const rssiVal = Number(body.rssi);
    tele.rssi = rssiVal;
    const nowTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    tele.rssi_history.push({ time: nowTimeStr, rssi: rssiVal });
    if (tele.rssi_history.length > 20) tele.rssi_history.shift();
  }
  if (body.sensor_ready !== undefined) tele.sensor_ready = Boolean(body.sensor_ready);
  if (body.oled_ready !== undefined) tele.oled_ready = Boolean(body.oled_ready);
  if (body.templates_count !== undefined) tele.templates_count = Number(body.templates_count) || 0;
  if (body.queued_events !== undefined) tele.queued_events = Number(body.queued_events) || 0;
  if (body.uptime_seconds !== undefined) tele.uptime_seconds = Number(body.uptime_seconds) || 0;
  if (body.display_line1 !== undefined) tele.display_line1 = String(body.display_line1);
  if (body.display_line2 !== undefined) tele.display_line2 = String(body.display_line2);

  const pool = getPool();
  const [commands] = await pool.execute(`
    SELECT bc.*, e.name as employee_name
    FROM biometric_commands bc
    LEFT JOIN employees e ON CONVERT(bc.employee_id USING utf8mb4) COLLATE utf8mb4_general_ci = CONVERT(e.id USING utf8mb4) COLLATE utf8mb4_general_ci
    WHERE bc.device_id = ? AND bc.status = 'PENDING'
    ORDER BY bc.id ASC LIMIT 1
  `, [device.device_id]);

  let pendingCmd = null;
  if (commands && commands.length > 0) {
    const rawCmd = commands[0];
    await pool.execute(
      "UPDATE biometric_commands SET status = 'IN_PROGRESS' WHERE id = ?",
      [rawCmd.id]
    );

    pendingCmd = {
      command_id: rawCmd.id,
      command: rawCmd.command,
      fingerprint_slot: rawCmd.fingerprint_slot,
      employee_id: rawCmd.employee_id,
      employee_name: rawCmd.employee_name || ''
    };
  }

  return NextResponse.json({
    status: 'ONLINE',
    server_time: new Date().toISOString(),
    device_id: device.device_id,
    pending_command: pendingCmd
  });
}
