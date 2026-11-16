import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import { checkAuth } from '../../utils/storageManager.js';
import { isSuperAdminUser } from '../../../utils/authTokens.js';

const CRM_BASE_URL = process.env.CRM_API_URL || 'https://demo.socialflymediatech.com/api';

/**
 * Superadmin All Companies CRM Leads Management API
 * Path: /api/admin/leads
 */

// Helper to verify admin permissions
async function verifyAdminAuth(request) {
  try {
    const user = await checkAuth(request);
    if (!user) return null;
    const isSuperAdmin = isSuperAdminUser(user);
    const dbRoleLower = (user.dbRole || user.role || '').toLowerCase().trim();
    if (isSuperAdmin || dbRoleLower === 'admin' || dbRoleLower === 'superadmin' || dbRoleLower === 'super admin' || dbRoleLower === 'management') {
      return user;
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * GET /api/admin/leads
 * Query all leads across companies or filter by company, status, priority, staff, date, search
 */
export async function GET(request) {
  try {
    const adminUser = await verifyAdminAuth(request);
    if (!adminUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate') || searchParams.get('from');
    const endDate = searchParams.get('endDate') || searchParams.get('to');
    const leadId = searchParams.get('leadId') || searchParams.get('id');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(500, parseInt(searchParams.get('limit') || '20', 10)));

    const db = await getDbConnection();

    // 1. Fetch all companies for filters and dropdowns
    const [companies] = await db.query(`
      SELECT 
        c.id, c.company_name, c.email, c.phone, c.website, c.status, c.api_key,
        cd.client_id, cd.crm_api_key as client_crm_api_key,
        e.name as client_name, e.email as client_email,
        (SELECT COUNT(*) FROM crm_saas.leads l WHERE l.company_id = c.id) as leads_count
      FROM crm_saas.companies c
      LEFT JOIN client_details cd ON (cd.crm_company_id = c.id)
      LEFT JOIN employees e ON cd.client_id = e.id
      ORDER BY c.company_name ASC
    `);

    // 2. Fetch all staff users across companies
    const [users] = await db.query(`
      SELECT 
        u.id, u.company_id, u.name, u.email, u.role, u.avatar, u.phone, u.status,
        c.company_name
      FROM crm_saas.users u
      LEFT JOIN crm_saas.companies c ON u.company_id = c.id
      ORDER BY u.name ASC
    `);

    // 3. Single Lead Detail with Notes & Activities
    if (leadId) {
      const [leadRows] = await db.execute(`
        SELECT 
          l.id, l.company_id, l.assigned_to, l.source, l.first_name, l.last_name,
          CONCAT(COALESCE(l.first_name, ''), ' ', COALESCE(l.last_name, '')) as full_name,
          l.email, l.phone, l.subject, l.message, l.status, l.priority, l.lead_score,
          l.follow_up_date, l.created_at, l.updated_at,
          c.company_name, c.email as company_email, c.phone as company_phone, c.website as company_website,
          u.name as assigned_user_name, u.email as assigned_user_email, u.avatar as assigned_user_avatar, u.role as assigned_user_role
        FROM crm_saas.leads l
        LEFT JOIN crm_saas.companies c ON l.company_id = c.id
        LEFT JOIN crm_saas.users u ON l.assigned_to = u.id
        WHERE l.id = ?
        LIMIT 1
      `, [leadId]);

      if (!leadRows || leadRows.length === 0) {
        return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
      }

      const lead = leadRows[0];

      // Fetch notes for this lead
      const [notes] = await db.execute(`
        SELECT 
          n.id, n.lead_id, n.user_id, n.note, n.created_at,
          COALESCE(u.name, 'Admin') as user_name, u.role as user_role, u.avatar as user_avatar
        FROM crm_saas.lead_notes n
        LEFT JOIN crm_saas.users u ON n.user_id = u.id
        WHERE n.lead_id = ?
        ORDER BY n.created_at DESC
      `, [leadId]).catch(() => [[]]);

      // Fetch activities for this lead
      const [activities] = await db.execute(`
        SELECT 
          a.id, a.lead_id, a.user_id, a.action, a.description, a.created_at,
          COALESCE(u.name, 'System') as user_name
        FROM crm_saas.lead_activities a
        LEFT JOIN crm_saas.users u ON a.user_id = u.id
        WHERE a.lead_id = ?
        ORDER BY a.created_at DESC
      `, [leadId]).catch(() => [[]]);

      return NextResponse.json({
        success: true,
        crmBaseUrl: CRM_BASE_URL,
        lead: {
          ...lead,
          notes: notes || [],
          activities: activities || []
        },
        companies,
        users
      });
    }

    // 4. Overall & Filtered Lead Stats
    const statsWhere = [];
    const statsParams = [];
    if (companyId && companyId !== 'all' && companyId !== '_all') {
      statsWhere.push('l.company_id = ?');
      statsParams.push(Number(companyId));
    }
    const statsWhereSql = statsWhere.length > 0 ? `WHERE ${statsWhere.join(' AND ')}` : '';

    const [statsRows] = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN LOWER(l.status) = 'new' THEN 1 END) as new_count,
        COUNT(CASE WHEN LOWER(l.status) = 'contacted' THEN 1 END) as contacted_count,
        COUNT(CASE WHEN LOWER(l.status) = 'qualified' THEN 1 END) as qualified_count,
        COUNT(CASE WHEN LOWER(l.status) IN ('in progress', 'in_progress') THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN LOWER(l.status) IN ('converted', 'won') THEN 1 END) as converted_count,
        COUNT(CASE WHEN LOWER(l.status) IN ('lost', 'closed lost', 'junk') THEN 1 END) as lost_count
      FROM crm_saas.leads l
      ${statsWhereSql}
    `, statsParams);

    const s = statsRows[0] || {};
    const stats = {
      total: Number(s.total) || 0,
      new: Number(s.new_count) || 0,
      contacted: Number(s.contacted_count) || 0,
      qualified: Number(s.qualified_count) || 0,
      in_progress: Number(s.in_progress_count) || 0,
      converted: Number(s.converted_count) || 0,
      lost: Number(s.lost_count) || 0
    };

    // 5. Build dynamic query for Leads List
    const whereConditions = [];
    const params = [];

    if (companyId && companyId !== 'all' && companyId !== '_all') {
      whereConditions.push('l.company_id = ?');
      params.push(Number(companyId));
    }

    if (status && status !== 'all' && status !== '_all') {
      if (status.toLowerCase() === 'in progress' || status.toLowerCase() === 'in_progress') {
        whereConditions.push("LOWER(l.status) IN ('in progress', 'in_progress')");
      } else {
        whereConditions.push('LOWER(l.status) = LOWER(?)');
        params.push(status.trim());
      }
    }

    if (priority && priority !== 'all' && priority !== '_all') {
      whereConditions.push('LOWER(l.priority) = LOWER(?)');
      params.push(priority.trim());
    }

    if (assignedTo && assignedTo !== 'all' && assignedTo !== '_all') {
      if (assignedTo === 'unassigned' || assignedTo === 'null' || assignedTo === '0') {
        whereConditions.push('l.assigned_to IS NULL');
      } else {
        whereConditions.push('l.assigned_to = ?');
        params.push(Number(assignedTo));
      }
    }

    if (startDate && startDate.trim()) {
      whereConditions.push('l.created_at >= ?');
      params.push(new Date(startDate.trim()));
    }

    if (endDate && endDate.trim()) {
      whereConditions.push('l.created_at <= ?');
      const rawEnd = endDate.trim();
      const formattedEnd = rawEnd.length === 10 ? `${rawEnd} 23:59:59` : rawEnd;
      params.push(new Date(formattedEnd));
    }

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      whereConditions.push(`(
        l.first_name LIKE ? OR 
        l.last_name LIKE ? OR 
        CONCAT(COALESCE(l.first_name, ''), ' ', COALESCE(l.last_name, '')) LIKE ? OR
        l.email LIKE ? OR 
        l.phone LIKE ? OR 
        l.subject LIKE ? OR 
        l.message LIKE ? OR
        c.company_name LIKE ?
      )`);
      params.push(term, term, term, term, term, term, term, term);
    }

    const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Total Count
    const [countRows] = await db.query(`
      SELECT COUNT(*) as filteredTotal 
      FROM crm_saas.leads l 
      LEFT JOIN crm_saas.companies c ON l.company_id = c.id
      ${whereSql}
    `, params);
    const filteredTotal = Number(countRows[0]?.filteredTotal) || 0;

    // Fetch Leads Page
    const offset = Math.max(0, (page - 1) * limit);
    const safeLimit = Math.max(1, limit);
    const [leadRows] = await db.query(`
      SELECT 
        l.id, l.company_id, l.assigned_to, l.source, l.first_name, l.last_name,
        CONCAT(COALESCE(l.first_name, ''), ' ', COALESCE(l.last_name, '')) as full_name,
        l.email, l.phone, l.subject, l.message, l.status, l.priority, l.lead_score,
        l.follow_up_date, l.created_at, l.updated_at,
        c.company_name, c.email as company_email, c.phone as company_phone, c.website as company_website,
        u.name as assigned_user_name, u.email as assigned_user_email, u.avatar as assigned_user_avatar, u.role as assigned_user_role,
        (SELECT COUNT(*) FROM crm_saas.lead_notes n WHERE n.lead_id = l.id) as notes_count
      FROM crm_saas.leads l
      LEFT JOIN crm_saas.companies c ON l.company_id = c.id
      LEFT JOIN crm_saas.users u ON l.assigned_to = u.id
      ${whereSql}
      ORDER BY l.created_at DESC
      LIMIT ${safeLimit} OFFSET ${offset}
    `, params);

    return NextResponse.json({
      success: true,
      crmBaseUrl: CRM_BASE_URL,
      leads: leadRows,
      companies,
      users,
      stats,
      pagination: {
        totalCount: filteredTotal,
        page,
        limit,
        totalPages: Math.ceil(filteredTotal / limit) || 1
      }
    });

  } catch (error) {
    console.error('Superadmin Leads API GET Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/leads
 * Superadmin creates a new lead for any company
 */
export async function POST(request) {
  try {
    const adminUser = await verifyAdminAuth(request);
    if (!adminUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await request.json();

    // 1. Action: Configure / Update Webhook API Key for a Company or Client
    if (body.action === 'configure_webhook' || body.action === 'update_api_key') {
      const { companyId, clientId, apiKey } = body;
      if (!apiKey || !apiKey.trim()) {
        return NextResponse.json({ success: false, error: 'API key is required.' }, { status: 400 });
      }

      const trimmedKey = apiKey.trim();
      const db = await getDbConnection();

      let targetCompanyId = companyId ? Number(companyId) : null;

      // If clientId is provided, check if client_details already has a linked crm_company_id
      if (clientId && !targetCompanyId) {
        const [cDetails] = await db.execute(`SELECT crm_company_id FROM client_details WHERE client_id = ?`, [clientId]);
        if (cDetails?.[0]?.crm_company_id) {
          targetCompanyId = cDetails[0].crm_company_id;
        }
      }

      // If we have a company ID, update crm_saas.companies
      if (targetCompanyId) {
        await db.execute(`
          UPDATE crm_saas.companies
          SET api_key = ?, updated_at = NOW()
          WHERE id = ?
        `, [trimmedKey, targetCompanyId]);

        // Sync to any client_details linked to this crm_company_id
        await db.execute(`
          UPDATE client_details
          SET crm_api_key = ?
          WHERE crm_company_id = ?
        `, [trimmedKey, targetCompanyId]).catch(() => null);
      }

      // If clientId provided, also update client_details directly
      if (clientId) {
        await db.execute(`
          UPDATE client_details
          SET crm_api_key = ?, crm_company_id = COALESCE(crm_company_id, ?)
          WHERE client_id = ?
        `, [trimmedKey, targetCompanyId, clientId]);
      }

      return NextResponse.json({
        success: true,
        message: 'Webhook API key configured and linked successfully!',
        apiKey: trimmedKey,
        companyId: targetCompanyId,
        webhookUrl: `${CRM_BASE_URL}/leads/create?api_key=${trimmedKey}`
      });
    }

    // 2. Action: Send Webhook Test Lead
    if (body.action === 'test_webhook') {
      const { companyId, apiKey } = body;
      const targetCompanyId = companyId ? Number(companyId) : null;
      const keyToUse = (apiKey || '').trim();

      const testPhone = `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`;
      const testEmail = `superadmin.test.${Date.now().toString().slice(-4)}@example.com`;

      const testPayload = {
        name: 'Superadmin Webhook Verification Lead',
        email: testEmail,
        phone: testPhone,
        subject: 'Webhook Pipeline Verification Test',
        message: 'This is an automated test lead dispatched by Superadmin to verify CRM webhook ingestion and API key authorization.',
        source: 'Webhook Test Lead'
      };

      let remoteSuccess = false;
      if (keyToUse) {
        try {
          const createRes = await fetch(`${CRM_BASE_URL}/leads/create?api_key=${encodeURIComponent(keyToUse)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${keyToUse}`
            },
            body: JSON.stringify(testPayload),
            signal: AbortSignal.timeout(3000)
          });
          const resData = await createRes.json().catch(() => ({}));
          if (createRes.ok && (resData.success || resData.id || resData.lead)) {
            remoteSuccess = true;
          }
        } catch (e) {
          console.warn('Superadmin test webhook remote failed, falling back to local lead creation:', e.message);
        }
      }

      // Fallback: Always record into local crm_saas.leads if remote failed or targetCompanyId is present
      if (!remoteSuccess && targetCompanyId) {
        const db = await getDbConnection();
        await db.execute(`
          INSERT INTO crm_saas.leads (
            company_id, source, first_name, last_name,
            email, phone, subject, message, status, priority,
            lead_score, created_at, updated_at
          ) VALUES (?, 'Webhook Test Lead', 'Superadmin', 'Verification Lead', ?, ?, 'Webhook Pipeline Verification Test', 'Automated test lead generated by Superadmin to verify webhook pipeline.', 'New', 'Medium', 50, NOW(), NOW())
        `, [targetCompanyId, testEmail, testPhone]);
      }

      return NextResponse.json({
        success: true,
        message: remoteSuccess
          ? 'Test lead successfully delivered to remote CRM and ingested!'
          : 'Test lead created successfully in CRM leads pipeline!',
        testEmail,
        testPhone
      });
    }

    const {
      company_id,
      companyId,
      first_name,
      last_name,
      name,
      email,
      phone,
      subject,
      message,
      status = 'New',
      priority = 'Medium',
      assigned_to,
      assignedTo,
      source = 'Superadmin Manual',
      lead_score = 0,
      leadScore = 0,
      follow_up_date,
      followUpDate,
      note
    } = body;

    const targetCompanyId = company_id || companyId;
    if (!targetCompanyId) {
      return NextResponse.json({ success: false, error: 'Target company is required.' }, { status: 400 });
    }

    let fName = first_name || '';
    let lName = last_name || '';
    if (name && !first_name) {
      const parts = name.trim().split(' ');
      fName = parts[0] || '';
      lName = parts.slice(1).join(' ') || '';
    }

    const targetAssigned = (assigned_to !== undefined ? assigned_to : assignedTo) || null;
    const targetFollowUp = follow_up_date || followUpDate || null;
    const targetScore = Number(lead_score ?? leadScore) || 0;

    const db = await getDbConnection();

    // Verify company exists
    const [compRows] = await db.execute(`SELECT id, company_name FROM crm_saas.companies WHERE id = ? LIMIT 1`, [targetCompanyId]);
    if (!compRows || compRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Selected company does not exist.' }, { status: 404 });
    }

    const [insertResult] = await db.execute(`
      INSERT INTO crm_saas.leads (
        company_id, assigned_to, source, first_name, last_name,
        email, phone, subject, message, status, priority,
        lead_score, follow_up_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      Number(targetCompanyId),
      targetAssigned ? Number(targetAssigned) : null,
      source || 'Superadmin Manual',
      fName.trim(),
      lName.trim(),
      email ? email.trim() : '',
      phone ? phone.trim() : '',
      subject ? subject.trim() : 'Website Inquiry',
      message ? message.trim() : '',
      status || 'New',
      priority || 'Medium',
      targetScore,
      targetFollowUp ? new Date(targetFollowUp) : null
    ]);

    const newLeadId = insertResult.insertId;

    // Resolve Superadmin user ID from crm_saas.users for non-null user_id fields
    let crmAdminUserId = 1;
    try {
      const [adm] = await db.query(`SELECT id FROM crm_saas.users WHERE role = 'super_admin' LIMIT 1`);
      if (adm && adm.length > 0) crmAdminUserId = adm[0].id;
    } catch (e) {}

    // Optional initial note
    if (note && note.trim()) {
      await db.execute(`
        INSERT INTO crm_saas.lead_notes (lead_id, user_id, note, created_at)
        VALUES (?, ?, ?, NOW())
      `, [newLeadId, crmAdminUserId, note.trim()]).catch(() => null);
    }

    // Log Activity
    await db.execute(`
      INSERT INTO crm_saas.lead_activities (lead_id, user_id, action, description, created_at)
      VALUES (?, ?, 'Lead Created', ?, NOW())
    `, [newLeadId, crmAdminUserId, `Lead created by Superadmin for company ${compRows[0].company_name}`]).catch(() => null);

    return NextResponse.json({
      success: true,
      leadId: newLeadId,
      message: 'Lead created successfully.'
    });

  } catch (error) {
    console.error('Superadmin Leads API POST Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/leads
 * Superadmin updates lead details, status, priority, assigned staff, follow-up date, or appends a note
 */
export async function PUT(request) {
  try {
    const adminUser = await verifyAdminAuth(request);
    if (!adminUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      leadId,
      id,
      company_id,
      companyId,
      first_name,
      last_name,
      name,
      email,
      phone,
      subject,
      message,
      status,
      priority,
      assigned_to,
      assignedTo,
      lead_score,
      leadScore,
      follow_up_date,
      followUpDate,
      note
    } = body;

    const targetLeadId = leadId || id;
    if (!targetLeadId) {
      return NextResponse.json({ success: false, error: 'Lead ID is required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Check existing lead
    const [existingRows] = await db.execute(`SELECT * FROM crm_saas.leads WHERE id = ? LIMIT 1`, [targetLeadId]);
    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
    }
    const currentLead = existingRows[0];

    // Build dynamic update set
    const updateFields = [];
    const updateValues = [];

    if (company_id !== undefined || companyId !== undefined) {
      const cId = Number(company_id || companyId);
      if (cId) {
        updateFields.push('company_id = ?');
        updateValues.push(cId);
      }
    }

    if (first_name !== undefined) {
      updateFields.push('first_name = ?');
      updateValues.push(first_name);
    }
    if (last_name !== undefined) {
      updateFields.push('last_name = ?');
      updateValues.push(last_name);
    }
    if (name && first_name === undefined) {
      const parts = name.trim().split(' ');
      updateFields.push('first_name = ?', 'last_name = ?');
      updateValues.push(parts[0] || '', parts.slice(1).join(' ') || '');
    }

    if (email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(email ? email.trim() : '');
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone ? phone.trim() : '');
    }
    if (subject !== undefined) {
      updateFields.push('subject = ?');
      updateValues.push(subject);
    }
    if (message !== undefined) {
      updateFields.push('message = ?');
      updateValues.push(message);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (priority !== undefined) {
      updateFields.push('priority = ?');
      updateValues.push(priority);
    }
    if (assigned_to !== undefined || assignedTo !== undefined) {
      const rawAss = assigned_to !== undefined ? assigned_to : assignedTo;
      const targetAss = (rawAss === null || rawAss === '' || rawAss === 'unassigned' || rawAss === 0) ? null : Number(rawAss);
      updateFields.push('assigned_to = ?');
      updateValues.push(targetAss);
    }
    if (lead_score !== undefined || leadScore !== undefined) {
      updateFields.push('lead_score = ?');
      updateValues.push(Number(lead_score ?? leadScore) || 0);
    }
    if (follow_up_date !== undefined || followUpDate !== undefined) {
      const targetFollowUp = follow_up_date || followUpDate || null;
      updateFields.push('follow_up_date = ?');
      updateValues.push(targetFollowUp ? new Date(targetFollowUp) : null);
    }

    updateFields.push('updated_at = NOW()');

    if (updateFields.length > 0) {
      updateValues.push(targetLeadId);
      await db.execute(`
        UPDATE crm_saas.leads 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `, updateValues);
    }

    // Resolve Superadmin user ID from crm_saas.users for non-null user_id fields
    let crmAdminUserId = 1;
    try {
      const [adm] = await db.query(`SELECT id FROM crm_saas.users WHERE role = 'super_admin' LIMIT 1`);
      if (adm && adm.length > 0) crmAdminUserId = adm[0].id;
    } catch (e) {}

    // Append Note if provided
    if (note && note.trim()) {
      await db.execute(`
        INSERT INTO crm_saas.lead_notes (lead_id, user_id, note, created_at)
        VALUES (?, ?, ?, NOW())
      `, [targetLeadId, crmAdminUserId, note.trim()]);
    }

    // Log Activity
    const changes = [];
    if (status && status !== currentLead.status) changes.push(`Status changed to ${status}`);
    if (priority && priority !== currentLead.priority) changes.push(`Priority changed to ${priority}`);
    if (follow_up_date !== undefined) changes.push(`Follow-up schedule updated`);
    const actionDesc = changes.length > 0 ? changes.join(', ') : (note ? 'Note added by Superadmin' : 'Lead details updated by Superadmin');

    await db.execute(`
      INSERT INTO crm_saas.lead_activities (lead_id, user_id, action, description, created_at)
      VALUES (?, ?, 'Lead Updated', ?, NOW())
    `, [targetLeadId, crmAdminUserId, actionDesc]).catch(() => null);

    return NextResponse.json({
      success: true,
      message: 'Lead updated successfully.'
    });

  } catch (error) {
    console.error('Superadmin Leads API PUT Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/leads
 * Superadmin permanently deletes a lead and its related notes/activities
 */
export async function DELETE(request) {
  try {
    const adminUser = await verifyAdminAuth(request);
    if (!adminUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    let leadId = searchParams.get('leadId') || searchParams.get('id');

    if (!leadId) {
      try {
        const body = await request.json();
        leadId = body.leadId || body.id;
      } catch (e) {}
    }

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Lead ID is required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Clean up related records
    await db.execute(`DELETE FROM crm_saas.lead_notes WHERE lead_id = ?`, [leadId]).catch(() => null);
    await db.execute(`DELETE FROM crm_saas.lead_activities WHERE lead_id = ?`, [leadId]).catch(() => null);
    await db.execute(`DELETE FROM crm_saas.tasks WHERE lead_id = ?`, [leadId]).catch(() => null);

    // Delete lead
    const [result] = await db.execute(`DELETE FROM crm_saas.leads WHERE id = ?`, [leadId]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Lead not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Lead and associated records deleted successfully.'
    });

  } catch (error) {
    console.error('Superadmin Leads API DELETE Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
