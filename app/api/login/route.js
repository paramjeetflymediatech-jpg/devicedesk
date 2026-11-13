import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';
import bcrypt from 'bcryptjs';
import { sendMailNotification } from '../utils/mailHelper.js';
import { logSecurityEvent } from '../utils/securityLogger.js';
import { createSessionToken } from '../../utils/authTokens.js';

export async function POST(request) {
  try {
    const { identifier, password, deviceId, deviceModel, browserProfile } = await request.json();
    console.log(`[API /login] Login attempt for identifier: "${identifier}" from device: "${deviceId || 'web/unknown'}" ChromeProfile: "${browserProfile?.profileId || 'N/A'}" GoogleEmail: "${browserProfile?.googleEmail || 'N/A'}" at ${new Date().toISOString()}`);

    if (!identifier || !password) {
      await logSecurityEvent({
        request,
        action: 'LOGIN_FAILED',
        category: 'AUTH',
        status: 'FAILURE',
        identifier: identifier || 'Unknown',
        browserProfile,
        details: { reason: 'Email/name or password was missing in request payload.' }
      });
      return NextResponse.json({ success: false, message: 'Email/name and password are required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Fetch by email OR name OR id — do NOT compare password in SQL; use bcrypt below
    const [rows] = await db.execute(
      `SELECT id, name, email, password, role, department, ticketLimit, status
       FROM employees
       WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?) OR LOWER(id) = LOWER(?)
       LIMIT 1`,
      [identifier.toLowerCase().trim(), identifier.toLowerCase().trim(), identifier.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      await logSecurityEvent({
        request,
        action: 'LOGIN_FAILED',
        category: 'AUTH',
        status: 'FAILURE',
        identifier,
        browserProfile,
        details: { reason: 'Account not found with this identifier.', deviceId: deviceId || null }
      });
      return NextResponse.json({ success: false, message: '⚠️ Account not found or incorrect password.' }, { status: 401 });
    }

    const emp = rows[0];
    const statusLower = (emp.status || 'Active').toLowerCase().trim();
    if (statusLower === 'inactive') {
      await logSecurityEvent({
        request,
        action: 'LOGIN_BLOCKED',
        category: 'ACCESS_CONTROL',
        status: 'BLOCKED',
        user: emp,
        identifier,
        browserProfile,
        details: { reason: 'Account is inactive. Contact Administrator or HR.', status: emp.status }
      });
      return NextResponse.json({
        success: false,
        isInactive: true,
        userId: emp.id,
        name: emp.name,
        email: emp.email,
        message: ' Your account is currently inactive. Please contact Administrator or HR to reactivate your account.'
      }, { status: 403 });
    }
    if (statusLower === 'paused') {
      await logSecurityEvent({
        request,
        action: 'LOGIN_BLOCKED',
        category: 'ACCESS_CONTROL',
        status: 'BLOCKED',
        user: emp,
        identifier,
        browserProfile,
        details: { reason: 'Account paused due to suspicious activity.', status: emp.status }
      });
      return NextResponse.json({
        success: false,
        isInactive: true,
        userId: emp.id,
        name: emp.name,
        email: emp.email,
        message: '🚫 Your account has been paused due to suspicious activities. Please contact Admin/IT Support.'
      }, { status: 403 });
    }
    if (statusLower === 'disabled' || statusLower === 'suspended') {
      await logSecurityEvent({
        request,
        action: 'LOGIN_BLOCKED',
        category: 'ACCESS_CONTROL',
        status: 'BLOCKED',
        user: emp,
        identifier,
        browserProfile,
        details: { reason: `Account is ${statusLower}. Contact Admin/IT Support.`, status: emp.status }
      });
      return NextResponse.json({
        success: false,
        isInactive: true,
        userId: emp.id,
        name: emp.name,
        email: emp.email,
        message: '🚫 Your account has been disabled. Please contact Admin/IT Support.'
      }, { status: 403 });
    }
    const storedPassword = emp.password || '';

    // Support bcrypt hashes AND legacy plain-text passwords (backward compatibility)
    let passwordMatch = false;
    const pepper = process.env.PASSWORD_PEPPER || 'devicedesk_secure_pepper_key_2026';
    if (storedPassword.startsWith('$2')) {
      // 1. Try with configured pepper
      passwordMatch = await bcrypt.compare(password + pepper, storedPassword);
      // 2. Try without pepper (in case hashed directly)
      if (!passwordMatch) {
        passwordMatch = await bcrypt.compare(password, storedPassword);
      }
      // 3. Try with default fallback pepper
      if (!passwordMatch && pepper !== 'devicedesk_secure_pepper_key_2026') {
        passwordMatch = await bcrypt.compare(password + 'devicedesk_secure_pepper_key_2026', storedPassword);
      }
      // 4. Try with securelevel fallback pepper
      if (!passwordMatch && pepper !== 'securelevel') {
        passwordMatch = await bcrypt.compare(password + 'securelevel', storedPassword);
      }
    } else {
      // Legacy plain-text fallback
      passwordMatch = storedPassword === password;
    }

    if (!passwordMatch) {
      await logSecurityEvent({
        request,
        action: 'LOGIN_FAILED',
        category: 'AUTH',
        status: 'FAILURE',
        user: emp,
        identifier,
        browserProfile,
        details: { reason: 'Incorrect password provided.', deviceId: deviceId || null }
      });
      return NextResponse.json({ success: false, message: '⚠️ Account not found or incorrect password.' }, { status: 401 });
    }

    // Auto-migrate legacy plain-text password to bcrypt hash upon successful login
    if (!storedPassword.startsWith('$2') && passwordMatch) {
      try {
        const db = await getDbConnection();
        const newHash = await bcrypt.hash(password + pepper, 10);
        await db.execute('UPDATE employees SET password = ? WHERE id = ?', [newHash, emp.id]);
      } catch (migrateErr) {
        console.warn('Auto-hash password migration failed:', migrateErr);
      }
    }

    // Primary verified identity is the authenticating employee's own email and name
    const effectiveGoogleEmail = (emp.email && emp.email.includes('@'))
      ? emp.email
      : (browserProfile?.googleEmail || null);
    const effectiveGoogleName = emp.name || browserProfile?.googleName || null;
    const effectiveProfileId = browserProfile?.profileId || null;

    const enrichedProfile = {
      ...(browserProfile || {}),
      profileId: effectiveProfileId,
      googleEmail: effectiveGoogleEmail,
      googleName: effectiveGoogleName
    };

    if (effectiveProfileId || effectiveGoogleEmail) {
      try {
        const serializedProfile = JSON.stringify(enrichedProfile);
        await db.execute(
          `UPDATE employees 
           SET google_email = COALESCE(?, google_email),
               google_sub = COALESCE(?, google_sub),
               chrome_profile_id = COALESCE(?, chrome_profile_id),
               last_browser_profile = ?
           WHERE id = ?`,
          [
            effectiveGoogleEmail,
            browserProfile?.googleSub || null,
            effectiveProfileId,
            serializedProfile,
            emp.id
          ]
        );
      } catch (profErr) {
        console.warn('Failed to update employee browser profile link:', profErr.message);
      }
    }

    // --- Active Marketing Route Handling ---
    // When a marketing team member logs in (even after app reinstall or logout),
    // update/re-bind the active route's device_id to the current device so they can seamlessly
    // resume their active trip, view tracking, and complete check-out.
    try {
      const cleanIncomingDeviceId = deviceId ? String(deviceId).trim() : '';
      if (cleanIncomingDeviceId) {
        await db.execute(
          `UPDATE marketing_attendance 
           SET device_id = ? 
           WHERE employee_id = ? AND status = 'Checked In' AND check_out_at IS NULL`,
          [cleanIncomingDeviceId, emp.id]
        );
      }
    } catch (routeCheckErr) {
      console.warn('Active route re-bind notice during login:', routeCheckErr);
    }

    const isDeskRole = emp.role === 'Admin' || emp.role === 'Management' || emp.role === 'IT Engineer' || emp.role === 'IT Support' || emp.role === 'Team Leader';

    // Superadmin / HR / DNS Manager 2FA OTP Check
    const dbRoleStr = `${emp.role || ''}`.toLowerCase().trim();
    const deptStr = `${emp.department || ''}`.toLowerCase().trim();
    const empEmailLower = `${emp.email || ''}`.toLowerCase().trim();
    const empNameLower = `${emp.name || ''}`.toLowerCase().trim();

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
        identifier,
        browserProfile,
        details: { reason: `${authRole} 2FA OTP verification required before granting session access.` }
      });
      return NextResponse.json({
        success: true,
        requiresOtp: true,
        email: emp.email || 'admin@devicedesk.com',
        userId: emp.id
      });
    }

    let companyName = null;
    if (dbRoleStr === 'client') {
      try {
        const [cdRows] = await db.execute('SELECT company_name FROM client_details WHERE client_id = ? LIMIT 1', [emp.id]);
        if (cdRows.length > 0 && cdRows[0].company_name) {
          companyName = cdRows[0].company_name;
        }
      } catch (cdErr) {}
    }

    await logSecurityEvent({
      request,
      action: 'LOGIN_SUCCESS',
      category: 'AUTH',
      status: 'SUCCESS',
      user: emp,
      identifier,
      browserProfile: {
        ...(browserProfile || {}),
        profileId: effectiveProfileId,
        googleEmail: effectiveGoogleEmail,
        googleName: effectiveGoogleName
      },
      details: {
        role: emp.role,
        department: emp.department,
        deviceId: deviceId || 'web',
        deviceModel: deviceModel || null
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
      company_name: companyName,
      email: emp.email,
      role: isDeskRole ? 'admin' : 'employee',
      dbRole: emp.role,
      department: emp.department,
      ticketLimit: emp.ticketLimit,
      status: emp.status || 'Active',
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
    console.error('Login API Error:', err);
    return NextResponse.json({ success: false, message: 'Server error. Please try again.' }, { status: 500 });
  }
}
