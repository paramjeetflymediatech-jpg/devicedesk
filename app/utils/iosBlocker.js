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
 * Detects whether an incoming HTTP request originated strictly from the native iOS application (App Store build).
 * CRITICAL: Must NEVER block mobile web browsers (Safari, Chrome, Firefox on iPhone/iPad).
 */
export function isIosRequest(request, payload = {}) {
  // 1. If payload contains browserProfile (sent exclusively by the web application), it's 100% a web browser!
  if (payload?.browserProfile) {
    return false;
  }

  // 2. Explicit payload deviceModel sent exclusively by the React Native mobile app (LoginScreen / App.js)
  const deviceModel = payload?.deviceModel || '';
  if (deviceModel === 'iOS Device' || deviceModel.toLowerCase().includes('ios device')) {
    return true;
  }

  // 3. Explicit header 'x-platform'
  const xPlatform = (request?.headers?.get('x-platform') || '').toLowerCase().trim();
  if (xPlatform === 'ios') {
    return true;
  }

  // 4. User-Agent string inspection:
  // React Native iOS uses native NSURLSession sending:
  // "DeviceDesk/32 CFNetwork/1498.700.2 Darwin/23.6.0"
  // Mobile Safari & Chrome on iPhone send standard browser strings like:
  // "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) ... Version/17.5 Mobile/15E148 Safari/604.1"
  const ua = request?.headers?.get('user-agent') || '';

  // Standard mobile web browsers on iOS MUST NOT be blocked:
  if (
    ua.includes('Safari') ||
    ua.includes('CriOS') ||
    ua.includes('FxiOS') ||
    ua.includes('EdgiOS') ||
    ua.includes('OPiOS')
  ) {
    return false;
  }

  // If request contains the native app bundle identifier / app name:
  if (/DeviceDesk/i.test(ua)) {
    return true;
  }

  // Native Apple CFNetwork & Darwin networking stack (without any browser tokens):
  if (/CFNetwork/i.test(ua) && /Darwin/i.test(ua)) {
    return true;
  }

  return false;
}

/**
 * Standard user-facing message displayed on iOS native app when maintenance is active.
 */
export function getIosMaintenanceMessage() {
  return (
    process.env.IOS_MAINTENANCE_MESSAGE ||
    'The iOS application is temporarily suspended for scheduled maintenance. Please access your DeviceDesk account via https://devicedesk.flymediatech.com on your web browser.'
  );
}
