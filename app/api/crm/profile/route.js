import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDbConnection } from '../../db/db.js';
import { verifySessionToken } from '../../../utils/authTokens.js';

export const dynamic = 'force-dynamic';

async function getAuthenticatedCrmAgent(request) {
  const cookieToken = request.cookies.get('crm_auth_token')?.value;
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const token = bearerToken || cookieToken;

  if (!token) return null;
  const { valid, expired, payload } = await verifySessionToken(token);
  if (!valid || expired || !payload?.id) return null;
  return payload;
}

/**
 * GET /api/crm/profile
 * Returns profile of the authenticated CRM team member
 */
export async function GET(request) {
  try {
    const authAgent = await getAuthenticatedCrmAgent(request);
    if (!authAgent) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Valid CRM session required.' }, { status: 401 });
    }

    const db = await getDbConnection();
    const [rows] = await db.execute(
      `SELECT id, name, email, phone, access_type, assigned_companies, status, role, avatar, notes, last_login, created_at
       FROM crm_team_members
       WHERE id = ? LIMIT 1`,
      [authAgent.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Agent profile not found.' }, { status: 404 });
    }

    const member = rows[0];
    let companyIds = [];
    try {
      if (member.assigned_companies) {
        companyIds = typeof member.assigned_companies === 'string' ? JSON.parse(member.assigned_companies) : member.assigned_companies;
      }
    } catch (e) {
      companyIds = [];
    }

    let companiesDetails = [];
    try {
      if (member.access_type === 'all') {
        const [allComps] = await db.query(`SELECT id, company_name, website, status FROM crm_saas.companies ORDER BY company_name ASC`);
        companiesDetails = allComps || [];
      } else if (companyIds.length > 0) {
        const placeholders = companyIds.map(() => '?').join(',');
        const [compRows] = await db.query(
          `SELECT id, company_name, website, status FROM crm_saas.companies WHERE id IN (${placeholders}) ORDER BY company_name ASC`,
          companyIds
        );
        companiesDetails = compRows || [];
      }
    } catch (e) {
      console.warn('Error fetching company details in profile GET:', e.message);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...member,
        assigned_company_ids: companyIds,
        assigned_companies_details: companiesDetails
      }
    });
  } catch (err) {
    console.error('Fetch CRM Profile API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/crm/profile
 * Updates the agent's name, phone, or password
 */
export async function PUT(request) {
  try {
    const authAgent = await getAuthenticatedCrmAgent(request);
    if (!authAgent) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Valid CRM session required.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, current_password, new_password } = body;

    const db = await getDbConnection();
    const [rows] = await db.execute(
      `SELECT id, password FROM crm_team_members WHERE id = ? LIMIT 1`,
      [authAgent.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 });
    }

    const currentMember = rows[0];

    // Password change check
    let newHashedPassword = null;
    if (new_password && new_password.trim().length > 0) {
      if (new_password.trim().length < 4) {
        return NextResponse.json({ success: false, error: 'New password must be at least 4 characters long.' }, { status: 400 });
      }
      if (!current_password) {
        return NextResponse.json({ success: false, error: 'Please enter your current password to set a new password.' }, { status: 400 });
      }
      const match = await bcrypt.compare(current_password, currentMember.password);
      if (!match) {
        return NextResponse.json({ success: false, error: 'Current password does not match.' }, { status: 400 });
      }
      newHashedPassword = await bcrypt.hash(new_password.trim(), 10);
    }

    if (newHashedPassword) {
      await db.execute(
        `UPDATE crm_team_members SET name = COALESCE(?, name), phone = ?, password = ? WHERE id = ?`,
        [name ? name.trim() : null, phone ? phone.trim() : null, newHashedPassword, authAgent.id]
      );
    } else {
      await db.execute(
        `UPDATE crm_team_members SET name = COALESCE(?, name), phone = ? WHERE id = ?`,
        [name ? name.trim() : null, phone ? phone.trim() : null, authAgent.id]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.'
    });
  } catch (err) {
    console.error('Update CRM Profile API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
