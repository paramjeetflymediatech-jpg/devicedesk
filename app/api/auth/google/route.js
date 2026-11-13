import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import { logSecurityEvent } from '../../utils/securityLogger.js';
import { createSessionToken } from '../../../utils/authTokens.js';

/**
 * Decodes a Google JWT token payload safely without external dependencies.
 */
function decodeGoogleToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  } catch (err) {
    return null;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { credential, googleProfile, browserProfile } = body;

    let targetEmail = null;
    let targetName = null;
    let targetSub = null;
    let targetPicture = null;

    if (credential) {
      const decoded = decodeGoogleToken(credential);
      if (decoded && decoded.email) {
        targetEmail = String(decoded.email).trim().toLowerCase();
        targetName = decoded.name || null;
        targetSub = decoded.sub || null;
        targetPicture = decoded.picture || null;
      }
    }

    if (!targetEmail && googleProfile?.email) {
      targetEmail = String(googleProfile.email).trim().toLowerCase();
      targetName = googleProfile.name || null;
      targetSub = googleProfile.sub || null;
      targetPicture = googleProfile.picture || null;
    }

    if (!targetEmail) {
      await logSecurityEvent({
        request,
        action: 'GOOGLE_AUTH_FAILED',
        category: 'AUTH',
        status: 'FAILURE',
        browserProfile,
        details: { reason: 'No Google email could be parsed from credential or payload.' }
      });
      return NextResponse.json(
        { success: false, message: 'Google authentication credential is missing or invalid.' },
        { status: 400 }
      );
    }

    const db = await getDbConnection();

    // Look up employee by google_email OR primary email
    const [rows] = await db.execute(
      `SELECT id, name, email, role, department, ticketLimit, status, google_email, chrome_profile_id
       FROM employees
       WHERE LOWER(email) = LOWER(?) OR LOWER(google_email) = LOWER(?)
       LIMIT 1`,
      [targetEmail, targetEmail]
    );

    if (rows.length === 0) {
      // Unlinked Google account
      await logSecurityEvent({
        request,
        action: 'GOOGLE_AUTH_UNLINKED',
        category: 'AUTH',
        status: 'WARNING',
        identifier: targetEmail,
        browserProfile: {
          ...(browserProfile || {}),
          googleEmail: targetEmail,
          googleName: targetName,
          googleSub: targetSub
        },
        details: {
          googleEmail: targetEmail,
          googleName: targetName,
          reason: 'Google Chrome profile email is not yet registered or linked with any DeviceDesk user.'
        }
      });

      return NextResponse.json({
        success: false,
        unlinked: true,
        googleEmail: targetEmail,
        googleName: targetName,
        message: `Your Google Chrome profile (${targetEmail}) is not yet linked to a DeviceDesk account. Please sign in with your DeviceDesk username & password to link it.`
      }, { status: 404 });
    }

    const emp = rows[0];
    const statusLower = (emp.status || 'Active').toLowerCase().trim();

    if (statusLower === 'inactive' || statusLower === 'paused' || statusLower === 'disabled') {
      await logSecurityEvent({
        request,
        action: 'GOOGLE_AUTH_BLOCKED',
        category: 'ACCESS_CONTROL',
        status: 'BLOCKED',
        user: emp,
        identifier: targetEmail,
        browserProfile: {
          ...(browserProfile || {}),
          googleEmail: targetEmail,
          googleName: targetName,
          googleSub: targetSub
        },
        details: { reason: `Account is ${statusLower}. Access via Chrome Google profile denied.` }
      });

      return NextResponse.json({
        success: false,
        isInactive: true,
        userId: emp.id,
        name: emp.name,
        email: emp.email,
        message: `Your account is ${statusLower}. Please contact your Administrator or HR.`
      }, { status: 403 });
    }

    // Update / link Google Chrome Profile on the employee record
    try {
      const serializedProfile = browserProfile ? (typeof browserProfile === 'string' ? browserProfile : JSON.stringify(browserProfile)) : null;
      await db.execute(
        `UPDATE employees 
         SET google_email = ?,
             google_sub = COALESCE(?, google_sub),
             chrome_profile_id = COALESCE(?, chrome_profile_id),
             last_browser_profile = COALESCE(?, last_browser_profile)
         WHERE id = ?`,
        [
          targetEmail,
          targetSub,
          browserProfile?.profileId || null,
          serializedProfile,
          emp.id
        ]
      );
    } catch (updateErr) {
      console.warn('Failed to update Google profile on employee record:', updateErr);
    }

    const dbRoleStr = `${emp.role || ''}`.toLowerCase().trim();
    const deptStr = `${emp.department || ''}`.toLowerCase().trim();
    const empEmailLower = `${emp.email || targetEmail || ''}`.toLowerCase().trim();
    const empNameLower = `${emp.name || targetName || ''}`.toLowerCase().trim();

    const isSuperAdmin =
      dbRoleStr === 'superadmin' ||
      dbRoleStr === 'super admin' ||
      dbRoleStr === 'admin' ||
      dbRoleStr === 'management' ||
      dbRoleStr === 'executive' ||
      dbRoleStr.includes('superadmin') ||
      empEmailLower === 'admin@yopmail.com' ||
      empEmailLower === 'pravi@yopmail.com' ||
      empEmailLower === 'admin@devicedesk.com' ||
      empEmailLower.startsWith('superadmin@') ||
      empNameLower === 'superadmin' ||
      empNameLower === 'super admin' ||
      empNameLower === 'admin';

    const isHRUser = !isSuperAdmin && dbRoleStr !== 'candidate' && (dbRoleStr === 'hr' || dbRoleStr === 'management' || dbRoleStr.includes('hr') || deptStr.includes('hr'));
    const isDnsManager = dbRoleStr === 'dns manager' || deptStr === 'dns manager';

    if (isSuperAdmin || isHRUser || isDnsManager) {
      const authRole = isSuperAdmin ? 'Superadmin' : isDnsManager ? 'DNS Manager' : 'HR';
      await logSecurityEvent({
        request,
        action: 'LOGIN_OTP_TRIGGERED',
        category: 'AUTH',
        status: 'SUCCESS',
        user: emp,
        identifier: targetEmail,
        browserProfile,
        details: { reason: `${authRole} 2FA OTP verification required after Google authentication.` }
      });
      return NextResponse.json({
        success: true,
        requiresOtp: true,
        email: emp.email || targetEmail,
        userId: emp.id
      });
    }

    const isDeskRole =
      isSuperAdmin ||
      emp.role === 'Admin' ||
      emp.role === 'Management' ||
      emp.role === 'IT Engineer' ||
      emp.role === 'IT Support' ||
      emp.role === 'Team Leader';

    // Log successful Google Chrome Profile login
    await logSecurityEvent({
      request,
      action: 'GOOGLE_CHROME_LOGIN',
      category: 'AUTH',
      status: 'SUCCESS',
      user: emp,
      identifier: targetEmail,
      browserProfile: {
        ...(browserProfile || {}),
        googleEmail: targetEmail,
        googleName: targetName,
        googleSub: targetSub,
        googlePicture: targetPicture
      },
      details: {
        method: 'Google One Tap / Chrome Profile Identity',
        googleEmail: targetEmail,
        googleName: targetName,
        chromeProfileId: browserProfile?.profileId || null
      }
    });

    const { token, expiresAt } = await createSessionToken({
      userId: emp.id,
      email: emp.email,
      name: emp.name,
      role: isDeskRole ? 'admin' : 'employee',
      dbRole: emp.role,
      department: emp.department
    });

    const userPayload = {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      role: isDeskRole ? 'admin' : 'employee',
      dbRole: emp.role,
      department: emp.department,
      ticketLimit: emp.ticketLimit,
      status: emp.status || 'Active',
      googleEmail: targetEmail,
      googleName: targetName,
      avatarUrl: targetPicture || null,
      token,
      expiresAt
    };

    const response = NextResponse.json({
      success: true,
      token,
      expiresAt,
      user: userPayload
    });

    const maxAge = 86400; // 24 hours
    response.cookies.set('devicedesk_token', token, { path: '/', maxAge, sameSite: 'lax' });
    response.cookies.set('devicedesk_token_exp', String(expiresAt), { path: '/', maxAge, sameSite: 'lax' });
    response.cookies.set('devicedesk_user_role', emp.role || 'employee', { path: '/', maxAge, sameSite: 'lax' });
    response.cookies.set('devicedesk_auth_user', JSON.stringify(userPayload), { path: '/', maxAge, sameSite: 'lax' });

    return response;
  } catch (err) {
    console.error('Google Auth API Error:', err);
    return NextResponse.json({ success: false, message: 'Server error during Google profile authentication.' }, { status: 500 });
  }
}

