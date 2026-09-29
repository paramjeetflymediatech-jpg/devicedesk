import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';

export async function POST(req) {
  try {
    const { notificationId, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const db = await getDbConnection();

    if (notificationId) {
      await db.execute(
        'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
        [notificationId, userId]
      );
    } else {
      // Mark all as read
      await db.execute(
        'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
        [userId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
