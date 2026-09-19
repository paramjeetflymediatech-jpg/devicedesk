import { NextResponse } from 'next/server';
import { getDbConnection } from '../../../db/db';

export async function POST(req) {
  try {
    const { amount, clientSlug, clientId, description } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 });
    }

    const clientIdEnv = process.env.PHONEPE_CLIENT_ID || 'PUT_YOUR_V2_CLIENT_ID_HERE';
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET || 'PUT_YOUR_V2_CLIENT_SECRET_HERE';
    const clientVersion = process.env.PHONEPE_CLIENT_VERSION || '1';
    const env = process.env.PHONEPE_ENV || 'UAT';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const merchantOrderId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Ensure client_payments table exists
    const pool = await getDbConnection();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_payments (
        id VARCHAR(100) PRIMARY KEY,
        client_slug VARCHAR(100) NOT NULL,
        client_id VARCHAR(100),
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Insert pending transaction
    await pool.query(
      `INSERT INTO client_payments (id, client_slug, client_id, amount, description, status) VALUES (?, ?, ?, ?, ?, 'PENDING')`,
      [merchantOrderId, clientSlug || 'unknown', clientId || null, amount, description || 'Client Billing']
    );

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
      console.error('PhonePe V2 Token Error:', tokenData);
      return NextResponse.json({ success: false, error: 'Failed to authenticate with PhonePe V2' }, { status: 500 });
    }

    const accessToken = tokenData.access_token;

    // 2. Initiate Payment (Standard Checkout V2)
    const payUrl = env === 'PROD'
      ? 'https://api.phonepe.com/apis/pg/checkout/v2/pay'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay';

    const payPayload = {
      merchantOrderId: merchantOrderId,
      amount: Math.round(amount * 100), // paise
      paymentFlow: {
        type: "PG_CHECKOUT",
        merchantUrls: {
          redirectUrl: `${baseUrl}/api/payment/phonepe/status?tx=${merchantOrderId}`
        }
      }
    };

    const payResponse = await fetch(payUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `O-Bearer ${accessToken}`
      },
      body: JSON.stringify(payPayload)
    });

    const payData = await payResponse.json();

    if (payResponse.ok && payData.redirectUrl) {
      return NextResponse.json({
        success: true,
        redirectUrl: payData.redirectUrl,
        transactionId: merchantOrderId
      });
    } else {
      console.error('PhonePe V2 Pay Error:', payData);
      return NextResponse.json({ success: false, error: payData.message || 'Payment initiation failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('PhonePe API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
