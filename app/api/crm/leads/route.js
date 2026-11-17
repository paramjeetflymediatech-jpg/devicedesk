import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import { verifySessionToken, isSuperAdminUser } from '../../../utils/authTokens.js';
import { checkAuth } from '../../utils/storageManager.js';

export const dynamic = 'force-dynamic';

/**
 * Helper to authenticate either a CRM Team Agent or Superadmin
 * Returns: { isSuperAdmin, member, allowedCompanyIds: number[] | 'all' }
 */
async function authenticateCrmAccess(request) {
  // 1. Try CRM Agent Session Token (cookie or Authorization header)
  const cookieToken = request.cookies.get('crm_auth_token')?.value;
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const token = bearerToken || cookieToken;

  if (token) {
    const { valid, expired, payload } = await verifySessionToken(token);
    if (valid && !expired && payload?.id) {
      const db = await getDbConnection();
      const [rows] = await db.execute(
        `SELECT id, name, email, access_type, assigned_companies, status, role
         FROM crm_team_members
         WHERE id = ? LIMIT 1`,
        [payload.id]
      );
      if (rows.length > 0 && rows[0].status === 'active') {
        const member = rows[0];
        let assignedIds = [];
        try {
          if (member.assigned_companies) {
            assignedIds = typeof member.assigned_companies === 'string' ? JSON.parse(member.assigned_companies) : member.assigned_companies;
            if (!Array.isArray(assignedIds)) assignedIds = [];
          }
        } catch (e) {
          assignedIds = [];
        }

        return {
          isSuperAdmin: false,
          user: member,
          accessType: member.access_type,
          allowedCompanyIds: member.access_type === 'all' ? 'all' : assignedIds.map(Number)
        };
      }
    }
  }

  // 2. Fallback: Check Superadmin auth
  try {
    const adminUser = await checkAuth(request);
    if (adminUser) {
      const dbRoleLower = (adminUser.dbRole || adminUser.role || '').toLowerCase().trim();
      if (isSuperAdminUser(adminUser) || dbRoleLower === 'admin' || dbRoleLower === 'superadmin' || dbRoleLower === 'management') {
        return {
          isSuperAdmin: true,
          user: adminUser,
          accessType: 'all',
          allowedCompanyIds: 'all'
        };
      }
    }
  } catch (err) {}

  return null;
}

/**
 * GET /api/crm/leads
 * Retrieves leads scoped strictly to the team member's assigned companies
 */
