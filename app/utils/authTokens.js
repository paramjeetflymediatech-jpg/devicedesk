// app/utils/authTokens.js

const SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'devicedesk_jwt_super_secure_auth_key_2026_x89q';

// Universal Base64Url encode/decode (Edge & Node compatible)
export function toBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function fromBase64Url(b64url) {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

let cachedKey = null;
async function getCryptoKey() {
  if (cachedKey) return cachedKey;
  cachedKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  return cachedKey;
}

/**
 * Creates a signed JWT token valid for the specified duration (default: 24h = 86400s)
 */
export async function createSessionToken(payload, expiresInSeconds = 86400) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInSeconds;
  const fullPayload = {
    ...payload,
    exp,
    iat: now
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const headerPart = toBase64Url(enc.encode(JSON.stringify(header)));
  const payloadPart = toBase64Url(enc.encode(JSON.stringify(fullPayload)));
  const data = enc.encode(`${headerPart}.${payloadPart}`);

  const key = await getCryptoKey();
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const sigPart = toBase64Url(new Uint8Array(signature));

  return {
    token: `${headerPart}.${payloadPart}.${sigPart}`,
    expiresAt: exp * 1000 // In milliseconds
  };
}

/**
 * Verifies a JWT token. Checks format, HMAC signature, and expiration timestamp.
 */
export async function verifySessionToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, expired: false, error: 'Missing token' };
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, expired: false, error: 'Malformed token structure' };
  }

  const [headerPart, payloadPart, sigPart] = parts;

  try {
    const key = await getCryptoKey();
    const data = enc.encode(`${headerPart}.${payloadPart}`);
    const sigBytes = fromBase64Url(sigPart);

    const isValidSig = await crypto.subtle.verify('HMAC', key, sigBytes, data);
    if (!isValidSig) {
      return { valid: false, expired: false, error: 'Invalid token signature' };
    }

    const payloadJson = dec.decode(fromBase64Url(payloadPart));
    const payload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      return { valid: false, expired: true, error: 'Session token has expired', payload };
    }

    return { valid: true, expired: false, payload };
  } catch (err) {
    return { valid: false, expired: false, error: err.message };
  }
}

/**
 * Strict check if a user is Root Admin / Superadmin / Management.
 * Notice: Team Leaders, HR, and regular employees NEVER pass this check!
 */
export function isSuperAdminUser(user) {
  if (!user) return false;
  const dbRoleLower = (user.dbRole || '').toLowerCase().trim();
  const emailLower = (user.email || '').toLowerCase().trim();

  // Explicit admin emails
  if (
    emailLower === 'admin@yopmail.com' ||
    emailLower === 'pravi@yopmail.com' ||
    emailLower === 'admin@devicedesk.com' ||
    emailLower.startsWith('superadmin@')
  ) {
    return true;
  }

  // Explicit admin roles
  return (
    dbRoleLower === 'superadmin' ||
    dbRoleLower === 'super admin' ||
    dbRoleLower === 'admin' ||
    dbRoleLower === 'management' ||
    dbRoleLower === 'executive'
  );
}

/**
 * Checks if user belongs to IT Support / IT Engineering department or role
 */
export function isITSupportUser(user) {
  if (!user) return false;
  const dbRoleLower = (user.dbRole || '').toLowerCase().trim();
  const deptLower = (user.department || '').toLowerCase().trim();
  return (
    deptLower === 'it' ||
    deptLower === 'it support' ||
    deptLower === 'it_support' ||
    deptLower === 'it department' ||
    deptLower === 'information technology' ||
    deptLower.startsWith('it ') ||
    deptLower.endsWith(' it') ||
    deptLower.includes(' it ') ||
    deptLower.includes('it support') ||
    dbRoleLower === 'it' ||
    dbRoleLower === 'it support' ||
    dbRoleLower === 'it_support' ||
    dbRoleLower === 'it engineer' ||
    dbRoleLower === 'it_engineer'
  );
}

/**
 * Checks if user is DNS Manager
 */
export function isDnsManagerUser(user) {
  if (!user) return false;
  const dbRoleLower = (user.dbRole || '').toLowerCase().trim();
  const deptLower = (user.department || '').toLowerCase().trim();
  return dbRoleLower === 'dns manager' || deptLower === 'dns manager';
}

/**
 * Resolves the authorized dashboard destination for a user
 */
export function getAuthorizedDashboard(user) {
  if (!user) return '/login';
  const dbRoleLower = (user.dbRole || '').toLowerCase().trim();
  const emailLower = (user.email || '').toLowerCase().trim();
  const deptLower = (user.department || '').toLowerCase().trim();

  if (emailLower === 'developer@devicedesk.com' || dbRoleLower === 'developer') {
    return '/developer/dashboard';
  }
  if (isSuperAdminUser(user)) {
    return '/';
  }
  if (isITSupportUser(user)) {
    return '/?tab=dashboard';
  }
  if (dbRoleLower === 'client') {
    return '/portal/client';
  }
  if (dbRoleLower === 'candidate') {
    return '/candidate-dashboard';
  }
  if (dbRoleLower === 'marketing') {
    return '/portal/marketing';
  }
  if (
    dbRoleLower === 'tl' ||
    dbRoleLower === 'team lead' ||
    dbRoleLower === 'team leader' ||
    dbRoleLower === 'team_lead'
  ) {
    return '/portal/leader';
  }
  if (dbRoleLower === 'dns manager' || deptLower === 'dns manager') {
    return '/admin/domains';
  }
  return '/employee-dashboard';
}

