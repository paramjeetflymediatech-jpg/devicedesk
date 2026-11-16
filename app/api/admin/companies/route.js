import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Pepper for main employees table (matching system-tracking convention)
const PEPPER = process.env.PASSWORD_PEPPER || 'devicedesk_secure_pepper_key_2026';

/**
 * GET /api/admin/companies
 * Fetch all companies from crm_saas.companies along with their primary company_admin and stats
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const status = (searchParams.get('status') || 'all').toLowerCase();
    const plan = (searchParams.get('plan') || 'all').toLowerCase();

    const db = await getDbConnection();

    // 1. Fetch companies joined with primary company_admin user
    let query = `
      SELECT 
        c.id,
        c.company_name,
        c.website,
        c.logo,
        c.email as company_email,
        c.phone as company_phone,
        c.api_key,
        c.subscription_plan,
        c.status,
        c.created_at,
        c.updated_at,
        -- Company Admin user
        u.id as admin_user_id,
        u.name as admin_name,
        u.email as admin_email,
        u.phone as admin_phone,
        u.status as admin_status,
        u.last_login as admin_last_login,
        -- Leads count
        COALESCE((SELECT COUNT(*) FROM crm_saas.leads l WHERE l.company_id = c.id), 0) as leads_count,
        -- Staff count
        COALESCE((SELECT COUNT(*) FROM crm_saas.users u2 WHERE u2.company_id = c.id), 0) as staff_count,
        -- Linked client in system_tracking
        cd.client_id as linked_client_id,
        e.name as linked_client_name,
        e.email as linked_client_email
      FROM crm_saas.companies c
      LEFT JOIN (
        SELECT id, company_id, name, email, phone, status, last_login
        FROM crm_saas.users
        WHERE role = 'company_admin'
        ORDER BY id ASC
      ) u ON u.company_id = c.id
      LEFT JOIN client_details cd ON (cd.crm_company_id = c.id)
      LEFT JOIN employees e ON cd.client_id = e.id
      WHERE 1=1
    `;

    const params = [];

    if (status !== 'all') {
      query += ` AND LOWER(c.status) = ?`;
      params.push(status);
    }

    if (plan !== 'all') {
      query += ` AND LOWER(c.subscription_plan) = ?`;
      params.push(plan);
    }

    if (search) {
      query += ` AND (
        LOWER(c.company_name) LIKE ? OR 
        LOWER(COALESCE(c.website, '')) LIKE ? OR 
        LOWER(COALESCE(c.email, '')) LIKE ? OR 
        LOWER(COALESCE(u.name, '')) LIKE ? OR 
        LOWER(COALESCE(u.email, '')) LIKE ?
      )`;
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild, searchWild, searchWild);
    }

    query += ` ORDER BY c.id DESC`;

    const [rows] = await db.query(query, params);

    // Group in case multiple company_admins exist for a single company
    const companyMap = new Map();
    for (const r of rows) {
      if (!companyMap.has(r.id)) {
        companyMap.set(r.id, {
          id: r.id,
          company_name: r.company_name,
          website: r.website || '',
          logo: r.logo || null,
          email: r.company_email || '',
          phone: r.company_phone || '',
          api_key: r.api_key || '',
          subscription_plan: r.subscription_plan || 'free',
          status: r.status || 'active',
          created_at: r.created_at,
          updated_at: r.updated_at,
          leads_count: Number(r.leads_count) || 0,
          staff_count: Number(r.staff_count) || 0,
          admin: r.admin_user_id ? {
            id: r.admin_user_id,
            name: r.admin_name,
            email: r.admin_email,
            phone: r.admin_phone || '',
            status: r.admin_status || 'active',
            last_login: r.admin_last_login || null
          } : null,
          linked_client: r.linked_client_id ? {
            id: r.linked_client_id,
            name: r.linked_client_name,
            email: r.linked_client_email
          } : null
        });
      }
    }

    const companies = Array.from(companyMap.values());

    return NextResponse.json({
      success: true,
      companies,
      total: companies.length
    });
  } catch (error) {
    console.error('[API /admin/companies GET] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/companies
 * Add a new company and create its company admin credentials (username, password, website, api_key)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      company_name,
      website,
      company_email,
      company_phone,
      subscription_plan = 'free',
      status = 'active',
      api_key,
      // Admin details
      admin_name,
      admin_email,
      admin_password,
      admin_phone,
      // Sync options
      create_client_login = true
    } = body;

    if (!company_name || !company_name.trim()) {
      return NextResponse.json({ success: false, message: 'Company name is required.' }, { status: 400 });
    }
    if (!admin_name || !admin_name.trim()) {
      return NextResponse.json({ success: false, message: 'Company admin full name is required.' }, { status: 400 });
    }
    if (!admin_email || !admin_email.trim()) {
      return NextResponse.json({ success: false, message: 'Admin username / email is required.' }, { status: 400 });
    }
    if (!admin_password || !admin_password.trim()) {
      return NextResponse.json({ success: false, message: 'Admin password is required.' }, { status: 400 });
    }

    const cleanCompanyName = company_name.trim();
    const cleanWebsite = (website || '').trim();
    const cleanAdminName = admin_name.trim();
    const cleanAdminEmail = admin_email.trim().toLowerCase();
    const cleanPassword = admin_password.trim();
    const cleanAdminPhone = (admin_phone || company_phone || '').trim();
    const cleanPlan = (subscription_plan || 'free').trim().toLowerCase();
    const cleanStatus = (status || 'active').trim().toLowerCase();

    const db = await getDbConnection();

    // 1. Verify email does not already exist in crm_saas.users
    const [existingUsers] = await db.query(
      `SELECT id, email FROM crm_saas.users WHERE LOWER(email) = ? LIMIT 1`,
      [cleanAdminEmail]
    );
    if (existingUsers.length > 0) {
      return NextResponse.json({
        success: false,
        message: `A user with email/username "${cleanAdminEmail}" already exists in the CRM.`
      }, { status: 409 });
    }

    // 2. Generate or sanitize API Key
    let finalApiKey = (api_key || '').trim();
    if (!finalApiKey) {
      const slug = cleanCompanyName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'crm';
      finalApiKey = `${slug}_wp_key_${crypto.randomBytes(8).toString('hex')}`;
    }

    // Check if API key is unique
    const [existingKeys] = await db.query(
      `SELECT id FROM crm_saas.companies WHERE api_key = ? LIMIT 1`,
      [finalApiKey]
    );
    if (existingKeys.length > 0) {
      finalApiKey = `${finalApiKey}_${crypto.randomBytes(4).toString('hex')}`;
    }

    const now = new Date();

    // 3. Insert into crm_saas.companies
    const [compResult] = await db.execute(
      `INSERT INTO crm_saas.companies (
        company_name, website, email, phone, api_key, subscription_plan, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanCompanyName,
        cleanWebsite || null,
        company_email?.trim() || cleanAdminEmail,
        cleanAdminPhone || null,
        finalApiKey,
        cleanPlan,
        cleanStatus,
        now,
        now
      ]
    );

    const newCompanyId = compResult.insertId;

    // 4. Hash password with bcrypt for crm_saas.users
    const bcryptHashedPassword = await bcrypt.hash(cleanPassword, 10);

    // 5. Insert into crm_saas.users as 'company_admin'
    const [userResult] = await db.execute(
      `INSERT INTO crm_saas.users (
        company_id, name, email, password, role, phone, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'company_admin', ?, ?, ?, ?)`,
      [
        newCompanyId,
        cleanAdminName,
        cleanAdminEmail,
        bcryptHashedPassword,
        cleanAdminPhone || null,
        cleanStatus,
        now,
        now
      ]
    );

    const newAdminUserId = userResult.insertId;

    // 6. Optional: Create or link client login in main employees & client_details table
    let linkedClientId = null;
    if (create_client_login) {
      try {
        // Check if employee with email already exists
        const [empRows] = await db.query(
          `SELECT id FROM employees WHERE LOWER(email) = ? LIMIT 1`,
          [cleanAdminEmail]
        );

        if (empRows.length > 0) {
          linkedClientId = empRows[0].id;
          // Update client_details if present
          await db.execute(
            `UPDATE client_details 
             SET crm_company_id = ?, crm_api_key = ?, company_name = ?, website_url = ?
             WHERE client_id = ?`,
            [newCompanyId, finalApiKey, cleanCompanyName, cleanWebsite || null, linkedClientId]
          ).catch(() => null);
        } else {
          // Create new employee with role = 'client'
          linkedClientId = 'client_' + Date.now();
          const pepperedPassword = await bcrypt.hash(cleanPassword + PEPPER, 10);

          await db.execute(
            `INSERT INTO employees (id, name, email, password, role, department, status, createdAt)
             VALUES (?, ?, ?, ?, 'client', 'Client', 'Active', NOW())`,
            [linkedClientId, cleanAdminName, cleanAdminEmail, pepperedPassword]
          );

          // Insert into client_details
          await db.execute(
            `INSERT INTO client_details (
              client_id, company_name, phone, website_url, crm_company_id, crm_api_key, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [linkedClientId, cleanCompanyName, cleanAdminPhone || null, cleanWebsite || null, newCompanyId, finalApiKey]
          );
        }
      } catch (clientSyncErr) {
        console.warn('Could not sync client login record to employees/client_details:', clientSyncErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Company "${cleanCompanyName}" and Admin "${cleanAdminName}" created successfully!`,
      data: {
        company_id: newCompanyId,
        company_name: cleanCompanyName,
        website: cleanWebsite,
        api_key: finalApiKey,
        admin_user_id: newAdminUserId,
        admin_name: cleanAdminName,
        admin_email: cleanAdminEmail,
        linked_client_id: linkedClientId
      }
    });
  } catch (error) {
    console.error('[API /admin/companies POST] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/companies
 * Update existing company and/or company admin details, including password update
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      company_id,
      company_name,
      website,
      company_email,
      company_phone,
      subscription_plan,
      status,
      api_key,
      // Admin update
      admin_user_id,
      admin_name,
      admin_email,
      admin_password,
      admin_phone,
      admin_status
    } = body;

    if (!company_id) {
      return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    // 1. Update company in crm_saas.companies
    const compUpdates = [];
    const compParams = [];

    if (company_name !== undefined) {
      compUpdates.push('company_name = ?');
      compParams.push(company_name.trim());
    }
    if (website !== undefined) {
      compUpdates.push('website = ?');
      compParams.push(website ? website.trim() : null);
    }
    if (company_email !== undefined) {
      compUpdates.push('email = ?');
      compParams.push(company_email ? company_email.trim() : null);
    }
    if (company_phone !== undefined) {
      compUpdates.push('phone = ?');
      compParams.push(company_phone ? company_phone.trim() : null);
    }
    if (subscription_plan !== undefined) {
      compUpdates.push('subscription_plan = ?');
      compParams.push(subscription_plan.trim().toLowerCase());
    }
    if (status !== undefined) {
      compUpdates.push('status = ?');
      compParams.push(status.trim().toLowerCase());
    }
    if (api_key !== undefined && api_key.trim()) {
      compUpdates.push('api_key = ?');
      compParams.push(api_key.trim());
    }

    compUpdates.push('updated_at = NOW()');

    if (compUpdates.length > 0) {
      compParams.push(company_id);
      await db.execute(
        `UPDATE crm_saas.companies SET ${compUpdates.join(', ')} WHERE id = ?`,
        compParams
      );
    }

    // 2. Update or create company_admin in crm_saas.users
    if (admin_name || admin_email || admin_password || admin_phone || admin_status) {
      let targetAdminId = admin_user_id;

      if (!targetAdminId) {
        // Find existing company_admin for this company
        const [existing] = await db.query(
          `SELECT id FROM crm_saas.users WHERE company_id = ? AND role = 'company_admin' LIMIT 1`,
          [company_id]
        );
        if (existing.length > 0) {
          targetAdminId = existing[0].id;
        }
      }

      if (targetAdminId) {
        const userUpdates = [];
        const userParams = [];

        if (admin_name) {
          userUpdates.push('name = ?');
          userParams.push(admin_name.trim());
        }
        if (admin_email) {
          userUpdates.push('email = ?');
          userParams.push(admin_email.trim().toLowerCase());
        }
        if (admin_phone !== undefined) {
          userUpdates.push('phone = ?');
          userParams.push(admin_phone ? admin_phone.trim() : null);
        }
        if (admin_status) {
          userUpdates.push('status = ?');
          userParams.push(admin_status.trim().toLowerCase());
        }
        if (admin_password && admin_password.trim()) {
          const hashedPassword = await bcrypt.hash(admin_password.trim(), 10);
          userUpdates.push('password = ?');
          userParams.push(hashedPassword);
        }

        userUpdates.push('updated_at = NOW()');

        if (userUpdates.length > 0) {
          userParams.push(targetAdminId);
          await db.execute(
            `UPDATE crm_saas.users SET ${userUpdates.join(', ')} WHERE id = ?`,
            userParams
          );
        }
      } else if (admin_name && admin_email && admin_password) {
        // Create new company admin for this company if one didn't exist
        const hashedPassword = await bcrypt.hash(admin_password.trim(), 10);
        await db.execute(
          `INSERT INTO crm_saas.users (
            company_id, name, email, password, role, phone, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'company_admin', ?, ?, NOW(), NOW())`,
          [
            company_id,
            admin_name.trim(),
            admin_email.trim().toLowerCase(),
            hashedPassword,
            admin_phone ? admin_phone.trim() : null,
            admin_status ? admin_status.trim().toLowerCase() : 'active'
          ]
        );
      }
    }

    // 3. Sync changes to linked client_details
    try {
      const cdUpdates = [];
      const cdParams = [];

      if (company_name) {
        cdUpdates.push('company_name = ?');
        cdParams.push(company_name.trim());
      }
      if (website !== undefined) {
        cdUpdates.push('website_url = ?');
        cdParams.push(website ? website.trim() : null);
      }
      if (api_key && api_key.trim()) {
        cdUpdates.push('crm_api_key = ?');
        cdParams.push(api_key.trim());
      }
      if (company_phone !== undefined || admin_phone !== undefined) {
        cdUpdates.push('phone = ?');
        cdParams.push(company_phone ? company_phone.trim() : (admin_phone ? admin_phone.trim() : null));
      }

      if (cdUpdates.length > 0) {
        cdUpdates.push('updated_at = NOW()');
        cdParams.push(company_id);
        await db.execute(
          `UPDATE client_details SET ${cdUpdates.join(', ')} WHERE crm_company_id = ?`,
          cdParams
        );
      }
    } catch (e) {
      console.warn('Sync to client_details skipped:', e.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Company and Admin details updated successfully.'
    });
  } catch (error) {
    console.error('[API /admin/companies PUT] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/companies
 * Delete a company and its users
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Company ID is required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    // 1. Delete associated leads, activities, notes from crm_saas
    await db.execute(`DELETE FROM crm_saas.lead_notes WHERE lead_id IN (SELECT id FROM crm_saas.leads WHERE company_id = ?)`, [id]).catch(() => null);
    await db.execute(`DELETE FROM crm_saas.lead_activities WHERE lead_id IN (SELECT id FROM crm_saas.leads WHERE company_id = ?)`, [id]).catch(() => null);
    await db.execute(`DELETE FROM crm_saas.tasks WHERE lead_id IN (SELECT id FROM crm_saas.leads WHERE company_id = ?)`, [id]).catch(() => null);
    await db.execute(`DELETE FROM crm_saas.leads WHERE company_id = ?`, [id]).catch(() => null);

    // 2. Delete users belonging to this company
    await db.execute(`DELETE FROM crm_saas.users WHERE company_id = ?`, [id]).catch(() => null);

    // 3. Clear link in client_details
    await db.execute(`UPDATE client_details SET crm_company_id = NULL WHERE crm_company_id = ?`, [id]).catch(() => null);

    // 4. Delete company
    const [result] = await db.execute(`DELETE FROM crm_saas.companies WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, message: 'Company not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Company and associated admin credentials deleted successfully.'
    });
  } catch (error) {
    console.error('[API /admin/companies DELETE] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

