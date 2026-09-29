import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req) {
  try {
    const { userId, subscription } = await req.json();

    if (!userId || !subscription) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Check if subscription already exists for this endpoint
    const [existing] = await db.execute(
      'SELECT id FROM push_subscriptions WHERE endpoint = ?',
      [subscription.endpoint]
    );

    if (existing.length === 0) {
      await db.execute(
        `INSERT INTO push_subscriptions (id, user_id, endpoint, keys_p256dh, keys_auth) VALUES (?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          userId,
          subscription.endpoint,
          subscription.keys.p256dh,
          subscription.keys.auth
        ]
      );
    } else {
      // Update user_id if it changed
      await db.execute(
        'UPDATE push_subscriptions SET user_id = ? WHERE endpoint = ?',
        [userId, subscription.endpoint]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving subscription:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
