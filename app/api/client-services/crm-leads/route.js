import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

const CRM_BASE_URL = process.env.CRM_API_URL || 'https://demo.socialflymediatech.com/api';
const CRM_SERVICE_EMAIL = process.env.CRM_SERVICE_EMAIL || 'super@crm.com';
const CRM_SERVICE_PASSWORD = process.env.CRM_SERVICE_PASSWORD || 'super123';

// Cache for authenticated CRM JWT token
let cachedCrmToken = null;
let tokenExpiresAt = 0;

async function getCrmToken() {
  if (cachedCrmToken && Date.now() < tokenExpiresAt) {
    return cachedCrmToken;
  }
  try {
    const res = await fetch(`${CRM_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: CRM_SERVICE_EMAIL,
        password: CRM_SERVICE_PASSWORD
      })
    });
    const data = await res.json();
    if (data.token) {
      cachedCrmToken = data.token;
      tokenExpiresAt = Date.now() + 45 * 60 * 1000; // cache for 45 mins
      return cachedCrmToken;
    }
  } catch (err) {
    console.warn('Failed to obtain token from CRM API:', err.message);
  }
  return null;
}

// Helper to resolve the correct CRM tenant Company ID and API Key for a client
async function resolveCompanyForClient(token, client, db) {
  let targetCompanyId = client.crm_company_id ? Number(client.crm_company_id) : null;
  let crmApiKey = client.crm_api_key || '';
  let companyName = client.company_name || client.client_name || '';

  if (!token) {
    return { targetCompanyId, crmApiKey, companyName };
  }

  try {
    const compRes = await fetch(`${CRM_BASE_URL}/admin/companies`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (compRes.ok) {
      const { companies } = await compRes.json();
      if (Array.isArray(companies) && companies.length > 0) {
        let matched = null;

        // 1. Try matching by current crmApiKey
        if (crmApiKey) {
          matched = companies.find(c => c.api_key === crmApiKey);
        }

        // 2. Try matching by company ID
        if (!matched && targetCompanyId) {
          matched = companies.find(c => c.id === targetCompanyId);
        }

        // 3. Try matching by company name (normalized)
        if (!matched && companyName) {
          const norm = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
          matched = companies.find(c => c.company_name?.toLowerCase().replace(/[^a-z0-9]/g, '') === norm);
          if (!matched) {
            matched = companies.find(c => {
              const cNorm = c.company_name?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
              return cNorm.includes(norm) || norm.includes(cNorm);
            });
          }
        }

        if (matched) {
          targetCompanyId = matched.id;
          crmApiKey = matched.api_key;
          companyName = matched.company_name || companyName;

          // Sync back to client_details in system_tracking
          if (client.crm_company_id !== matched.id || client.crm_api_key !== matched.api_key) {
            await db.execute(`
              UPDATE client_details 
              SET crm_company_id = ?, crm_api_key = ? 
              WHERE client_id = ?
            `, [matched.id, matched.api_key, client.client_id || client.id]).catch(() => null);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to resolve company from CRM admin API:', err.message);
  }

  return { targetCompanyId, crmApiKey, companyName };
}

/**
 * GET /api/client-services/crm-leads
 * Fetches CRM leads for the given clientId from the live CRM multi-tenant API:
 * https://demo.socialflymediatech.com/api/
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const leadId = searchParams.get('leadId') || searchParams.get('id');
    const action = searchParams.get('action');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const assignedTo = searchParams.get('assignedTo') || searchParams.get('assigned_to');
    const startDate = searchParams.get('startDate') || searchParams.get('from');
    const endDate = searchParams.get('endDate') || searchParams.get('to');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50', 10)));

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const db = await getDbConnection();

    // 1. Fetch client details from system_tracking
    const [clientRows] = await db.execute(`
      SELECT cd.*, e.name as client_name, e.email as client_email, e.role as client_role
      FROM employees e
      LEFT JOIN client_details cd ON (e.id COLLATE utf8mb4_unicode_ci = cd.client_id COLLATE utf8mb4_unicode_ci)
      WHERE e.id = ?
      LIMIT 1
    `, [clientId]);

    if (!clientRows || clientRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    const client = clientRows[0];

    // 2. Fetch live data directly from remote CRM API
    const token = await getCrmToken();

    // Dynamically resolve client's actual CRM tenant (Company ID, API Key, and Company Name)
    const { targetCompanyId, crmApiKey, companyName } = await resolveCompanyForClient(token, client, db);

    // Action: return team members only
    if (action === 'members' || action === 'users') {
      let members = [];
      if (token) {
        try {
          const usersRes = await fetch(`${CRM_BASE_URL}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            members = (usersData.users || [])
              .filter(u => !targetCompanyId || Number(u.company_id) === Number(targetCompanyId))
              .map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                avatar: u.avatar,
                phone: u.phone,
                status: u.status
              }));
          }
        } catch (e) {
          console.warn('Failed to fetch CRM users:', e.message);
        }
      }
      return NextResponse.json({ success: true, members });
    }

    // Action: Single Lead Detail View
    if (leadId) {
      if (token) {
        try {
          const [leadRes, usersRes] = await Promise.all([
            fetch(`${CRM_BASE_URL}/leads/${leadId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${CRM_BASE_URL}/users`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => null)
          ]);

          if (leadRes.ok) {
            const leadData = await leadRes.json();
            const rawLead = leadData.lead;

            if (!rawLead) {
              return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
            }

            // Security: Enforce tenant boundary - client can only view leads belonging to their own company
            if (targetCompanyId && rawLead.company_id && Number(rawLead.company_id) !== Number(targetCompanyId)) {
              return NextResponse.json({
                success: false,
                error: 'Unauthorized: This lead does not belong to your company account.'
              }, { status: 403 });
            }

            let members = [];
            if (usersRes && usersRes.ok) {
              const usersData = await usersRes.json();
              members = (usersData.users || [])
                .filter(u => targetCompanyId ? Number(u.company_id) === Number(targetCompanyId) : false)
                .map(u => ({
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  role: u.role,
                  avatar: u.avatar,
                  phone: u.phone,
                  status: u.status
                }));
            }

            const matchedMember = rawLead.AssignedUser || members.find(m => m.id === rawLead.assigned_to) || null;

            const normalizedLead = {
              id: rawLead.id,
              company_id: rawLead.company_id,
              assigned_to: rawLead.assigned_to,
              source: rawLead.source || 'Website Contact Form',
              first_name: rawLead.first_name || '',
              last_name: rawLead.last_name || '',
              full_name: `${rawLead.first_name || ''} ${rawLead.last_name || ''}`.trim() || `Lead #${rawLead.id}`,
              email: rawLead.email || '',
              phone: rawLead.phone || '',
              subject: rawLead.subject || 'Website Inquiry',
              message: rawLead.message || '',
              status: rawLead.status || 'New',
              priority: rawLead.priority || 'Medium',
              lead_score: rawLead.lead_score || 0,
              follow_up_date: rawLead.follow_up_date || null,
              created_at: rawLead.createdAt || rawLead.created_at || new Date().toISOString(),
              updated_at: rawLead.updatedAt || rawLead.updated_at || new Date().toISOString(),
              assigned_user_name: matchedMember?.name || null,
              assigned_user_email: matchedMember?.email || null,
              assigned_user_avatar: matchedMember?.avatar || null,
              assigned_user_role: matchedMember?.role || null,
              AssignedUser: matchedMember,
              notes: rawLead.Notes || [],
              activities: rawLead.Activities || [],
              tasks: rawLead.Tasks || []
            };

            return NextResponse.json({
              success: true,
              lead: normalizedLead,
              members,
              company: {
                id: targetCompanyId || client.crm_company_id || 1,
                name: companyName,
                apiKey: crmApiKey,
                webhookUrl: `${CRM_BASE_URL}/leads/create?api_key=${crmApiKey}`
              }
            });
          }
        } catch (leadErr) {
          console.warn('Failed to fetch single lead from remote CRM API:', leadErr.message);
        }
      }

      // Fallback local query for single lead
      const [localLeadRows] = await db.execute(`SELECT * FROM crm_saas.leads WHERE id = ? LIMIT 1`, [leadId]).catch(() => [[]]);
      if (localLeadRows && localLeadRows.length > 0) {
        const l = localLeadRows[0];
        return NextResponse.json({
          success: true,
          lead: {
            ...l,
            full_name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || `Lead #${l.id}`,
            notes: [],
            activities: [],
            tasks: []
          },
          members: []
        });
      }
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    // List of Leads
    if (token) {
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('page', String(page));
        queryParams.set('limit', String(limit));
        if (targetCompanyId) queryParams.set('companyId', String(targetCompanyId));
        if (search && search.trim()) queryParams.set('search', search.trim());
        if (status && status !== 'all' && status !== '_all') queryParams.set('status', status.trim());
        if (priority && priority !== 'all' && priority !== '_all') queryParams.set('priority', priority.trim());
        if (assignedTo && assignedTo !== 'all' && assignedTo !== '_all') queryParams.set('assignedTo', assignedTo.trim());
        if (startDate && startDate.trim()) queryParams.set('startDate', startDate.trim());
        if (endDate && endDate.trim()) {
          const rawEnd = endDate.trim();
          const formattedEnd = rawEnd.length === 10 ? `${rawEnd}T23:59:59.999Z` : rawEnd;
          queryParams.set('endDate', formattedEnd);
        }

        const [leadsRes, usersRes] = await Promise.all([
          fetch(`${CRM_BASE_URL}/leads?${queryParams.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${CRM_BASE_URL}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(() => null)
        ]);

        if (leadsRes.ok) {
          const leadsData = await leadsRes.json();

          let members = [];
          if (usersRes && usersRes.ok) {
            const usersData = await usersRes.json();
            members = (usersData.users || [])
              .filter(u => !targetCompanyId || Number(u.company_id) === Number(targetCompanyId))
              .map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                avatar: u.avatar,
                phone: u.phone,
                status: u.status
              }));
          }

          const rawLeads = leadsData.leads || [];
          const normalizedLeads = rawLeads.map(l => {
            const matchedMember = l.AssignedUser || members.find(m => m.id === l.assigned_to) || null;
            return {
              id: l.id,
              company_id: l.company_id,
              assigned_to: l.assigned_to,
              source: l.source || 'Website Contact Form',
              first_name: l.first_name || '',
              last_name: l.last_name || '',
              full_name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'New Lead',
              email: l.email || '',
              phone: l.phone || '',
              subject: l.subject || 'Website Inquiry',
              message: l.message || '',
              status: l.status || 'New',
              priority: l.priority || 'Medium',
              lead_score: l.lead_score || 0,
              follow_up_date: l.follow_up_date || null,
              created_at: l.createdAt || l.created_at || new Date().toISOString(),
              updated_at: l.updatedAt || l.updated_at || new Date().toISOString(),
              assigned_user_name: matchedMember?.name || null,
              assigned_user_email: matchedMember?.email || null,
              assigned_user_avatar: matchedMember?.avatar || null,
              assigned_user_role: matchedMember?.role || null,
              AssignedUser: matchedMember
            };
          });

          // Compute status metrics directly from company's leads
          const stats = {
            total: leadsData.totalCount ?? normalizedLeads.length,
            new: normalizedLeads.filter(l => (l.status || '').toLowerCase() === 'new').length,
            contacted: normalizedLeads.filter(l => (l.status || '').toLowerCase() === 'contacted').length,
            qualified: normalizedLeads.filter(l => (l.status || '').toLowerCase() === 'qualified').length,
            converted: normalizedLeads.filter(l => (l.status || '').toLowerCase() === 'converted').length,
            lost: normalizedLeads.filter(l => (l.status || '').toLowerCase() === 'lost').length
          };

          return NextResponse.json({
            success: true,
            hasCrm: true,
            company: {
              id: targetCompanyId || client.crm_company_id || 1,
              name: companyName,
              email: client.client_email,
              status: 'active',
              apiKey: crmApiKey,
              webhookUrl: `${CRM_BASE_URL}/leads/create?api_key=${crmApiKey}`
            },
            stats,
            leads: normalizedLeads,
            data: normalizedLeads,
            members,
            totalCount: leadsData.totalCount || normalizedLeads.length,
            page,
            limit,
            totalPages: leadsData.totalPages || Math.ceil((leadsData.totalCount || normalizedLeads.length) / limit)
          });
        }
      } catch (apiErr) {
        console.warn('Remote CRM API fetch failed, falling back to local database:', apiErr.message);
      }
    }

    // 3. Fallback to local DB if remote CRM API was temporarily unreachable
    const [statsRows] = await db.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN LOWER(status) = 'new' THEN 1 END) as new_count,
        COUNT(CASE WHEN LOWER(status) = 'contacted' THEN 1 END) as contacted_count,
        COUNT(CASE WHEN LOWER(status) = 'qualified' THEN 1 END) as qualified_count,
        COUNT(CASE WHEN LOWER(status) = 'converted' THEN 1 END) as converted_count,
        COUNT(CASE WHEN LOWER(status) = 'lost' THEN 1 END) as lost_count
      FROM crm_saas.leads
      WHERE company_id = ?
    `, [client.crm_company_id || 1]);

    const s = statsRows[0] || {};
    const stats = {
      total: Number(s.total) || 0,
      new: Number(s.new_count) || 0,
      contacted: Number(s.contacted_count) || 0,
      qualified: Number(s.qualified_count) || 0,
      converted: Number(s.converted_count) || 0,
      lost: Number(s.lost_count) || 0
    };

    const whereConditions = ['l.company_id = ?'];
    const params = [client.crm_company_id || 1];

    if (status && status !== 'all' && status !== '_all') {
      whereConditions.push('LOWER(l.status) = LOWER(?)');
      params.push(status.trim());
    }
    if (priority && priority !== 'all' && priority !== '_all') {
      whereConditions.push('LOWER(l.priority) = LOWER(?)');
      params.push(priority.trim());
    }
    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      whereConditions.push('(l.first_name LIKE ? OR l.last_name LIKE ? OR l.email LIKE ? OR l.phone LIKE ? OR l.subject LIKE ? OR l.message LIKE ?)');
      params.push(term, term, term, term, term, term);
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

    const whereSql = whereConditions.join(' AND ');
    const [countRows] = await db.execute(`SELECT COUNT(*) as filteredTotal FROM crm_saas.leads l WHERE ${whereSql}`, params);
    const filteredTotal = Number(countRows[0]?.filteredTotal) || 0;

    const queryParams = [...params, limit, (page - 1) * limit];
    const [leadRows] = await db.execute(`
      SELECT 
        l.id, l.company_id, l.assigned_to, l.source, l.first_name, l.last_name,
        CONCAT(COALESCE(l.first_name, ''), ' ', COALESCE(l.last_name, '')) as full_name,
        l.email, l.phone, l.subject, l.message, l.status, l.priority, l.lead_score,
        l.follow_up_date, l.created_at, l.updated_at
      FROM crm_saas.leads l
      WHERE ${whereSql}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `, queryParams);

    return NextResponse.json({
      success: true,
      hasCrm: true,
      company: {
        id: client.crm_company_id || 1,
        name: companyName,
        email: client.client_email,
        status: 'active',
        apiKey: crmApiKey,
        webhookUrl: `${CRM_BASE_URL}/leads/create`
      },
      stats,
      leads: leadRows,
      data: leadRows,
      totalCount: filteredTotal,
      page,
      limit,
      totalPages: Math.ceil(filteredTotal / limit)
    });

  } catch (error) {
    console.error('Error fetching CRM leads:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PUT /api/client-services/crm-leads
 * Updates a lead's status, assignment, and details directly on the live CRM SaaS system:
 * https://demo.socialflymediatech.com/api/leads/[id]
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      clientId,
      leadId,
      id,
      status,
      assigned_to,
      assignedTo,
      first_name,
      last_name,
      name,
      email,
      phone,
      subject,
      message,
      priority,
      lead_score,
      leadScore,
      follow_up_date,
      followUpDate,
      note
    } = body;

    const targetLeadId = leadId || id;

    if (!clientId || !targetLeadId) {
      return NextResponse.json({ success: false, error: 'clientId and leadId are required' }, { status: 400 });
    }

    const db = await getDbConnection();
    const [clientRows] = await db.execute(`
      SELECT cd.*, e.name as client_name, e.email as client_email
      FROM employees e
      LEFT JOIN client_details cd ON (e.id COLLATE utf8mb4_unicode_ci = cd.client_id COLLATE utf8mb4_unicode_ci)
      WHERE e.id = ?
      LIMIT 1
    `, [clientId]);

    if (!clientRows || clientRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    const client = clientRows[0];
    const token = await getCrmToken();
    const { targetCompanyId } = await resolveCompanyForClient(token, client, db);

    // Enforce tenant boundary: verify lead belongs to client's company
    if (token && targetCompanyId) {
      try {
        const leadCheckRes = await fetch(`${CRM_BASE_URL}/leads/${targetLeadId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (leadCheckRes.ok) {
          const leadCheckData = await leadCheckRes.json();
          if (leadCheckData?.lead?.company_id && Number(leadCheckData.lead.company_id) !== Number(targetCompanyId)) {
            return NextResponse.json({
              success: false,
              error: 'Unauthorized: You cannot modify a lead belonging to another company.'
            }, { status: 403 });
          }
        }
      } catch (err) {
        console.warn('PUT lead company verification warning:', err.message);
      }
    }

    let remoteLead = null;

    // Handle name split if name passed
    let fName = first_name;
    let lName = last_name;
    if (name && (first_name === undefined || first_name === null)) {
      const parts = name.trim().split(' ');
      fName = parts[0] || '';
      lName = parts.slice(1).join(' ') || '';
    }

    const remotePayload = {};
    if (status !== undefined) remotePayload.status = status;
    if (assigned_to !== undefined || assignedTo !== undefined) {
      const rawAss = assigned_to !== undefined ? assigned_to : assignedTo;
      remotePayload.assigned_to = (rawAss === null || rawAss === '' || rawAss === 'unassigned' || rawAss === 0) ? null : Number(rawAss);
    }
    if (fName !== undefined) remotePayload.first_name = fName;
    if (lName !== undefined) remotePayload.last_name = lName;
    if (email !== undefined) remotePayload.email = email;
    if (phone !== undefined) remotePayload.phone = phone;
    if (subject !== undefined) remotePayload.subject = subject;
    if (message !== undefined) remotePayload.message = message;
    if (priority !== undefined) remotePayload.priority = priority;
    if (lead_score !== undefined || leadScore !== undefined) {
      remotePayload.lead_score = Number(lead_score ?? leadScore) || 0;
    }
    if (follow_up_date !== undefined || followUpDate !== undefined) {
      remotePayload.follow_up_date = follow_up_date || followUpDate || null;
    }

    // Verify assigned staff belongs to client's company
    if (token && targetCompanyId && remotePayload.assigned_to) {
      try {
        const usersRes = await fetch(`${CRM_BASE_URL}/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          const validStaff = (usersData.users || []).find(u => 
            Number(u.id) === Number(remotePayload.assigned_to) && 
            Number(u.company_id) === Number(targetCompanyId)
          );
          if (!validStaff) {
            return NextResponse.json({
              success: false,
              error: 'Invalid assignment: Selected member does not belong to your company staff.'
            }, { status: 400 });
          }
        }
      } catch (err) {
        console.warn('PUT assignee verification warning:', err.message);
      }
    }

    if (token && Object.keys(remotePayload).length > 0) {
      try {
        const updateRes = await fetch(`${CRM_BASE_URL}/leads/${targetLeadId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(remotePayload)
        });

        if (updateRes.ok) {
          const updateData = await updateRes.json();
          remoteLead = updateData.lead || null;
        }

        // If note is provided, append note to lead
        if (note && note.trim() !== '') {
          await fetch(`${CRM_BASE_URL}/leads/${targetLeadId}/notes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ note: note.trim() })
          }).catch(() => null);
        }
      } catch (err) {
        console.warn('Failed to update lead remotely on CRM API:', err.message);
      }
    }

    // Also update local database if lead exists locally
    try {
      const db = await getDbConnection();
      const updates = [];
      const params = [];
      if (remotePayload.status) { updates.push('status = ?'); params.push(remotePayload.status); }
      if (remotePayload.assigned_to !== undefined) { updates.push('assigned_to = ?'); params.push(remotePayload.assigned_to); }
      if (remotePayload.first_name !== undefined) { updates.push('first_name = ?'); params.push(remotePayload.first_name); }
      if (remotePayload.last_name !== undefined) { updates.push('last_name = ?'); params.push(remotePayload.last_name); }
      if (remotePayload.email !== undefined) { updates.push('email = ?'); params.push(remotePayload.email); }
      if (remotePayload.phone !== undefined) { updates.push('phone = ?'); params.push(remotePayload.phone); }
      if (remotePayload.subject !== undefined) { updates.push('subject = ?'); params.push(remotePayload.subject); }
      if (remotePayload.priority !== undefined) { updates.push('priority = ?'); params.push(remotePayload.priority); }
      if (remotePayload.lead_score !== undefined) { updates.push('lead_score = ?'); params.push(remotePayload.lead_score); }

      if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        params.push(targetLeadId);
        await db.execute(`UPDATE crm_saas.leads SET ${updates.join(', ')} WHERE id = ?`, params);
      }

      if (note && note.trim() !== '') {
        await db.execute(`
          INSERT INTO crm_saas.lead_notes (lead_id, user_id, note, created_at, updated_at)
          VALUES (?, NULL, ?, NOW(), NOW())
        `, [targetLeadId, note.trim()]).catch(() => null);
      }
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Lead updated successfully.',
      lead: remoteLead
    });
  } catch (error) {
    console.error('Error updating CRM lead:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/client-services/crm-leads
 * 1. action='configure': Link/Update CRM API Key for client
 * 2. action='test_lead': Dispatches a verified test lead directly to:
 *    https://demo.socialflymediatech.com/api/leads/create
 * 3. action='add_note': Adds an internal follow-up note to a lead
 * 4. Incoming Webhook: Proxies lead submissions to the CRM
 */
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const db = await getDbConnection();

    // Action: Add Note to Lead
    if (body.action === 'add_note') {
      const { leadId, id, note } = body;
      const targetLeadId = leadId || id;
      if (!targetLeadId || !note || !note.trim()) {
        return NextResponse.json({ success: false, error: 'leadId and note are required' }, { status: 400 });
      }

      const token = await getCrmToken();
      let createdNote = null;

      if (token) {
        try {
          const res = await fetch(`${CRM_BASE_URL}/leads/${targetLeadId}/notes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ note: note.trim() })
          });
          if (res.ok) {
            const data = await res.json();
            createdNote = data.note || data;
          }
        } catch (err) {
          console.warn('Failed to add note to remote CRM API:', err.message);
        }
      }

      // Also save to local DB
      try {
        await db.execute(`
          INSERT INTO crm_saas.lead_notes (lead_id, user_id, note, created_at, updated_at)
          VALUES (?, NULL, ?, NOW(), NOW())
        `, [targetLeadId, note.trim()]).catch(() => null);
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: 'Note added successfully.',
        note: createdNote || { note: note.trim(), createdAt: new Date().toISOString() }
      });
    }

    // 1. Client action: Link / Configure CRM API Key
    if (body.action === 'configure') {
      const { clientId, apiKey } = body;
      if (!clientId || !apiKey) {
        return NextResponse.json({ success: false, error: 'clientId and apiKey are required' }, { status: 400 });
      }

      const trimmedKey = apiKey.trim();

      // Update client_details
      await db.execute(`
        UPDATE client_details
        SET crm_api_key = ?
        WHERE client_id = ?
      `, [trimmedKey, clientId]);

      return NextResponse.json({
        success: true,
        message: 'Successfully updated CRM API Key!',
        company: {
          apiKey: trimmedKey,
          webhookUrl: `${CRM_BASE_URL}/leads/create`
        }
      });
    }

    // 2. Client action: Generate Live Test Lead on https://demo.socialflymediatech.com/api/leads/create
    if (body.action === 'test_lead') {
      const { clientId } = body;
      if (!clientId) {
        return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
      }

      const [clientRows] = await db.execute(`
        SELECT cd.crm_api_key, cd.crm_company_id, cd.company_name, e.name as client_name
        FROM employees e
        LEFT JOIN client_details cd ON (e.id COLLATE utf8mb4_unicode_ci = cd.client_id COLLATE utf8mb4_unicode_ci)
        WHERE e.id = ?
        LIMIT 1
      `, [clientId]);

      const client = clientRows?.[0] || {};
      const apiKey = client.crm_api_key || 'acme_wp_integration_key_xyz_2026';
      const testPhone = `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`;
      const testEmail = `inquiry.${Math.floor(1000 + Math.random() * 9000)}@customer.com`;

      const testPayload = {
        name: 'Demo Client Inquiry',
        email: testEmail,
        phone: testPhone,
        subject: 'Live Website Contact Form Test',
        message: 'Hello, this is an automated test lead created from DeviceDesk to verify live synchronization with https://demo.socialflymediatech.com/api/.',
        source: 'DeviceDesk Live Test'
      };

      // Send to remote CRM API
      const createRes = await fetch(`${CRM_BASE_URL}/leads/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(testPayload)
      });

      const createData = await createRes.json();

      if (createRes.ok && createData.success) {
        return NextResponse.json({
          success: true,
          message: 'Test lead created successfully on https://demo.socialflymediatech.com/api/! Refreshing leads...',
          leadId: createData.lead_id
        });
      } else {
        return NextResponse.json({
          success: false,
          error: createData.error || 'Failed to dispatch test lead to CRM API'
        }, { status: 400 });
      }
    }

    // 3. Webhook Lead Ingestion (Proxy submissions to https://demo.socialflymediatech.com/api/leads/create)
    let apiKey = searchParams.get('api_key');
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7).trim();
    }
    if (!apiKey && (body.api_key || body.apiKey)) {
      apiKey = (body.api_key || body.apiKey).trim();
    }
    if (!apiKey) {
      apiKey = 'acme_wp_integration_key_xyz_2026';
    }

    const proxyRes = await fetch(`${CRM_BASE_URL}/leads/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    const proxyData = await proxyRes.json();
    return NextResponse.json(proxyData, { status: proxyRes.status });

  } catch (error) {
    console.error('Error handling CRM leads POST:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
