import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';
import bcrypt from 'bcryptjs';
import { sendMailNotification } from '../utils/mailHelper.js';

export async function POST(request) {
  try {
    const { identifier, password, deviceId, deviceModel } = await request.json();
    console.log(`[API /login] Login attempt for identifier: "${identifier}" from device: "${deviceId || 'web/unknown'}" at ${new Date().toISOString()}`);

    if (!identifier || !password) {
      return NextResponse.json({ success: false, message: 'Email/name and password are required.' }, { status: 400 });
    }

    // Hard-coded admin shortcut
    // if (identifier.toLowerCase() === 'admin' && password === 'admin123') {
    //   return NextResponse.json({
    //     success: true,
    //     user: { role: 'admin', name: 'Admin', dbRole: 'Admin' }
    //   });
    // }

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
      return NextResponse.json({ success: false, message: '⚠️ Account not found or incorrect password.' }, { status: 401 });
    }

    const emp = rows[0];
    if (emp.status === 'Paused') {
      return NextResponse.json({ success: false, message: '🚫 Your account has been paused due to suspicious activities. Please contact Admin/IT Support.' }, { status: 403 });
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

    // --- Active Marketing Route Multi-Device Restriction ---
    // If user has an active route/trip ('Checked In' and check_out_at IS NULL),
    // do not allow logging in from another device.
    try {
      const [activeRoutes] = await db.query(
        `SELECT id, from_location, to_location, check_in_at, device_id, status 
         FROM marketing_attendance 
         WHERE employee_id = ? AND status = 'Checked In' AND check_out_at IS NULL
         ORDER BY check_in_at DESC 
         LIMIT 1`,
        [emp.id]
      );

      if (activeRoutes && activeRoutes.length > 0) {
        const activeRoute = activeRoutes[0];
        let routeDeviceId = activeRoute.device_id || null;

        // If route doesn't have device_id recorded yet, check user_devices for active registered device
        if (!routeDeviceId) {
          try {
            const [devRows] = await db.query(
              `SELECT deviceId FROM user_devices WHERE userId = ? ORDER BY lastActive DESC LIMIT 1`,
              [emp.id]
            );
            if (devRows && devRows.length > 0 && devRows[0].deviceId) {
              routeDeviceId = devRows[0].deviceId;
            }
          } catch (e) {}
        }

        const cleanIncomingDeviceId = deviceId ? String(deviceId).trim() : '';

        if (routeDeviceId) {
          // If incoming deviceId is different from the device where the route is running
          if (!cleanIncomingDeviceId || cleanIncomingDeviceId !== routeDeviceId) {
            const routeOrigin = activeRoute.from_location ? ` from "${activeRoute.from_location}"` : '';
            const routeDest = activeRoute.to_location ? ` to "${activeRoute.to_location}"` : '';
            return NextResponse.json({
              success: false,
              activeRouteBlocked: true,
              message: `🚫 Login Restricted: You currently have an active marketing route in progress${routeOrigin}${routeDest}. Logging in from another device is not permitted while your route is active. Please complete (check out) your route on your active device before logging in on a new device.`
            }, { status: 403 });
          }
        } else if (cleanIncomingDeviceId) {
          // First time deviceId is captured for this active route, bind it to this route
          try {
            await db.execute(
              `UPDATE marketing_attendance SET device_id = ? WHERE id = ?`,
              [cleanIncomingDeviceId, activeRoute.id]
            );
          } catch (e) {}
        }
      }
    } catch (routeCheckErr) {
      console.warn('Active route check notice during login:', routeCheckErr);
    }

    const isDeskRole = emp.role === 'Admin' || emp.role === 'Management' || emp.role === 'IT Engineer' || emp.role === 'IT Support' || emp.role === 'Team Leader';

    // HR / DNS Manager OTP Check
    const dbRoleStr = `${emp.role || ''}`.toLowerCase().trim();
    const deptStr = `${emp.department || ''}`.toLowerCase().trim();
    const isAdminUser =
      dbRoleStr === 'admin' ||
      dbRoleStr === 'superadmin' ||
      dbRoleStr === 'management' ||
      emp.email === 'admin@yopmail.com' ||
      emp.email === 'pravi@yopmail.com';
    const isHRUser = !isAdminUser && dbRoleStr !== 'candidate' && (dbRoleStr === 'hr' || dbRoleStr === 'Management' || dbRoleStr.includes('hr') || deptStr.includes('hr'));
    const isDnsManager = dbRoleStr === 'dns manager' || deptStr === 'dns manager';

    if (isHRUser || isDnsManager) {
      return NextResponse.json({
        success: true,
        requiresOtp: true,
        email: emp.email,
        userId: emp.id
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: isDeskRole ? 'admin' : 'employee',
        dbRole: emp.role,
        department: emp.department,
        ticketLimit: emp.ticketLimit
      }
    });
  } catch (err) {
    console.error('Login API Error:', err);
    return NextResponse.json({ success: false, message: 'Server error. Please try again.' }, { status: 500 });
  }
}
