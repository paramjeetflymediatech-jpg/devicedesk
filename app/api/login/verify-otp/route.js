import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import { logSecurityEvent } from '../../utils/securityLogger.js';

export async function POST(request) {
  try {
    const { userId, otp, browserProfile } = await request.json();
    console.log('[Verify OTP] Incoming payload:', { userId, otp, chromeProfile: browserProfile?.profileId });

    if (!userId || !otp) {
      await logSecurityEvent({
        request,
        action: 'OTP_VERIFY_FAILED',
        category: 'AUTH',
        status: 'FAILURE',
        identifier: userId || 'Unknown',
        details: { reason: 'User ID or OTP missing in request.' }
      });
      return NextResponse.json({ success: false, message: 'User ID and OTP are required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Check OTP existence
    console.log('[Verify OTP] Checking DB for:', { userId, otp });
    const [otpRows] = await db.execute(
      `SELECT * FROM login_otps WHERE employeeId = ? AND otp = ? ORDER BY createdAt DESC LIMIT 1`,
      [userId, otp]
    );
    console.log('[Verify OTP] DB result:', otpRows);

    if (otpRows.length === 0) {
      await logSecurityEvent({
        request,
        action: 'OTP_VERIFY_FAILED',
        category: 'AUTH',
        status: 'FAILURE',
        identifier: userId,
        details: { reason: 'Invalid OTP code provided.' }
      });
      return NextResponse.json({ success: false, message: 'Invalid OTP. Please check the code and try again.' }, { status: 400 });
    }

    const otpRecord = otpRows[0];
    
    if (otpRecord.used === 1 || otpRecord.used === true) {
      await logSecurityEvent({
        request,
        action: 'OTP_VERIFY_FAILED',
        category: 'AUTH',
        status: 'WARNING',
        identifier: userId,
        details: { reason: 'OTP code has already been used or invalidated by newer attempt.' }
      });
      return NextResponse.json({ success: false, message: 'This OTP has already been invalidated by a newer login attempt! Please check sent_emails.log for the newest code.' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (now > otpRecord.expiresAt) {
      await logSecurityEvent({
        request,
        action: 'OTP_VERIFY_FAILED',
        category: 'AUTH',
        status: 'FAILURE',
        identifier: userId,
        details: { reason: 'OTP has expired.' }
      });
      return NextResponse.json({ success: false, message: 'OTP has expired. Please resend.' }, { status: 400 });
    }

    // Mark as used
    await db.execute(`UPDATE login_otps SET used = 1 WHERE id = ?`, [otpRecord.id]);

    // Fetch user details for login success
    const [empRows] = await db.execute(`SELECT * FROM employees WHERE id = ? LIMIT 1`, [userId]);

    if (empRows.length === 0) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    const emp = empRows[0];
    const statusLower = (emp.status || 'Active').toLowerCase().trim();
    if (statusLower === 'inactive') {
      await logSecurityEvent({
        request,
        action: 'LOGIN_BLOCKED',
        category: 'ACCESS_CONTROL',
        status: 'BLOCKED',
        user: emp,
        identifier: emp.email || emp.id,
        details: { reason: 'Account inactive during 2FA OTP verification.' }
      });
      return NextResponse.json({
        success: false,
        isInactive: true,
        userId: emp.id,
        name: emp.name,
        email: emp.email,
        message: '⚠️ 🚫 Your account is currently inactive. Please contact Administrator or HR to reactivate your account.'
      }, { status: 403 });
    }
    if (statusLower === 'paused') {
      await logSecurityEvent({
        request,
        action: 'LOGIN_BLOCKED',
        category: 'ACCESS_CONTROL',
        status: 'BLOCKED',
        user: emp,
        identifier: emp.email || emp.id,
        details: { reason: 'Account paused during 2FA OTP verification.' }
      });
      return NextResponse.json({
        success: false,
        isInactive: true,
        userId: emp.id,
        name: emp.name,
        email: emp.email,
        message: '🚫 Your account has been paused. Please contact Admin/IT Support.'
      }, { status: 403 });
    }

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

    const isHRUser = dbRoleStr === 'hr' || dbRoleStr.includes('hr') || deptStr.includes('hr');
    const isIT =
      dbRoleStr.includes('it') ||
      deptStr.includes('it') ||
      dbRoleStr === 'it engineer' ||
      dbRoleStr === 'it support';

    const isDeskRole =
      isSuperAdmin ||
      isHRUser ||
      isIT ||
      dbRoleStr === 'team leader' ||
      dbRoleStr === 'tl' ||
      emp.role === 'Admin' ||
      emp.role === 'Management';

    let companyName = null;
    if (dbRoleStr === 'client') {
      try {
        const [cdRows] = await db.execute('SELECT company_name FROM client_details WHERE client_id = ? LIMIT 1', [emp.id]);
        if (cdRows.length > 0 && cdRows[0].company_name) {
          companyName = cdRows[0].company_name;
        }
      } catch (cdErr) {}
    }

    // Primary verified identity is the authenticating employee's own email and name
    const effectiveGoogleEmail = (emp.email && emp.email.includes('@'))
      ? emp.email
      : (browserProfile?.googleEmail || null);
    const effectiveGoogleName = emp.name || browserProfile?.googleName || null;
    const effectiveProfileId = browserProfile?.profileId || null;

    if (effectiveProfileId || effectiveGoogleEmail) {
      try {
        const enrichedProfile = {
          ...(browserProfile || {}),
          profileId: effectiveProfileId,
          googleEmail: effectiveGoogleEmail,
          googleName: effectiveGoogleName
        };
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
        console.warn('Failed to update employee browser profile link in OTP:', profErr.message);
      }
    }

    await logSecurityEvent({
      request,
      action: 'LOGIN_SUCCESS_2FA',
      category: 'AUTH',
      status: 'SUCCESS',
      user: emp,
      identifier: emp.email || emp.id,
      browserProfile: {
        ...(browserProfile || {}),
        profileId: effectiveProfileId,
        googleEmail: effectiveGoogleEmail,
        googleName: effectiveGoogleName
      },
      details: { reason: '2FA OTP verification succeeded. Session authorized.' }
    });

    return NextResponse.json({
      success: true,
      user: {
        id:          emp.id,
        name:        emp.name,
        company_name: companyName,
        email:       emp.email || (isSuperAdmin ? 'admin@devicedesk.com' : ''),
        role:        isDeskRole ? 'admin' : 'employee',
        dbRole:      emp.role || (isSuperAdmin ? 'Admin' : 'Employee'),
        department:  emp.department,
        ticketLimit: emp.ticketLimit,
        status:      emp.status || 'Active'
      }
    });
  } catch (err) {
    console.error('Verify OTP API Error:', err);
    return NextResponse.json({ success: false, message: 'Server error. Please try again.' }, { status: 500 });
  }
}
