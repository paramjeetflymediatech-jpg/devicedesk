import { NextResponse } from 'next/server';
import { getDbConnection } from '../../../db/db';

export async function POST(req) {
  try {
    const rawBody = await req.text();
    let data;
    try {
      data = JSON.parse(rawBody);
    } catch (e) {
      console.error('PhonePe V2 Webhook JSON parse error', e);
      return NextResponse.json({ success: false }, { status: 400 });
    }

    console.log('PhonePe V2 Webhook Received:', JSON.stringify(data, null, 2));

    // Try to extract transaction ID. In V2, it might be inside `payload` or root.
    let txId = null;
    let finalState = 'PENDING';

    if (data.payload && data.payload.merchantOrderId) {
      txId = data.payload.merchantOrderId;
      finalState = data.payload.state || data.state;
    } else if (data.merchantOrderId) {
      txId = data.merchantOrderId;
      finalState = data.state;
    } else if (data.response) {
      // V1 fallback decode just in case
      try {
        const decoded = JSON.parse(Buffer.from(data.response, 'base64').toString('utf-8'));
        txId = decoded.data.merchantTransactionId;
        finalState = decoded.data.state;
      } catch (e) {
        // ignore
      }
    }

    if (txId && finalState) {
      const pool = await getDbConnection();
      const [existing] = await pool.query(`SELECT * FROM client_payments WHERE id = ?`, [txId]);
      
      if (existing && existing.length > 0) {
        const payment = existing[0];
        
        if (payment.status === 'PENDING') {
          await pool.query(`UPDATE client_payments SET status = ? WHERE id = ?`, [finalState, txId]);
          
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
    }

    // Always acknowledge PhonePe webhooks
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('PhonePe V2 Webhook Error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
