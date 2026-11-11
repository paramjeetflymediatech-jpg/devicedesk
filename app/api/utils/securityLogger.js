import { getDbConnection, getPool } from '../db/db.js';

/**
 * Extracts client IP address with support for Cloudflare, reverse proxies, and local loopbacks.
 */
export function getClientIp(request) {
  if (!request) return '127.0.0.1';

  try {
    const headers = request.headers;
    const getH = (key) => {
      if (!headers) return null;
      if (typeof headers.get === 'function') return headers.get(key);
      return headers[key] || headers[key.toLowerCase()] || null;
    };

    const cfIp = getH('cf-connecting-ip');
    const trueIp = getH('true-client-ip');
    const xForwardedFor = getH('x-forwarded-for');
    const xRealIp = getH('x-real-ip');
    const xClientIp = getH('x-client-ip');

    let ip = cfIp || trueIp || (xForwardedFor ? xForwardedFor.split(',')[0].trim() : null) || xRealIp || xClientIp || '127.0.0.1';

    if (typeof ip === 'string' && ip.startsWith('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }
    if (ip === '::1' || ip === 'localhost') {
      ip = '127.0.0.1';
    }
    return String(ip).trim();
  } catch (e) {
    return '127.0.0.1';
  }
}

/**
 * Robust zero-dependency User-Agent parser for Browser, OS, and Device.
 */
export function parseUserAgent(uaString) {
  if (!uaString || typeof uaString !== 'string') {
    return { browser: 'Unknown Browser', os: 'Unknown OS', device: 'Desktop' };
  }
  const ua = uaString.toLowerCase();

  // 1. Operating System
  let os = 'Unknown OS';
  if (ua.includes('windows nt 10.0')) os = 'Windows 10/11';
  else if (ua.includes('windows nt 6.3')) os = 'Windows 8.1';
  else if (ua.includes('windows nt 6.2')) os = 'Windows 8';
  else if (ua.includes('windows nt 6.1')) os = 'Windows 7';
  else if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone')) os = 'iOS (iPhone)';
  else if (ua.includes('ipad')) os = 'iOS (iPad)';
  else if (ua.includes('ipod')) os = 'iOS (iPod)';
  else if (ua.includes('mac os x') || ua.includes('macintosh')) os = 'macOS';
  else if (ua.includes('cros')) os = 'ChromeOS';
  else if (ua.includes('linux')) os = 'Linux';

  // 2. Browser
  let browser = 'Unknown Browser';
  if (ua.includes('edg/') || ua.includes('edge/')) browser = 'Microsoft Edge';
  else if (ua.includes('opr/') || ua.includes('opera/')) browser = 'Opera';
  else if (ua.includes('chrome/') || ua.includes('crios/')) browser = 'Google Chrome';
  else if (ua.includes('firefox/') || ua.includes('fxios/')) browser = 'Mozilla Firefox';
  else if (ua.includes('safari/') && !ua.includes('chrome') && !ua.includes('android')) browser = 'Apple Safari';
  else if (ua.includes('devicedeskmobile') || ua.includes('devicedesk')) browser = 'DeviceDesk App';
  else if (ua.includes('postman')) browser = 'Postman API Client';
  else if (ua.includes('curl/')) browser = 'cURL';
  else if (ua.includes('insomnia')) browser = 'Insomnia REST';
  else if (ua.includes('python-requests') || ua.includes('aiohttp')) browser = 'Python Script';

  // 3. Device Type
  let device = 'Desktop';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    device = 'Mobile';
  } else if (ua.includes('ipad') || ua.includes('tablet')) {
    device = 'Tablet';
  } else if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider') || ua.includes('slurp')) {
    device = 'Bot/Crawler';
  }

  return { browser, os, device };
}

/**
 * Extracts complete security metadata from an incoming request.
 */
export function extractSecurityContext(request) {
  if (!request) {
    return {
      ip: '127.0.0.1',
      country: null,
      userAgent: 'Internal System Action',
      browser: 'System',
      os: 'Server',
      device: 'Server',
      path: null,
      method: null
    };
  }

  const getH = (key) => {
    if (!request.headers) return null;
    if (typeof request.headers.get === 'function') return request.headers.get(key);
    return request.headers[key] || request.headers[key.toLowerCase()] || null;
  };

  const ip = getClientIp(request);
  const country = getH('cf-ipcountry') || null;
  const userAgent = getH('user-agent') || 'Unknown';
  const { browser, os, device } = parseUserAgent(userAgent);

  let path = null;
  try {
    if (request.nextUrl && request.nextUrl.pathname) {
      path = request.nextUrl.pathname;
    } else if (request.url) {
      path = new URL(request.url).pathname;
    }
  } catch (e) {}

  const method = request.method || 'POST';

  return {
    ip,
    country,
    userAgent,
    browser,
    os,
    device,
    path,
    method
  };
}

