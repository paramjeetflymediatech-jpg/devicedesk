import { getPool } from '../db/db.js';

// Global live in-memory telemetry cache across Next.js API route invocations
if (!global.__biometricTelemetry) {
  global.__biometricTelemetry = new Map();
}
const liveTelemetry = global.__biometricTelemetry;

export function getOrCreateTelemetry(deviceId) {
  const safeId = deviceId || 'DEVICE001';
  let t = liveTelemetry.get(safeId);
  if (!t) {
    t = {
      device_id: safeId,
      last_ping_ms: 0,
      wifi_ssid: '—',
      ip_address: '—',
      rssi: null,
      sensor_ready: false,
      oled_ready: false,
      templates_count: 0,
      queued_events: 0,
      uptime_seconds: 0,
      display_line1: 'Waiting for ESP32',
      display_line2: 'OFFLINE',
      last_event_type: 'NONE',
      ping_count: 0,
      rssi_history: []
    };
    liveTelemetry.set(safeId, t);
  }
  return t;
}

export function rssiToPercent(rssi) {
  if (rssi === null || rssi === undefined || isNaN(Number(rssi))) return 0;
  const val = Number(rssi);
  if (val >= -50) return 100;
  if (val <= -100) return 0;
  return Math.round(2 * (val + 100));
}

export function rssiToQuality(rssi, online) {
  if (!online || rssi === null || rssi === undefined) return 'Offline';
  const val = Number(rssi);
  if (val >= -55) return 'Excellent';
  if (val >= -67) return 'Good';
  if (val >= -78) return 'Fair';
  return 'Weak';
}

export async function authenticateBiometricDevice(request, body = {}) {
  const deviceId = (
    body.device_id ||
    request.headers.get('x-device-id') ||
    'DEVICE001'
  ).toString().trim();

  const deviceKey = (
    request.headers.get('x-device-key') ||
    body.device_key ||
    body.api_key ||
    ''
  ).toString().trim();

  if (!deviceId || !deviceKey) {
    return {
      authenticated: false,
      error: 'Missing device_id or X-Device-Key header.',
      status: 401,
      display_line1: 'Auth Error',
      display_line2: 'Missing Key'
    };
  }

  const pool = getPool();
  const [rows] = await pool.execute(
    'SELECT * FROM biometric_devices WHERE device_id = ? AND is_active = 1',
    [deviceId]
  );

  if (!rows || rows.length === 0) {
    return {
      authenticated: false,
      error: 'Device not registered or inactive terminal.',
      status: 403,
      display_line1: 'Access Denied',
      display_line2: 'Inactive Terminal'
    };
  }

  const device = rows[0];
  if (device.api_key !== deviceKey) {
    return {
      authenticated: false,
      error: 'Invalid device credentials.',
      status: 403,
      display_line1: 'Access Denied',
      display_line2: 'Invalid Key'
    };
  }

  // Update last seen
  try {
    await pool.execute('UPDATE biometric_devices SET last_seen_at = NOW() WHERE id = ?', [device.id]);
  } catch (e) {}

  return {
    authenticated: true,
    device
  };
}
