import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDbConnection } from '../../../db/db.js';
import { createSessionToken } from '../../../../utils/authTokens.js';

export const dynamic = 'force-dynamic';

/**
 * POST /api/crm/auth/login
 * Dedicated authentication endpoint for CRM Team Agents
 */
export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email address and password are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = await getDbConnection();

    const [rows] = await db.execute(
      `SELECT id, name, email, password, phone, access_type, assigned_companies, status, role, avatar, notes
       FROM crm_team_members
       WHERE LOWER(email) = ?
       LIMIT 1`,
      [cleanEmail]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid email address or password.' },
        { status: 401 }
      );
    }

    const member = rows[0];

    // Check account status
    if (member.status !== 'active') {
      return NextResponse.json(
        { success: false, message: 'Your CRM portal access has been disabled by the administrator. Please contact Superadmin.' },
        { status: 403 }
      );
    }

    // Verify bcrypt password
    const isPasswordValid = await bcrypt.compare(password, member.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid email address or password.' },
        { status: 401 }
      );
    }

    // Parse assigned companies
    let assignedCompanyIds = [];
    try {
      if (member.assigned_companies) {
        assignedCompanyIds = typeof member.assigned_companies === 'string' ? JSON.parse(member.assigned_companies) : member.assigned_companies;
      }
    } catch (e) {
      assignedCompanyIds = [];
    }

    // Update last_login
    await db.execute(`UPDATE crm_team_members SET last_login = NOW() WHERE id = ?`, [member.id]).catch(() => null);

    // Fetch details of assigned companies
    let assignedCompaniesDetails = [];
    try {
      if (member.access_type === 'all') {
        const [allComps] = await db.query(`SELECT id, company_name, website, status FROM crm_saas.companies ORDER BY company_name ASC`);
        assignedCompaniesDetails = allComps || [];
      } else if (assignedCompanyIds.length > 0) {
        const placeholders = assignedCompanyIds.map(() => '?').join(',');
        const [compRows] = await db.query(
          `SELECT id, company_name, website, status FROM crm_saas.companies WHERE id IN (${placeholders}) ORDER BY company_name ASC`,
          assignedCompanyIds
        );
        assignedCompaniesDetails = compRows || [];
      }
    } catch (err) {
      console.warn('Error fetching assigned companies during login:', err.message);
    }

    // Create session token (valid 7 days = 604800s)
    const tokenPayload = {
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: 'crm_agent',
      access_type: member.access_type,
      assigned_companies: assignedCompanyIds
    };

    const { token, expiresAt } = await createSessionToken(tokenPayload, 604800);

    const userProfile = {
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: 'crm_agent',
      access_type: member.access_type,
      assigned_company_ids: assignedCompanyIds,
      assigned_companies_details: assignedCompaniesDetails,
      expiresAt
    };

    const response = NextResponse.json({
      success: true,
      message: 'Login successful. Welcome to DeviceDesk CRM Portal.',
      user: userProfile,
      token
    });

    // Set secure auth cookie
    response.cookies.set('crm_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 604800 // 7 days
    });

    return response;
  } catch (err) {
    console.error('CRM Login API Error:', err);
    return NextResponse.json({ success: false, message: 'Internal server error: ' + err.message }, { status: 500 });
  }
}
