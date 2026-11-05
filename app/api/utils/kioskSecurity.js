import crypto from 'crypto';

export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  let ip = (forwarded ? forwarded.split(',')[0].trim() : realIp) || '127.0.0.1';
  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  return ip;
}

export function isAllowedOfficeIp(ip) {
  // Always allow localhost / loopback for local development and testing
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return true;
  }

  // Always allow private office local subnets (office LAN / Wi-Fi internal IPs)
  if (
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  ) {
    return true;
  }

  const officeIpsEnv = process.env.KIOSK_OFFICE_IPS || process.env.OFFICE_IPS || '';
  if (!officeIpsEnv.trim()) {
    // If no specific external IPs are configured in .env, allow by default
    return true;
  }

  const allowedIps = officeIpsEnv.split(',').map(s => s.trim()).filter(Boolean);
  return allowedIps.includes(ip);
}

export function generateKioskToken() {
  const pin = process.env.KIOSK_PIN || '1234';
  const secret = process.env.KIOSK_SECRET_KEY || 'flymedia_kiosk_secret_salt_2026';
  return crypto.createHmac('sha256', secret).update(`KIOSK_AUTHORIZED_${pin}`).digest('hex');
}

export function verifyKioskToken(token) {
  if (!token) return false;
  const expectedToken = generateKioskToken();
  return token === expectedToken;
}

