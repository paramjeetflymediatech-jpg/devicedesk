import { NextResponse } from 'next/server';
import { getDbConnection, getPool } from '../db/db.js';

export async function POST(request) {
  try {
    await getDbConnection();
    const db = getPool();

    const { domains: incoming } = await request.json();

    if (!Array.isArray(incoming) || incoming.length === 0) {
      return NextResponse.json({ error: 'No domain records provided.' }, { status: 400 });
    }

    // Fetch existing domains for duplicate check (by cleaned domain_name)
    const [existing] = await db.execute('SELECT domain_name FROM domains');
    const existingDomains = new Set(
      existing.map(d => (d.domain_name || '').trim().toLowerCase())
    );

    const imported = [];
    const duplicates = [];
    const errors = [];

    // Helper to format date strings or Excel serial numbers into YYYY-MM-DD
    const parseDateValue = (raw) => {
      if (!raw) return null;
      if (typeof raw === 'number') {
        // Excel serial date to JS Date
        const jsDate = new Date(Math.round((raw - 25569) * 86400 * 1000));
        if (!isNaN(jsDate.getTime())) {
          return jsDate.toISOString().split('T')[0];
        }
      }
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
      return null;
    };

    for (const row of incoming) {
      const rawDomain = (
        row.domain_name || 
        row['Domain Name'] || 
        row['domain'] || 
        row['Domain'] || 
        row['Website'] || 
        row['url'] || 
        ''
      ).toString().trim();

      if (!rawDomain) {
        errors.push({ reason: 'Missing Domain Name in row' });
        continue;
      }

      // Clean domain name: remove https://, http://, www., trailing paths
      const cleanDomain = rawDomain
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .trim();

      if (existingDomains.has(cleanDomain)) {
        duplicates.push(cleanDomain);
        continue;
      }

      const clientName = (
        row.client_name || 
        row['Client Name'] || 
        row['Client'] || 
        row['Owner'] || 
        ''
      ).toString().trim() || null;

      const clientEmail = (
        row.client_email || 
        row['Client Email'] || 
        row['Email'] || 
        ''
      ).toString().trim() || null;

      const registrar = (
        row.registrar || 
        row['Registrar'] || 
        row['Provider'] || 
        'GoDaddy'
      ).toString().trim();

      const regDateRaw = row.registration_date || row['Registration Date'] || row['Registered On'] || null;
      const regDate = parseDateValue(regDateRaw);

      const expDateRaw = (
        row.expiry_date || 
        row['Expiry Date'] || 
        row['Expiration Date'] || 
        row['Expires On'] || 
        ''
      );
      
      let expDate = parseDateValue(expDateRaw);
      if (!expDate) {
        // Default to 1 year from now if missing
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        expDate = oneYearFromNow.toISOString().split('T')[0];
      }

      const autoRenewRaw = row.auto_renew !== undefined ? row.auto_renew : row['Auto Renew'] || row['Auto-Renew'];
      const autoRenew = Boolean(
        autoRenewRaw === true || 
        autoRenewRaw === 1 || 
        autoRenewRaw === '1' || 
        String(autoRenewRaw).toLowerCase() === 'yes' || 
        String(autoRenewRaw).toLowerCase() === 'true'
      );

      const rawCost = (row.renewal_cost || row['Renewal Cost'] || row['Cost'] || row['Price'] || '15.99')
        .toString()
        .replace(/[^0-9.]/g, '');
      const renewalCost = parseFloat(rawCost) || 15.99;

      const cardDetails = (
        row.card_details || 
        row['Card Details'] || 
        row['Payment Card'] || 
        row['Card'] || 
        ''
      ).toString().trim() || null;

      const notes = (
        row.notes || 
        row['Notes'] || 
        row['Remarks'] || 
        ''
      ).toString().trim() || null;

      const status = (
        row.status || 
        row['Status'] || 
        'Active'
      ).toString().trim();

      const domainId = 'dom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

      await db.execute(
        `INSERT INTO domains (id, domain_name, client_name, client_email, registrar, registration_date, expiry_date, auto_renew, renewal_cost, card_details, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          domainId,
          cleanDomain,
          clientName,
          clientEmail,
          registrar,
          regDate,
          expDate,
          autoRenew ? 1 : 0,
          renewalCost,
          cardDetails,
          notes,
          status
        ]
      );

      // Track duplicate within current batch
      existingDomains.add(cleanDomain);
      imported.push({ id: domainId, domain_name: cleanDomain, client_name: clientName, expiry_date: expDate });
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      duplicates,
      errors
    });
  } catch (err) {
    console.error('Bulk domain import error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
