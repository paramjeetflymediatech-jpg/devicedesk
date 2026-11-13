import { NextResponse } from 'next/server';
import { verifySessionToken } from '../../../utils/authTokens.js';
import { getDbConnection } from '../../db/db.js';

export async function GET(request) {
  try {
    const rawToken = request.cookies.get('devicedesk_token')?.value;
    const rawAuthUser = request.cookies.get('devicedesk_auth_user')?.value;
    const rawTokenExp = request.cookies.get('devicedesk_token_exp')?.value;

    let userId = null;
    let isExpired = false;

    // 1. Check via JWT token
    if (rawToken) {
      const check = await verifySessionToken(rawToken);
      if (check.valid && check.payload) {
        userId = check.payload.userId || check.payload.id;
      } else if (check.expired) {
        isExpired = true;
      }
    }

    // 2. Fallback check via auth_user cookie
    if (!userId && !isExpired && rawAuthUser) {
      try {
        const decodedStr = rawAuthUser.startsWith('%') ? decodeURIComponent(rawAuthUser) : rawAuthUser;
        const parsed = JSON.parse(decodedStr);
        if (parsed?.expiresAt && Date.now() > Number(parsed.expiresAt)) {
          isExpired = true;
        } else if (rawTokenExp && Date.now() > Number(rawTokenExp)) {
          isExpired = true;
        } else if (parsed?.id) {
          userId = parsed.id;
        }
      } catch (e) {}
    }

    if (isExpired || !userId) {
      const response = NextResponse.json(
        {
          success: false,
          authenticated: false,
          expired: isExpired,
          message: isExpired ? 'Session token has expired' : 'Unauthenticated'
        },
        { status: 401 }
      );
      if (isExpired) {
        response.cookies.delete('devicedesk_token');
        response.cookies.delete('devicedesk_auth_user');
        response.cookies.delete('devicedesk_user_role');
        response.cookies.delete('devicedesk_token_exp');
      }
      return response;
    }

    // Verify user is still active in database
    const db = await getDbConnection();
    const [rows] = await db.execute(
      `SELECT id, name, email, role, department, ticketLimit, status FROM employees WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, authenticated: false, message: 'Account not found' },
        { status: 401 }
      );
    }

    const emp = rows[0];
    const statusLower = (emp.status || 'Active').toLowerCase().trim();
    if (statusLower !== 'active') {
      return NextResponse.json(
        { success: false, authenticated: false, isInactive: true, message: `Account is ${statusLower}` },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        dbRole: emp.role,
        department: emp.department,
        ticketLimit: emp.ticketLimit,
        status: emp.status || 'Active'
      }
    });
  } catch (err) {
    console.error('Session check error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

