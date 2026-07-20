import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';

/**
 * POST /api/devices
 * Body: { userId, fcmToken, deviceId, deviceModel }
 * Action: Registers or updates a user's active device token.
 */
export async function POST(request) {
  try {
    const { userId, fcmToken, deviceId, deviceModel } = await request.json();

    if (!userId || !fcmToken || !deviceId) {
      return NextResponse.json({ error: 'userId, fcmToken, and deviceId are required.' }, { status: 400 });
    }

    const db = await getDbConnection();
    const entryId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const lastActive = new Date().toISOString();

    // Use INSERT ON DUPLICATE KEY UPDATE so both fcmToken and deviceId map to the current active user.
    await db.execute(
      `INSERT INTO user_devices (id, userId, fcmToken, deviceId, deviceModel, lastActive) 
       VALUES (?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE userId = VALUES(userId), fcmToken = VALUES(fcmToken), deviceId = VALUES(deviceId), deviceModel = VALUES(deviceModel), lastActive = VALUES(lastActive)`,
      [entryId, userId, fcmToken, deviceId, deviceModel || null, lastActive]
    );

    return NextResponse.json({ success: true, message: 'Device registered successfully.' });
  } catch (err) {
    console.error('Device registration API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/devices?fcmToken=...
 * Action: Removes the specified device token (used on logout).
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fcmToken = searchParams.get('fcmToken');

    if (!fcmToken) {
      return NextResponse.json({ error: 'fcmToken parameter is required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    await db.execute(
      `DELETE FROM user_devices WHERE fcmToken = ?`,
      [fcmToken]
    );

    return NextResponse.json({ success: true, message: 'Device token removed successfully.' });
  } catch (err) {
    console.error('Device removal API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
