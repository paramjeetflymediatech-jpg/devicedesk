import { getDbConnection, getPool } from '../db/db.js';
import { checkAuth } from './storageManager.js';

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

/**
 * Extracts Chrome/Browser Profile and Google Identity metadata from cookies or headers.
 */
export function extractBrowserProfile(request) {
  if (!request) return null;

  try {
    let rawCookieValue = null;

    // 1. Try reading devicedesk_browser_profile from request cookies
    if (request.cookies) {
      if (typeof request.cookies.get === 'function') {
        const c = request.cookies.get('devicedesk_browser_profile');
        rawCookieValue = c?.value || null;
      } else if (typeof request.cookies === 'object') {
        rawCookieValue = request.cookies['devicedesk_browser_profile'] || null;
      }
    }

    // 2. Check Cookie header fallback
    if (!rawCookieValue && request.headers) {
      let cookieHeader = '';
      if (typeof request.headers.get === 'function') {
        cookieHeader = request.headers.get('cookie') || '';
      } else if (typeof request.headers.cookie === 'string') {
        cookieHeader = request.headers.cookie;
      } else if (typeof request.headers['cookie'] === 'string') {
        cookieHeader = request.headers['cookie'];
      }

      if (cookieHeader) {
        const match = cookieHeader.match(/(?:^|;\s*)devicedesk_browser_profile=([^;]*)/);
        if (match) {
          rawCookieValue = decodeURIComponent(match[1]);
        }
      }
    }

    if (rawCookieValue) {
      try {
        const decoded = typeof rawCookieValue === 'string' && rawCookieValue.startsWith('%')
          ? decodeURIComponent(rawCookieValue)
          : rawCookieValue;
        const parsed = typeof decoded === 'string' ? JSON.parse(decoded) : decoded;
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (e) {}
    }

    // 3. Fallback to custom x-browser-profile-* headers if available
    if (request.headers) {
      const getH = (k) => typeof request.headers.get === 'function' ? request.headers.get(k) : (request.headers[k] || request.headers[k.toLowerCase()]);
      const profileId = getH('x-browser-profile-id');
      const googleEmail = getH('x-google-email');
      const googleName = getH('x-google-name');
      if (profileId || googleEmail) {
        return {
          profileId: profileId || null,
          googleEmail: googleEmail || null,
          googleName: googleName || null
        };
      }
    }
  } catch (e) {}

  return null;
}

let tableEnsured = false;

/**
 * Ensures the security_audit_logs table exists in the database with target user & browser profile columns.
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
        target_user_id VARCHAR(100) NULL,
        target_user_name VARCHAR(150) NULL,
        browser_profile_id VARCHAR(150) NULL,
        google_email VARCHAR(150) NULL,
        google_name VARCHAR(150) NULL,
        google_sub VARCHAR(100) NULL,
        browser_profile_data TEXT NULL,
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
        INDEX idx_target_user_id (target_user_id),
        INDEX idx_browser_profile_id (browser_profile_id),
        INDEX idx_google_email (google_email),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Dynamically add columns if table already existed prior to migration
    try {
      await db.query(`ALTER TABLE security_audit_logs ADD COLUMN target_user_id VARCHAR(100) NULL`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE security_audit_logs ADD COLUMN target_user_name VARCHAR(150) NULL`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE security_audit_logs ADD COLUMN browser_profile_id VARCHAR(150) NULL`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE security_audit_logs ADD COLUMN google_email VARCHAR(150) NULL`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE security_audit_logs ADD COLUMN google_name VARCHAR(150) NULL`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE security_audit_logs ADD COLUMN google_sub VARCHAR(100) NULL`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE security_audit_logs ADD COLUMN browser_profile_data TEXT NULL`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE security_audit_logs ADD INDEX idx_target_user_id (target_user_id)`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE security_audit_logs ADD INDEX idx_browser_profile_id (browser_profile_id)`);
    } catch (e) {}
    try {
      await db.query(`ALTER TABLE security_audit_logs ADD INDEX idx_google_email (google_email)`);
    } catch (e) {}

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
 * @param {string} params.action - Action name (e.g. 'LEAVE_REQUEST_SUBMITTED', 'LOGIN_SUCCESS', 'ATTENDANCE_REGULARIZED')
 * @param {string} [params.category='SECURITY'] - 'AUTH' | 'PASSWORD_RESET' | 'ADMIN_PANEL' | 'EMPLOYEE_REQUEST' | 'ACCESS_CONTROL' | 'DANGER_ZONE'
 * @param {string} [params.status='INFO'] - 'SUCCESS' | 'FAILURE' | 'WARNING' | 'BLOCKED' | 'CRITICAL'
 * @param {Object} [params.user] - The logged-in browser profile user ({ id, name, email, role })
 * @param {Object} [params.targetUser] - The employee for whom the request was submitted ({ id, name, email })
 * @param {Object} [params.browserProfile] - Active Chrome browser profile & Google account metadata ({ profileId, googleEmail, googleName, googleSub, ... })
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
  targetUser = null,
  browserProfile = null,
  identifier = null,
  details = null,
  ip = null
}) {
  try {
    const ctx = extractSecurityContext(request);
    const clientIp = ip || ctx.ip;

    // Resolve Browser Profile & Google Identity from param OR request cookies/headers
    const activeProfile = browserProfile || extractBrowserProfile(request) || null;
    const browserProfileId = activeProfile?.profileId || null;
    const googleEmail = activeProfile?.googleEmail || null;
    const googleName = activeProfile?.googleName || null;
    const googleSub = activeProfile?.googleSub || null;
    const browserProfileData = activeProfile ? (typeof activeProfile === 'string' ? activeProfile : JSON.stringify(activeProfile)) : null;

    // If user is not explicitly passed, attempt to resolve from browser request cookies / headers
    let resolvedUser = user;
    if (!resolvedUser && request) {
      try {
        resolvedUser = await checkAuth(request);
      } catch (authErr) {}
    }

    const userId = resolvedUser?.id || null;
    const userName = resolvedUser?.name || null;
    const userRole = resolvedUser?.role || resolvedUser?.dbRole || null;
    const resolvedIdentifier = identifier || resolvedUser?.email || resolvedUser?.name || resolvedUser?.id || googleEmail || null;

    const targetUserId = targetUser?.id || targetUser?.employeeId || null;
    const targetUserName = targetUser?.name || targetUser?.employeeName || null;

    // Detect if this is a proxy submission (someone submitting on behalf of another employee)
    let isProxySubmission = false;
    if (userId && targetUserId && String(userId).trim().toLowerCase() !== String(targetUserId).trim().toLowerCase()) {
      isProxySubmission = true;
    }

    let payloadDetails = details;
    if (typeof payloadDetails === 'object' && payloadDetails !== null) {
      payloadDetails = {
        ...payloadDetails,
        browserUser: resolvedUser ? { id: resolvedUser.id, name: resolvedUser.name, role: resolvedUser.role, email: resolvedUser.email } : 'Anonymous Browser',
        targetEmployee: targetUserId ? { id: targetUserId, name: targetUserName } : null,
        isProxySubmission,
        chromeProfile: activeProfile ? {
          profileId: browserProfileId,
          googleEmail,
          googleName,
          googleSub,
          isChrome: activeProfile.isChrome ?? true
        } : null,
        clientBrowser: ctx.browser,
        clientOS: ctx.os,
        clientDevice: ctx.device,
        clientIp
      };
    }

    let serializedDetails = null;
    if (payloadDetails) {
      if (typeof payloadDetails === 'object') {
        try {
          serializedDetails = JSON.stringify(payloadDetails);
        } catch (e) {
          serializedDetails = String(payloadDetails);
        }
      } else {
        serializedDetails = String(payloadDetails);
      }
    }

    const db = await getDbConnection();
    await ensureSecurityLogsTable(db);

    await db.execute(
      `INSERT INTO security_audit_logs 
        (user_id, identifier, user_name, user_role, target_user_id, target_user_name, browser_profile_id, google_email, google_name, google_sub, browser_profile_data, action, category, status, ip_address, country, browser, os, device, user_agent, path, method, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        resolvedIdentifier,
        userName,
        userRole,
        targetUserId,
        targetUserName,
        browserProfileId,
        googleEmail,
        googleName,
        googleSub,
        browserProfileData,
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
      `[SECURITY AUDIT] [${status}] [${category}] ${action} | Submitter: ${userName || resolvedIdentifier || 'Anonymous'} | Target: ${targetUserName || 'Self/None'} | ChromeProfile: ${browserProfileId || 'None'} | Google: ${googleEmail || 'None'} | IP: ${clientIp} (${ctx.browser} on ${ctx.os})`
    );
  } catch (err) {
    // Non-blocking: Logging failure should never crash the main application request
    console.error('[SECURITY AUDIT ERROR] Failed to record security event:', err);
  }
}