export async function GET(request) {
  try {
    const auth = await authenticateCrmAccess(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Access to CRM portal required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyFilter = searchParams.get('companyId');
    const statusFilter = searchParams.get('status') || 'all';
    const priorityFilter = searchParams.get('priority') || 'all';
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const isCalendarView = searchParams.get('view') === 'calendar' || searchParams.get('calendar') === 'true';
    const maxLimit = isCalendarView || searchParams.get('all') === 'true' ? 500 : 100;
    const defaultLimit = isCalendarView ? 500 : 20;
    const limit = Math.min(maxLimit, Math.max(1, parseInt(searchParams.get('limit') || String(defaultLimit), 10)));
    const offset = (page - 1) * limit;

    const db = await getDbConnection();

    // 1. Fetch authorized companies details
    let allowedCompanies = [];
    if (auth.allowedCompanyIds === 'all') {
      const [comps] = await db.query(
        `SELECT id, company_name, website, status FROM crm_saas.companies ORDER BY company_name ASC`
      );
      allowedCompanies = comps || [];
    } else if (Array.isArray(auth.allowedCompanyIds) && auth.allowedCompanyIds.length > 0) {
      const placeholders = auth.allowedCompanyIds.map(() => '?').join(',');
      const [comps] = await db.query(
        `SELECT id, company_name, website, status FROM crm_saas.companies WHERE id IN (${placeholders}) ORDER BY company_name ASC`,
        auth.allowedCompanyIds
      );
      allowedCompanies = comps || [];
    } else {
      // No assigned companies
      return NextResponse.json({
        success: true,
        data: [],
        companies: [],
        pagination: { total: 0, page: 1, limit, totalPages: 1 },
        stats: { total: 0, new: 0, contacted: 0, qualified: 0, in_progress: 0, converted: 0, lost: 0 }
      });
    }

    const authorizedCompIds = allowedCompanies.map((c) => Number(c.id));

    // 2. Build SQL WHERE conditions
    const whereConditions = [];
    const queryParams = [];

    // Scope to authorized companies
    if (auth.allowedCompanyIds !== 'all') {
      const placeholders = authorizedCompIds.map(() => '?').join(',');
      whereConditions.push(`l.company_id IN (${placeholders})`);
      queryParams.push(...authorizedCompIds);
    }

    // Optional specific company filter (must be within authorized companies)
    if (companyFilter && companyFilter !== 'all') {
      const targetCid = Number(companyFilter);
      if (authorizedCompIds.includes(targetCid)) {
        whereConditions.push(`l.company_id = ?`);
        queryParams.push(targetCid);
      } else {
        // Requested company is not permitted
        return NextResponse.json({ success: false, error: 'Forbidden: You do not have access to this company CRM.' }, { status: 403 });
      }
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      whereConditions.push(`LOWER(l.status) = LOWER(?)`);
      queryParams.push(statusFilter.trim());
    }

    // Priority filter
    if (priorityFilter && priorityFilter !== 'all') {
      whereConditions.push(`LOWER(l.priority) = LOWER(?)`);
      queryParams.push(priorityFilter.trim());
    }

    // Date range filter
    if (startDate) {
      whereConditions.push(`DATE(l.created_at) >= ?`);
      queryParams.push(startDate);
    }
    if (endDate) {
      whereConditions.push(`DATE(l.created_at) <= ?`);
      queryParams.push(endDate);
    }

    // Keyword Search
    if (search) {
      const wild = `%${search}%`;
      whereConditions.push(
        `(LOWER(l.first_name) LIKE ? OR LOWER(l.last_name) LIKE ? OR LOWER(CONCAT(l.first_name, ' ', l.last_name)) LIKE ? OR LOWER(l.email) LIKE ? OR l.phone LIKE ? OR LOWER(l.subject) LIKE ?)`
      );
      queryParams.push(wild, wild, wild, wild, wild, wild);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 3. Count total leads matching filter
    const countSql = `SELECT COUNT(*) as total FROM crm_saas.leads l ${whereClause}`;
    const [countResult] = await db.query(countSql, queryParams);
    const totalCount = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    // 4. Fetch Paginated Leads
    const fetchSql = `
      SELECT 
        l.*,
        CONCAT(COALESCE(l.first_name, ''), ' ', COALESCE(l.last_name, '')) as full_name,
        c.company_name,
        c.website as company_website,
        u.name as assigned_user_name,
        (SELECT COUNT(*) FROM crm_saas.lead_notes n WHERE n.lead_id = l.id) as notes_count
      FROM crm_saas.leads l
      LEFT JOIN crm_saas.companies c ON l.company_id = c.id
      LEFT JOIN crm_saas.users u ON l.assigned_to = u.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [leads] = await db.query(fetchSql, [...queryParams, limit, offset]);

    // 5. Aggregate stats across all authorized leads
    const statsWhere = auth.allowedCompanyIds !== 'all' 
      ? `WHERE company_id IN (${authorizedCompIds.map(() => '?').join(',')})` 
      : '';
    const statsParams = auth.allowedCompanyIds !== 'all' ? authorizedCompIds : [];

    const statsSql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN LOWER(status) = 'new' THEN 1 ELSE 0 END) as \`new\`,
        SUM(CASE WHEN LOWER(status) = 'contacted' THEN 1 ELSE 0 END) as contacted,
        SUM(CASE WHEN LOWER(status) = 'qualified' THEN 1 ELSE 0 END) as qualified,
        SUM(CASE WHEN LOWER(status) = 'in progress' OR LOWER(status) = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN LOWER(status) = 'converted' THEN 1 ELSE 0 END) as converted,
        SUM(CASE WHEN LOWER(status) = 'lost' THEN 1 ELSE 0 END) as lost
      FROM crm_saas.leads
      ${statsWhere}
    `;
    const [statsRows] = await db.query(statsSql, statsParams);
    const stats = statsRows[0] || { total: 0, new: 0, contacted: 0, qualified: 0, in_progress: 0, converted: 0, lost: 0 };

    return NextResponse.json({
      success: true,
      data: leads,
      companies: allowedCompanies,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages
      },
      stats
    });
  } catch (err) {
    console.error('CRM Leads GET API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/crm/leads
 * Handles:
 *  - action === 'add_lead'
 *  - action === 'add_note'
 *  - action === 'schedule_follow_up'
 *  - action === 'get_notes'
 */
export async function POST(request) {
  try {
    const auth = await authenticateCrmAccess(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Access to CRM portal required.' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;
    const db = await getDbConnection();

    // Helper to check if a company ID is within the agent's scope
    const isCompanyPermitted = (companyId) => {
      if (auth.allowedCompanyIds === 'all') return true;
      return Array.isArray(auth.allowedCompanyIds) && auth.allowedCompanyIds.map(Number).includes(Number(companyId));
    };

    // Helper to check if a lead ID belongs to an authorized company
    const verifyLeadPermission = async (leadId) => {
      const [leadRows] = await db.execute(`SELECT id, company_id FROM crm_saas.leads WHERE id = ? LIMIT 1`, [leadId]);
      if (leadRows.length === 0) return null;
      if (!isCompanyPermitted(leadRows[0].company_id)) return false;
      return leadRows[0];
    };

    // -------------------------------------------------------------
    // ACTION: ADD LEAD
    // -------------------------------------------------------------
    if (action === 'add_lead') {
      const { company_id, first_name, last_name, email, phone, subject, message, status, priority, lead_score } = body;

      if (!company_id) {
        return NextResponse.json({ success: false, error: 'Target company ID is required.' }, { status: 400 });
      }
      if (!isCompanyPermitted(company_id)) {
        return NextResponse.json({ success: false, error: 'Forbidden: You cannot add leads for this company.' }, { status: 403 });
      }
      if (!first_name && !phone && !email) {
        return NextResponse.json({ success: false, error: 'Please provide at least a name, phone, or email.' }, { status: 400 });
      }

      const [insertResult] = await db.execute(
        `INSERT INTO crm_saas.leads (company_id, first_name, last_name, email, phone, subject, message, status, priority, lead_score, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          company_id,
          first_name ? first_name.trim() : null,
          last_name ? last_name.trim() : null,
          email ? email.trim() : null,
          phone ? phone.trim() : null,
          subject ? subject.trim() : 'Manual Entry',
          message ? message.trim() : null,
          status || 'New',
          priority || 'Medium',
          lead_score || 50,
          `CRM Agent: ${auth.user.name}`
        ]
      );

      return NextResponse.json({
        success: true,
        message: 'Lead created successfully.',
        id: insertResult.insertId
      });
    }

    // -------------------------------------------------------------
    // ACTION: GET NOTES FOR A LEAD
    // -------------------------------------------------------------
    if (action === 'get_notes') {
      const { lead_id } = body;
      const verified = await verifyLeadPermission(lead_id);
      if (verified === null) return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
      if (verified === false) return NextResponse.json({ success: false, error: 'Forbidden: Unauthorized company lead.' }, { status: 403 });

      const [notes] = await db.query(
        `SELECT n.*, u.name as user_name, u.role as user_role
         FROM crm_saas.lead_notes n
         LEFT JOIN crm_saas.users u ON n.user_id = u.id
         WHERE n.lead_id = ?
         ORDER BY n.created_at DESC`,
        [lead_id]
      );

      return NextResponse.json({ success: true, notes: notes || [] });
    }

    // -------------------------------------------------------------
    // ACTION: ADD NOTE
    // -------------------------------------------------------------
    if (action === 'add_note') {
      const { lead_id, note } = body;
      if (!lead_id || !note || !note.trim()) {
        return NextResponse.json({ success: false, error: 'Lead ID and note text are required.' }, { status: 400 });
      }

      const verified = await verifyLeadPermission(lead_id);
      if (verified === null) return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
      if (verified === false) return NextResponse.json({ success: false, error: 'Forbidden: Unauthorized company lead.' }, { status: 403 });

      // We associate note with system admin id in crm_saas.users or NULL
      const [adm] = await db.query(`SELECT id FROM crm_saas.users WHERE role = 'super_admin' LIMIT 1`);
      const userId = adm[0]?.id || 1;

      const formattedNote = `[${auth.user.name} (CRM Agent)] ${note.trim()}`;

      await db.execute(
        `INSERT INTO crm_saas.lead_notes (lead_id, user_id, note) VALUES (?, ?, ?)`,
        [lead_id, userId, formattedNote]
      );

      await db.execute(
        `INSERT INTO crm_saas.lead_activities (lead_id, user_id, action, details) VALUES (?, ?, ?, ?)`,
        [lead_id, userId, 'Note Added', `CRM Agent ${auth.user.name} added an internal activity note.`]
      );

      return NextResponse.json({ success: true, message: 'Note posted successfully.' });
    }

    // -------------------------------------------------------------
    // ACTION: SCHEDULE FOLLOW UP
    // -------------------------------------------------------------
    if (action === 'schedule_follow_up') {
      const { lead_id, follow_up_date, note, status } = body;
      if (!lead_id || !follow_up_date) {
        return NextResponse.json({ success: false, error: 'Lead ID and follow-up date are required.' }, { status: 400 });
      }

      const verified = await verifyLeadPermission(lead_id);
      if (verified === null) return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
      if (verified === false) return NextResponse.json({ success: false, error: 'Forbidden: Unauthorized company lead.' }, { status: 403 });

      if (status) {
        await db.execute(
          `UPDATE crm_saas.leads SET follow_up_date = ?, status = ?, updated_at = NOW() WHERE id = ?`,
          [follow_up_date, status, lead_id]
        );
      } else {
        await db.execute(
          `UPDATE crm_saas.leads SET follow_up_date = ?, updated_at = NOW() WHERE id = ?`,
          [follow_up_date, lead_id]
        );
      }

      const [adm] = await db.query(`SELECT id FROM crm_saas.users WHERE role = 'super_admin' LIMIT 1`);
      const userId = adm[0]?.id || 1;

      const followNote = `Follow-up scheduled for: ${new Date(follow_up_date).toLocaleString()}.${note ? ` Note: ${note.trim()}` : ''}`;
      await db.execute(
        `INSERT INTO crm_saas.lead_notes (lead_id, user_id, note) VALUES (?, ?, ?)`,
        [lead_id, userId, `[${auth.user.name}] ${followNote}`]
      );

      return NextResponse.json({ success: true, message: 'Follow-up scheduled successfully.' });
    }

    // -------------------------------------------------------------
    // ACTION: CLEAR / COMPLETE FOLLOW UP
    // -------------------------------------------------------------
    if (action === 'clear_follow_up') {
      const { lead_id, note } = body;
      if (!lead_id) {
        return NextResponse.json({ success: false, error: 'Lead ID is required.' }, { status: 400 });
      }

      const verified = await verifyLeadPermission(lead_id);
      if (verified === null) return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
      if (verified === false) return NextResponse.json({ success: false, error: 'Forbidden: Unauthorized company lead.' }, { status: 403 });

      await db.execute(
        `UPDATE crm_saas.leads SET follow_up_date = NULL, updated_at = NOW() WHERE id = ?`,
        [lead_id]
      );

      const [adm] = await db.query(`SELECT id FROM crm_saas.users WHERE role = 'super_admin' LIMIT 1`);
      const userId = adm[0]?.id || 1;

      const followNote = `Follow-up marked completed / cleared.${note ? ` Note: ${note.trim()}` : ''}`;
      await db.execute(
        `INSERT INTO crm_saas.lead_notes (lead_id, user_id, note) VALUES (?, ?, ?)`,
        [lead_id, userId, `[${auth.user.name}] ${followNote}`]
      );

      return NextResponse.json({ success: true, message: 'Follow-up marked completed.' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action specified.' }, { status: 400 });
  } catch (err) {
    console.error('CRM Leads POST API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/crm/leads
 * Updates lead status, priority, details
 */
export async function PUT(request) {
  try {
    const auth = await authenticateCrmAccess(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Access to CRM portal required.' }, { status: 401 });
    }

    const body = await request.json();
    const { id, first_name, last_name, email, phone, subject, message, status, priority, lead_score } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Lead ID is required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Verify lead belongs to an authorized company
    const [existing] = await db.execute(`SELECT id, company_id FROM crm_saas.leads WHERE id = ? LIMIT 1`, [id]);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
    }

    const companyId = existing[0].company_id;
    if (auth.allowedCompanyIds !== 'all' && (!Array.isArray(auth.allowedCompanyIds) || !auth.allowedCompanyIds.map(Number).includes(Number(companyId)))) {
      return NextResponse.json({ success: false, error: 'Forbidden: You cannot modify leads from this company.' }, { status: 403 });
    }

    await db.execute(
      `UPDATE crm_saas.leads
       SET first_name = COALESCE(?, first_name),
           last_name = COALESCE(?, last_name),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           subject = COALESCE(?, subject),
           message = COALESCE(?, message),
           status = COALESCE(?, status),
           priority = COALESCE(?, priority),
           lead_score = COALESCE(?, lead_score),
           updated_at = NOW()
       WHERE id = ?`,
      [
        first_name ? first_name.trim() : null,
        last_name ? last_name.trim() : null,
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        subject ? subject.trim() : null,
        message ? message.trim() : null,
        status || null,
        priority || null,
        lead_score || null,
        id
      ]
    );

    return NextResponse.json({ success: true, message: 'Lead updated successfully.' });
  } catch (err) {
    console.error('CRM Leads PUT API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/leads
 * Deletes a lead
 */
export async function DELETE(request) {
  try {
    const auth = await authenticateCrmAccess(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Access to CRM portal required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Lead ID is required.' }, { status: 400 });
    }

    const db = await getDbConnection();
    const [existing] = await db.execute(`SELECT id, company_id FROM crm_saas.leads WHERE id = ? LIMIT 1`, [id]);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
    }

    const companyId = existing[0].company_id;
    if (auth.allowedCompanyIds !== 'all' && (!Array.isArray(auth.allowedCompanyIds) || !auth.allowedCompanyIds.map(Number).includes(Number(companyId)))) {
      return NextResponse.json({ success: false, error: 'Forbidden: You cannot delete leads from this company.' }, { status: 403 });
    }

    await db.execute(`DELETE FROM crm_saas.lead_notes WHERE lead_id = ?`, [id]).catch(() => null);
    await db.execute(`DELETE FROM crm_saas.lead_activities WHERE lead_id = ?`, [id]).catch(() => null);
    await db.execute(`DELETE FROM crm_saas.leads WHERE id = ?`, [id]);

    return NextResponse.json({ success: true, message: 'Lead deleted successfully.' });
  } catch (err) {
    console.error('CRM Leads DELETE API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
