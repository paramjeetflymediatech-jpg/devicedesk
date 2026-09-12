import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';

export async function GET(request) {
  try {
    const db = await getDbConnection();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('status') || 'ALL';

    let query = `SELECT * FROM domains WHERE 1=1`;
    let params = [];

    if (search.trim()) {
      query += ` AND (domain_name LIKE ? OR client_name LIKE ? OR client_email LIKE ? OR registrar LIKE ?)`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    query += ` ORDER BY expiry_date ASC`;

    const [rows] = await db.query(query, params);

    // Calculate days remaining and update status dynamically
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const domains = rows.map((d) => {
      let daysLeft = null;
      let computedStatus = d.status || 'Active';

      if (d.expiry_date) {
        const exp = new Date(d.expiry_date);
        exp.setHours(0, 0, 0, 0);
        const diffTime = exp.getTime() - now.getTime();
        daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) {
          computedStatus = 'Expired';
        } else if (daysLeft <= 30) {
          computedStatus = 'Expiring Soon';
        } else {
          computedStatus = 'Active';
        }
      }

      return {
        ...d,
        days_left: daysLeft,
        status: computedStatus
      };
    });

    // Optional status filtering
    let filteredDomains = domains;
    if (filter !== 'ALL') {
      filteredDomains = domains.filter((d) => d.status.toLowerCase() === filter.toLowerCase());
    }

    // Aggregate summary metrics
    const totalCount = domains.length;
    const activeCount = domains.filter((d) => d.status === 'Active').length;
    const expiringSoonCount = domains.filter((d) => d.status === 'Expiring Soon').length;
    const expiredCount = domains.filter((d) => d.status === 'Expired').length;
    const totalRenewalCost = domains.reduce((acc, curr) => acc + Number(curr.renewal_cost || 0), 0);

    return NextResponse.json({
      success: true,
      data: filteredDomains,
      summary: {
        total: totalCount,
        active: activeCount,
        expiring_soon: expiringSoonCount,
        expired: expiredCount,
        total_renewal_cost: totalRenewalCost
      }
    });
  } catch (err) {
    console.error('Domains GET API Error:', err);
    return NextResponse.json({ success: false, error: err.message, data: [], summary: {} }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      domain_name,
      client_id,
      client_name,
      client_email,
      registrar,
      registration_date,
      expiry_date,
      auto_renew,
      renewal_cost,
      card_details,
      notes
    } = body;

    if (!domain_name || !expiry_date) {
      return NextResponse.json({ error: 'domain_name and expiry_date are required fields.' }, { status: 400 });
    }

    const cleanDomain = domain_name.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const db = await getDbConnection();

    // Check duplicate
    const [existing] = await db.query('SELECT id FROM domains WHERE domain_name = ?', [cleanDomain]);
    if (existing.length > 0) {
      return NextResponse.json({ error: `Domain \"${cleanDomain}\" already exists in the registry.` }, { status: 409 });
    }

    const id = 'dom_' + Date.now();

    await db.execute(
      `INSERT INTO domains (id, domain_name, client_id, client_name, client_email, registrar, registration_date, expiry_date, auto_renew, renewal_cost, card_details, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        cleanDomain,
        client_id || null,
        client_name || null,
        client_email || null,
        registrar || 'GoDaddy',
        registration_date || null,
        expiry_date,
        auto_renew ? 1 : 0,
        renewal_cost || 0,
        card_details || null,
        notes || null
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Domain registered successfully.',
      domain: { id, domain_name: cleanDomain, expiry_date }
    });
  } catch (err) {
    console.error('Domain Create API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
