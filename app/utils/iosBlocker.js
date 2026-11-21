import { getPool } from '../api/db/db.js';

let cachedDbStatus = null;
let lastDbCheck = 0;

/**
 * Checks whether the iOS application access is temporarily suspended.
 * Returns true if DISABLE_IOS_APP=true in .env or if app_system_flags has disable_ios_app=true.
 */
export async function isIosDisabled() {
  // 1. Direct env check (highest priority if explicitly set)
  if (process.env.DISABLE_IOS_APP === 'true') {
    return true;
  }
  if (process.env.DISABLE_IOS_APP === 'false') {
    return false;
  }

  // 2. Database check with 10-second cache
  const now = Date.now();
  if (cachedDbStatus !== null && (now - lastDbCheck < 10000)) {
    return cachedDbStatus;
  }

  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      "SELECT flag_value FROM app_system_flags WHERE flag_key = 'disable_ios_app' LIMIT 1"
    );
    if (rows && rows.length > 0) {
      const val = String(rows[0].flag_value).toLowerCase().trim();
      cachedDbStatus = (val === 'true' || val === '1' || val === 'yes');
      lastDbCheck = now;
      return cachedDbStatus;
    }
  } catch (e) {
    // If table doesn't exist yet, fallback to false
  }

  cachedDbStatus = false;
  lastDbCheck = now;
  return false;
}

/**
 * Detects whether an incoming HTTP request originated from an iOS device.
 */
export function isIosRequest(request, payload = {}) {
  // 1. Explicit payload deviceModel
  const deviceModel = payload?.deviceModel || '';
  if (deviceModel === 'iOS Device' || deviceModel.toLowerCase().includes('ios')) {
    return true;
  }

  // 2. Explicit header 'x-platform'
  const xPlatform = (request?.headers?.get('x-platform') || '').toLowerCase().trim();
  if (xPlatform === 'ios') {
    return true;
  }

  // 3. User-Agent string inspection (React Native iOS uses CFNetwork / Darwin networking)
  const ua = request?.headers?.get('user-agent') || '';
  if (/CFNetwork|Darwin/i.test(ua)) {
    return true;
  }
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return true;
  }

  return false;
}

/**
 * Standard user-facing message displayed on iOS devices when maintenance is active.
 */
export function getIosMaintenanceMessage() {
  return (
    process.env.IOS_MAINTENANCE_MESSAGE ||
    'The iOS application is temporarily suspended for scheduled maintenance. Please access your DeviceDesk account via https://devicedesk.flymediatech.com on your web browser.'
  );
}
