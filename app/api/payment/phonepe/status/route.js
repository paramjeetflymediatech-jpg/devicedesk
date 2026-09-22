import { NextResponse } from 'next/server';
import { getDbConnection } from '../../../db/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tx = searchParams.get('tx');

    if (!tx) {
      return NextResponse.redirect(new URL('/portal/client/billing?status=error&tx=unknown', req.url));
    }

    const clientIdEnv = process.env.PHONEPE_CLIENT_ID || 'PUT_YOUR_V2_CLIENT_ID_HERE';
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET || 'PUT_YOUR_V2_CLIENT_SECRET_HERE';
    const clientVersion = process.env.PHONEPE_CLIENT_VERSION || '1';
    const env = process.env.PHONEPE_ENV || 'UAT';

    // 1. Get OAuth Token
    const tokenUrl = env === 'PROD'
      ? 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token';

    const tokenBody = new URLSearchParams({
      client_id: clientIdEnv,
      client_secret: clientSecret,
      client_version: clientVersion,
      grant_type: 'client_credentials'
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('PhonePe V2 Token Error in Status:', tokenData);
      return NextResponse.redirect(new URL(`/portal/client/billing?status=error&tx=${tx}`, req.url));
    }

    const accessToken = tokenData.access_token;

    // 2. Check Order Status
    const statusUrl = env === 'PROD'
      ? `https://api.phonepe.com/apis/pg/checkout/v2/order/${tx}/status`
      : `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/${tx}/status`;

    const statusResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `O-Bearer ${accessToken}`
      }
    });

    const statusData = await statusResponse.json();
    const finalState = statusData.state || 'FAILED';

    const pool = await getDbConnection();
    const [existing] = await pool.query(`SELECT * FROM client_payments WHERE id = ?`, [tx]);
    
    if (existing && existing.length > 0) {
      const payment = existing[0];
      
      // Update status if it's different
      if (payment.status !== finalState) {
        await pool.query(`UPDATE client_payments SET status = ? WHERE id = ?`, [finalState, tx]);
        
        // If it transitioned to COMPLETED and it's a package purchase, generate Paid invoice
        if (finalState === 'COMPLETED' && payment.description && payment.description.startsWith('PACKAGE_PURCHASE:')) {
          const packageId = payment.description.split(':')[1];
          const invoiceId = 'inv_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
          await pool.query(
            `INSERT INTO invoices (id, client_id, package_id, amount, status) VALUES (?, ?, ?, ?, 'Paid')`,
            [invoiceId, payment.client_id, packageId, payment.amount]
          );
        }
      }
    }

    let redirectStatus = 'error';
    if (finalState === 'COMPLETED') redirectStatus = 'SUCCESS';
    else if (finalState === 'FAILED') redirectStatus = 'FAILED';

    return NextResponse.redirect(new URL(`/portal/client/billing?status=${redirectStatus}&tx=${tx}`, req.url));

  } catch (error) {
    console.error('PhonePe Status Verification Error:', error);
    return NextResponse.redirect(new URL('/portal/client/billing?status=error&tx=unknown', req.url));
  }
}
