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
      await pool.query(
        `UPDATE client_payments SET status = ? WHERE id = ? AND status = 'PENDING'`,
        [finalState, txId]
      );
    }

    // Always acknowledge PhonePe webhooks
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('PhonePe V2 Webhook Error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