let tableEnsured = false;

/**
 * Ensures the security_audit_logs table exists in the database.
 */
export async function ensureSecurityLogsTable(db) {
  if (tableEnsured) return;
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS security_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(100) NULL,
        identifier VARCHAR(150) NULL,
        user_name VARCHAR(150) NULL,
        user_role VARCHAR(50) NULL,
        action VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'SECURITY',
        status VARCHAR(50) NOT NULL DEFAULT 'INFO',
        ip_address VARCHAR(100) NULL,
        country VARCHAR(50) NULL,
        browser VARCHAR(100) NULL,
        os VARCHAR(100) NULL,
        device VARCHAR(100) NULL,
        user_agent TEXT NULL,
        path VARCHAR(255) NULL,
        method VARCHAR(10) NULL,
        details TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_action (action),
        INDEX idx_category (category),
        INDEX idx_status (status),
        INDEX idx_ip (ip_address),
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    tableEnsured = true;
  } catch (err) {
    console.error('Failed to ensure security_audit_logs table:', err.message);
  }
}

/**
 * Primary security logging function.
 * 
 * @param {Object} params
 * @param {Request} [params.request] - Incoming HTTP request (NextRequest / Request)
 * @param {string} params.action - Action name (e.g. 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'FORGOT_PASSWORD_REQUEST', 'ADMIN_CREATE_USER')
 * @param {string} [params.category='SECURITY'] - 'AUTH' | 'PASSWORD_RESET' | 'ADMIN_PANEL' | 'ACCESS_CONTROL' | 'DANGER_ZONE'
 * @param {string} [params.status='INFO'] - 'SUCCESS' | 'FAILURE' | 'WARNING' | 'BLOCKED' | 'CRITICAL'
 * @param {Object} [params.user] - Authenticated or matched user object ({ id, name, email, role })
 * @param {string} [params.identifier] - Input identifier (email, username, ID)
 * @param {Object|string} [params.details] - Arbitrary additional metadata or reasons
 * @param {string} [params.ip] - IP address override if request not available
 */
export async function logSecurityEvent({
  request = null,
  action,
  category = 'SECURITY',
  status = 'INFO',
  user = null,
  identifier = null,
  details = null,
  ip = null
}) {
  try {
    const ctx = extractSecurityContext(request);
    const clientIp = ip || ctx.ip;

    const userId = user?.id || null;
    const userName = user?.name || null;
    const userRole = user?.role || user?.dbRole || null;
    const resolvedIdentifier = identifier || user?.email || user?.name || user?.id || null;

    let serializedDetails = null;
    if (details) {
      if (typeof details === 'object') {
        try {
          serializedDetails = JSON.stringify(details);
        } catch (e) {
          serializedDetails = String(details);
        }
      } else {
        serializedDetails = String(details);
      }
    }

    const db = await getDbConnection();
    await ensureSecurityLogsTable(db);

    await db.execute(
      `INSERT INTO security_audit_logs 
        (user_id, identifier, user_name, user_role, action, category, status, ip_address, country, browser, os, device, user_agent, path, method, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        resolvedIdentifier,
        userName,
        userRole,
        action,
        category,
        status,
        clientIp,
        ctx.country,
        ctx.browser,
        ctx.os,
        ctx.device,
        ctx.userAgent,
        ctx.path,
        ctx.method,
        serializedDetails
      ]
    );

    // Also output a structured security notice in server logs
    console.log(
      `[SECURITY AUDIT] [${status}] [${category}] ${action} | IP: ${clientIp} (${ctx.browser} on ${ctx.os}) | User: ${userName || resolvedIdentifier || 'Anonymous'}`
    );
  } catch (err) {
    // Non-blocking: Logging failure should never crash the main application request
    console.error('[SECURITY AUDIT ERROR] Failed to record security event:', err);
  }
}

