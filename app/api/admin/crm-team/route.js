import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDbConnection } from '../../db/db.js';
import { checkAuth } from '../../utils/storageManager.js';
import { isSuperAdminUser } from '../../../utils/authTokens.js';

export const dynamic = 'force-dynamic';

// Helper to verify superadmin access
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
 * GET /api/admin/crm-team
 * Returns all CRM team members and list of all companies
 */
export async function GET(request) {
  try {
    const adminUser = await verifyAdminAuth(request);
    if (!adminUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const db = await getDbConnection();

    // 1. Fetch all companies for assignment dropdown
    let companies = [];
    try {
      const [compRows] = await db.query(
        `SELECT id, company_name, website, status FROM crm_saas.companies ORDER BY company_name ASC`
      );
      companies = compRows || [];
    } catch (e) {
      console.warn('Could not fetch crm_saas.companies:', e.message);
    }

    // 2. Fetch all CRM team members
    const [members] = await db.query(
      `SELECT id, name, email, phone, access_type, assigned_companies, status, role, avatar, notes, last_login, created_at, updated_at
       FROM crm_team_members
       ORDER BY id DESC`
    );

    // Format assigned companies for each member
    const formattedMembers = members.map((m) => {
      let companyIds = [];
      try {
        if (m.assigned_companies) {
          companyIds = typeof m.assigned_companies === 'string' ? JSON.parse(m.assigned_companies) : m.assigned_companies;
          if (!Array.isArray(companyIds)) companyIds = [];
        }
      } catch (err) {
        companyIds = [];
      }

      // Map IDs to company objects
      const assignedCompanyDetails = companies.filter((c) => companyIds.map(Number).includes(Number(c.id)));

      return {
        ...m,
        assigned_company_ids: companyIds,
        assigned_companies_details: assignedCompanyDetails
      };
    });

    return NextResponse.json({
      success: true,
      members: formattedMembers,
      data: formattedMembers,
      companies
    });
  } catch (err) {
    console.error('Fetch CRM Team Members API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/crm-team
 * Creates a new CRM team member with scoped or full company access
 */
export async function POST(request) {
  try {
    const adminUser = await verifyAdminAuth(request);
    if (!adminUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await request.json();

    // Check for bulk import action
    if (body.action === 'bulk_import' || Array.isArray(body.members)) {
      const list = body.members || [];
      if (!Array.isArray(list) || list.length === 0) {
        return NextResponse.json({ success: false, error: 'No CRM team members provided for import.' }, { status: 400 });
      }

      const db = await getDbConnection();

      // Pre-fetch all companies from crm_saas.companies to resolve company names to IDs
      let allCompanies = [];
      try {
        const [compRows] = await db.query(`SELECT id, company_name FROM crm_saas.companies`);
        allCompanies = compRows || [];
      } catch (e) {
        console.warn('Could not pre-fetch companies for import mapping:', e.message);
      }

      let inserted = 0;
      let updated = 0;
      let skipped = 0;
      const errors = [];

      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const name = (item.name || item['Full Name'] || item['Name'] || '').trim();
        const email = (item.email || item['Email'] || item['Email Address'] || '').toLowerCase().trim();
        const phone = (item.phone || item['Phone'] || item['Phone Number'] || '').trim();
        const rawPassword = (item.password || item['Password'] || '').trim();
        const rawAccess = (item.access_type || item['Access Type'] || item['Access Scope'] || '').toLowerCase().trim();
        const rawStatus = (item.status || item['Status'] || 'active').toLowerCase().trim();
        const rawCompanies = item.assigned_companies || item['Assigned Companies'] || item['Companies'] || '';
        const notes = (item.notes || item['Notes'] || item['Remarks'] || '').trim();

        if (!name || !email || !email.includes('@')) {
          skipped++;
          errors.push(`Row ${i + 1}: Missing name or valid email.`);
          continue;
        }

        const access_type = (rawAccess === 'all' || rawAccess.includes('full')) ? 'all' : 'specific';
        const status = rawStatus === 'inactive' ? 'inactive' : 'active';

        // Resolve assigned company IDs
        let assignedIds = [];
        if (access_type === 'specific' && rawCompanies) {
          if (Array.isArray(rawCompanies)) {
            assignedIds = rawCompanies.map(Number).filter((n) => !isNaN(n) && n > 0);
          } else if (typeof rawCompanies === 'string') {
            const tokens = rawCompanies.split(/[,;|]/).map((t) => t.trim().toLowerCase()).filter(Boolean);
            for (const token of tokens) {
              const asNum = Number(token);
              if (!isNaN(asNum) && asNum > 0) {
                assignedIds.push(asNum);
              } else {
                const found = allCompanies.find((c) => c.company_name?.toLowerCase() === token || c.company_name?.toLowerCase().includes(token));
                if (found) assignedIds.push(found.id);
              }
            }
          }
        }
        const assignedJson = JSON.stringify(Array.from(new Set(assignedIds)));

        try {
          // Check if member exists
          const [existing] = await db.execute(
            `SELECT id FROM crm_team_members WHERE LOWER(email) = ? LIMIT 1`,
            [email]
          );

          if (existing.length > 0) {
            // Update existing member
            const updateFields = ['name = ?', 'phone = ?', 'access_type = ?', 'assigned_companies = ?', 'status = ?', 'notes = ?'];
            const updateParams = [name, phone || null, access_type, assignedJson, status, notes || null];

            if (rawPassword && rawPassword.length >= 4) {
              const hashed = await bcrypt.hash(rawPassword, 10);
              updateFields.push('password = ?');
              updateParams.push(hashed);
            }

            updateParams.push(existing[0].id);
            await db.execute(`UPDATE crm_team_members SET ${updateFields.join(', ')} WHERE id = ?`, updateParams);
            updated++;
          } else {
            // Insert new member
            const effectivePassword = rawPassword && rawPassword.length >= 4 ? rawPassword : `Pass@${Math.floor(1000 + Math.random() * 9000)}`;
            const hashedPassword = await bcrypt.hash(effectivePassword, 10);

            await db.execute(
              `INSERT INTO crm_team_members (name, email, password, phone, access_type, assigned_companies, status, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [name, email, hashedPassword, phone || null, access_type, assignedJson, status, notes || null]
            );
            inserted++;
          }
        } catch (err) {
          console.error(`CRM Team import error row ${i + 1}:`, err.message);
          errors.push(`Row ${i + 1} (${email}): ${err.message}`);
          skipped++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Import complete: ${inserted} added, ${updated} updated, ${skipped} skipped.`,
        inserted,
        updated,
        skipped,
        total: list.length,
        errors
      });
    }

    const { name, email, password, phone, access_type, assigned_companies, status, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Full name is required.' }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ success: false, error: 'Email address is required.' }, { status: 400 });
    }
    if (!password || password.length < 4) {
      return NextResponse.json({ success: false, error: 'Password must be at least 4 characters long.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanAccessType = access_type === 'all' ? 'all' : 'specific';
    const cleanStatus = status === 'inactive' ? 'inactive' : 'active';

    // Format assigned companies as a JSON array of numbers or null if none
    let compArray = [];
    if (cleanAccessType === 'specific' && Array.isArray(assigned_companies)) {
      compArray = assigned_companies.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0);
    }
    const assignedJson = compArray.length > 0 ? JSON.stringify(compArray) : null;

    const db = await getDbConnection();

    // Check if email already exists in crm_team_members
    const [existing] = await db.execute(
      `SELECT id FROM crm_team_members WHERE LOWER(email) = ? LIMIT 1`,
      [cleanEmail]
    );
    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: 'A team member with this email address already exists.' }, { status: 400 });
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      `INSERT INTO crm_team_members (name, email, password, phone, access_type, assigned_companies, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        cleanEmail,
        hashedPassword,
        phone ? phone.trim() : null,
        cleanAccessType,
        assignedJson,
        cleanStatus,
        notes ? notes.trim() : null
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'CRM team member created successfully.',
      id: result.insertId
    });
  } catch (err) {
    console.error('Create CRM Team Member API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/crm-team
 * Updates an existing CRM team member
 */
export async function PUT(request) {
  try {
    const adminUser = await verifyAdminAuth(request);
    if (!adminUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, email, password, phone, access_type, assigned_companies, status, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Member ID is required.' }, { status: 400 });
    }

    const db = await getDbConnection();
    const [existingRows] = await db.execute(`SELECT * FROM crm_team_members WHERE id = ? LIMIT 1`, [id]);
    if (existingRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Member not found.' }, { status: 404 });
    }
    const current = existingRows[0];

    const cleanName = (name !== undefined && name !== null) ? name.trim() : current.name;
    const cleanEmail = (email !== undefined && email !== null) ? email.toLowerCase().trim() : current.email;
    const cleanPhone = phone !== undefined ? (phone ? phone.trim() : null) : current.phone;
    const cleanAccessType = access_type ? (access_type === 'all' ? 'all' : 'specific') : current.access_type;
    const cleanStatus = status ? (status === 'inactive' ? 'inactive' : 'active') : current.status;
    const cleanNotes = notes !== undefined ? (notes ? notes.trim() : null) : current.notes;

    let compArray = [];
    if (assigned_companies !== undefined) {
      if (cleanAccessType === 'specific' && Array.isArray(assigned_companies)) {
        compArray = assigned_companies.map((cid) => Number(cid)).filter((cid) => !isNaN(cid) && cid > 0);
      }
    } else {
      try {
        compArray = typeof current.assigned_companies === 'string' ? JSON.parse(current.assigned_companies) : (current.assigned_companies || []);
      } catch (e) {
        compArray = [];
      }
    }
    const assignedJson = compArray.length > 0 ? JSON.stringify(compArray) : null;

    // Check if another member uses this email
    if (cleanEmail) {
      const [existing] = await db.execute(
        `SELECT id FROM crm_team_members WHERE LOWER(email) = ? AND id != ? LIMIT 1`,
        [cleanEmail, id]
      );
      if (existing.length > 0) {
        return NextResponse.json({ success: false, error: 'Another team member already uses this email.' }, { status: 400 });
      }
    }

    // If password provided, update hash; else keep current password
    if (password && password.trim().length >= 4) {
      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      await db.execute(
        `UPDATE crm_team_members
         SET name = ?, email = ?, password = ?, phone = ?, access_type = ?, assigned_companies = ?, status = ?, notes = ?
         WHERE id = ?`,
        [cleanName, cleanEmail, hashedPassword, cleanPhone, cleanAccessType, assignedJson, cleanStatus, cleanNotes, id]
      );
    } else {
      await db.execute(
        `UPDATE crm_team_members
         SET name = ?, email = ?, phone = ?, access_type = ?, assigned_companies = ?, status = ?, notes = ?
         WHERE id = ?`,
        [cleanName, cleanEmail, cleanPhone, cleanAccessType, assignedJson, cleanStatus, cleanNotes, id]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'CRM team member updated successfully.'
    });
  } catch (err) {
    console.error('Update CRM Team Member API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/crm-team
 * Removes one or multiple CRM team members
 */
export async function DELETE(request) {
  try {
    const adminUser = await verifyAdminAuth(request);
    if (!adminUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    let idsToDelete = [];
    try {
      const body = await request.json().catch(() => null);
      if (body) {
        if (Array.isArray(body.ids)) {
          idsToDelete = body.ids.map(Number).filter((n) => !isNaN(n) && n > 0);
        } else if (body.id) {
          idsToDelete = [Number(body.id)].filter((n) => !isNaN(n) && n > 0);
        }
      }
    } catch (e) {}

    if (idsToDelete.length === 0) {
      const { searchParams } = new URL(request.url);
      const idsParam = searchParams.get('ids');
      const idParam = searchParams.get('id');
      if (idsParam) {
        idsToDelete = idsParam.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n) && n > 0);
      } else if (idParam) {
        idsToDelete = [Number(idParam)].filter((n) => !isNaN(n) && n > 0);
      }
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ success: false, error: 'Member ID(s) required for deletion.' }, { status: 400 });
    }

    const db = await getDbConnection();
    const placeholders = idsToDelete.map(() => '?').join(',');
    const [result] = await db.execute(`DELETE FROM crm_team_members WHERE id IN (${placeholders})`, idsToDelete);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.affectedRows} CRM team member${result.affectedRows === 1 ? '' : 's'}.`,
      deletedCount: result.affectedRows
    });
  } catch (err) {
    console.error('Delete CRM Team Member API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
