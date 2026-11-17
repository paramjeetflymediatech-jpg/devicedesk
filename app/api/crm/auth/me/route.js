import { NextResponse } from 'next/server';
import { getDbConnection } from '../../../db/db.js';
import { verifySessionToken } from '../../../../utils/authTokens.js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/crm/auth/me
 * Validates active CRM agent session and returns fresh profile + accessible companies
 */
export async function GET(request) {
  try {
    const cookieToken = request.cookies.get('crm_auth_token')?.value;
    const authHeader = request.headers.get('authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = bearerToken || cookieToken;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const { valid, expired, payload } = await verifySessionToken(token);
    if (!valid || expired || !payload?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized or token expired' }, { status: 401 });
    }

    const db = await getDbConnection();

    // Fetch member
    const [rows] = await db.execute(
      `SELECT id, name, email, phone, access_type, assigned_companies, status, role, avatar, notes, last_login, created_at
       FROM crm_team_members
       WHERE id = ? LIMIT 1`,
      [payload.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'CRM Agent account not found' }, { status: 404 });
    }

    const member = rows[0];
    if (member.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Your account has been deactivated' }, { status: 403 });
    }

    let assignedCompanyIds = [];
    try {
      if (member.assigned_companies) {
        assignedCompanyIds = typeof member.assigned_companies === 'string' ? JSON.parse(member.assigned_companies) : member.assigned_companies;
      }
    } catch (e) {
      assignedCompanyIds = [];
    }

    // Fetch authorized companies
    let companiesDetails = [];
    try {
      if (member.access_type === 'all') {
        const [allComps] = await db.query(`SELECT id, company_name, website, status FROM crm_saas.companies ORDER BY company_name ASC`);
        companiesDetails = allComps || [];
      } else if (assignedCompanyIds.length > 0) {
        const placeholders = assignedCompanyIds.map(() => '?').join(',');
        const [compRows] = await db.query(
          `SELECT id, company_name, website, status FROM crm_saas.companies WHERE id IN (${placeholders}) ORDER BY company_name ASC`,
          assignedCompanyIds
        );
        companiesDetails = compRows || [];
      }
    } catch (err) {
      console.warn('Error fetching companies in /me:', err.message);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone,
        role: 'crm_agent',
        access_type: member.access_type,
        assigned_company_ids: assignedCompanyIds,
        assigned_companies_details: companiesDetails
      },
      companies: companiesDetails
    });
  } catch (err) {
    console.error('CRM Auth Me API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
