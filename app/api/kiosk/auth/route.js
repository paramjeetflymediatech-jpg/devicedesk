import { NextResponse } from 'next/server';
import {
  getClientIp,
  isAllowedOfficeIp,
  generateKioskToken,
  verifyKioskToken
} from '../../utils/kioskSecurity.js';

// GET: Check client IP status and verify if current token is valid
export async function GET(request) {
  const clientIp = getClientIp(request);
  const officeIpsEnv = process.env.KIOSK_OFFICE_IPS !== undefined
    ? process.env.KIOSK_OFFICE_IPS
    : (process.env.OFFICE_IPS || '');
  const trimmed = officeIpsEnv.trim().toLowerCase();
  const hasIpConfig = Boolean(trimmed && trimmed !== '*' && trimmed !== 'any' && trimmed !== 'all' && trimmed !== 'none');
  const isOfficeIp = isAllowedOfficeIp(clientIp);

  const token = request.headers.get('x-kiosk-token') || new URL(request.url).searchParams.get('token');
  const isUnlocked = verifyKioskToken(token);

  return NextResponse.json({
    success: true,
    clientIp,
    isOfficeIp,
    isIpConfigured: hasIpConfig,
    isUnlocked,
    requiresPin: true
  });
}

// POST: Verify PIN and issue authorized Kiosk Token
export async function POST(request) {
  try {
    const clientIp = getClientIp(request);
    const isOfficeIp = isAllowedOfficeIp(clientIp);

    // If external office IP restriction is active and client IP doesn't match
    const officeIpsEnv = process.env.KIOSK_OFFICE_IPS !== undefined
      ? process.env.KIOSK_OFFICE_IPS
      : (process.env.OFFICE_IPS || '');
    const trimmed = officeIpsEnv.trim().toLowerCase();
    const hasIpConfig = Boolean(trimmed && trimmed !== '*' && trimmed !== 'any' && trimmed !== 'all' && trimmed !== 'none');

    if (hasIpConfig && !isOfficeIp) {
      return NextResponse.json({
        success: false,
        errorType: 'IP_RESTRICTED',
        clientIp,
        message: `Access Denied: Terminal is not on the office network (Your IP: ${clientIp}). Please connect to the office Wi-Fi.`
      }, { status: 403 });
    }

    const body = await request.json();
    const { pin } = body;

    const expectedPin = String(process.env.KIOSK_PIN || '1234').trim();
    const enteredPin = String(pin || '').trim();

    if (!enteredPin) {
      return NextResponse.json({
        success: false,
        errorType: 'INVALID_PIN',
        message: 'Kiosk PIN is required.'
      }, { status: 400 });
    }

    if (enteredPin !== expectedPin) {
      return NextResponse.json({
        success: false,
        errorType: 'INVALID_PIN',
        message: 'Incorrect Kiosk PIN. Please enter the valid Admin PIN.'
      }, { status: 401 });
    }

    const token = generateKioskToken();

    return NextResponse.json({
      success: true,
      token,
      clientIp,
      isOfficeIp,
      message: 'Kiosk Terminal authorized successfully.'
    });
  } catch (err) {
    console.error('Kiosk Auth Error:', err);
    return NextResponse.json({
      success: false,
      message: 'Server error during kiosk authentication.'
    }, { status: 500 });
  }
}
