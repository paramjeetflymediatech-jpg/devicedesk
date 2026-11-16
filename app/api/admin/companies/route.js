import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

/**
 * GET /api/admin/companies
 * Retrieve all company admin credentials and website logins
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const status = (searchParams.get('status') || 'all').toLowerCase();
    const platform = (searchParams.get('platform') || 'all').toLowerCase();

    const db = await getDbConnection();

    // Ensure table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS company_credentials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        website_url VARCHAR(500) DEFAULT NULL,
        admin_url VARCHAR(500) DEFAULT NULL,
        admin_name VARCHAR(255) DEFAULT NULL,
        admin_email VARCHAR(255) DEFAULT NULL,
        admin_phone VARCHAR(100) DEFAULT NULL,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        platform VARCHAR(100) DEFAULT 'WordPress',
        status VARCHAR(50) DEFAULT 'Active',
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    let query = `SELECT * FROM company_credentials WHERE 1=1`;
    const params = [];

    if (status !== 'all') {
      query += ` AND LOWER(status) = ?`;
      params.push(status);
    }

    if (platform !== 'all') {
      query += ` AND LOWER(platform) = ?`;
      params.push(platform);
    }

    if (search) {
      query += ` AND (
        LOWER(company_name) LIKE ? OR
        LOWER(COALESCE(website_url, '')) LIKE ? OR
        LOWER(COALESCE(admin_url, '')) LIKE ? OR
        LOWER(COALESCE(admin_name, '')) LIKE ? OR
        LOWER(COALESCE(admin_email, '')) LIKE ? OR
        LOWER(username) LIKE ?
      )`;
      const wild = `%${search}%`;
      params.push(wild, wild, wild, wild, wild, wild);
    }

    query += ` ORDER BY id DESC`;

    const [rows] = await db.query(query, params);

    return NextResponse.json({
      success: true,
      companies: rows,
      total: rows.length
    });
  } catch (error) {
    console.error('[API /admin/companies GET] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/companies
 * Add new company admin details, website url, username, password, etc.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      company_name,
      website_url,
      admin_url,
      admin_name,
      admin_email,
      admin_phone,
      username,
      password,
      platform = 'WordPress',
      status = 'Active',
      notes
    } = body;

    if (!company_name || !company_name.trim()) {
      return NextResponse.json({ success: false, message: 'Company name is required.' }, { status: 400 });
    }
    if (!username || !username.trim()) {
      return NextResponse.json({ success: false, message: 'Username is required.' }, { status: 400 });
    }
    if (!password || !password.trim()) {
      return NextResponse.json({ success: false, message: 'Password is required.' }, { status: 400 });
    }

    const cleanCompanyName = company_name.trim();
    const cleanWebsiteUrl = (website_url || '').trim();
    const cleanAdminUrl = (admin_url || '').trim() || (cleanWebsiteUrl ? (cleanWebsiteUrl.replace(/\/$/, '') + '/wp-admin') : null);
    const cleanAdminName = (admin_name || '').trim();
    const cleanAdminEmail = (admin_email || '').trim();
    const cleanAdminPhone = (admin_phone || '').trim();
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const cleanPlatform = (platform || 'WordPress').trim();
    const cleanStatus = (status || 'Active').trim();
    const cleanNotes = (notes || '').trim();

    const db = await getDbConnection();

    const [result] = await db.execute(
      `INSERT INTO company_credentials (
        company_name, website_url, admin_url, admin_name, admin_email, admin_phone,
        username, password, platform, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanCompanyName,
        cleanWebsiteUrl || null,
        cleanAdminUrl || null,
        cleanAdminName || null,
        cleanAdminEmail || null,
        cleanAdminPhone || null,
        cleanUsername,
        cleanPassword,
        cleanPlatform,
        cleanStatus,
        cleanNotes || null
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Company credentials for "${cleanCompanyName}" saved successfully!`,
      data: {
        id: result.insertId,
        company_name: cleanCompanyName,
        website_url: cleanWebsiteUrl,
        admin_url: cleanAdminUrl,
        admin_name: cleanAdminName,
        username: cleanUsername,
        platform: cleanPlatform,
        status: cleanStatus
      }
    });
  } catch (error) {
    console.error('[API /admin/companies POST] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/companies
 * Update existing company admin details, website url, username, password, etc.
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      id,
      company_name,
      website_url,
      admin_url,
      admin_name,
      admin_email,
      admin_phone,
      username,
      password,
      platform,
      status,
      notes
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID is required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    const updates = [];
    const params = [];

    if (company_name !== undefined) {
      updates.push('company_name = ?');
      params.push(company_name.trim());
    }
    if (website_url !== undefined) {
      updates.push('website_url = ?');
      params.push(website_url ? website_url.trim() : null);
    }
    if (admin_url !== undefined) {
      updates.push('admin_url = ?');
      params.push(admin_url ? admin_url.trim() : null);
    }
    if (admin_name !== undefined) {
      updates.push('admin_name = ?');
      params.push(admin_name ? admin_name.trim() : null);
    }
    if (admin_email !== undefined) {
      updates.push('admin_email = ?');
      params.push(admin_email ? admin_email.trim() : null);
    }
    if (admin_phone !== undefined) {
      updates.push('admin_phone = ?');
      params.push(admin_phone ? admin_phone.trim() : null);
    }
    if (username !== undefined) {
      updates.push('username = ?');
      params.push(username.trim());
    }
    if (password !== undefined) {
      updates.push('password = ?');
      params.push(password.trim());
    }
    if (platform !== undefined) {
      updates.push('platform = ?');
      params.push(platform.trim());
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status.trim());
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes ? notes.trim() : null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, message: 'No fields to update.' }, { status: 400 });
    }

    params.push(id);

    const [result] = await db.execute(
      `UPDATE company_credentials SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, message: 'Record not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Company credentials updated successfully!'
    });
  } catch (error) {
    console.error('[API /admin/companies PUT] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/companies
 * Delete company credentials
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID is required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    const [result] = await db.execute(`DELETE FROM company_credentials WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, message: 'Record not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Company credentials deleted successfully.'
    });
  } catch (error) {
    console.error('[API /admin/companies DELETE] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
