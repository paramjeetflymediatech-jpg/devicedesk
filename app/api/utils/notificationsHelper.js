import webpush from 'web-push';
import { v4 as uuidv4 } from 'uuid';
import { getDbConnection } from '../db/db.js';

// Configure Web Push with VAPID keys
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:support@devicedesk.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Sends a notification (In-app + Web Push)
 * @param {string} userId - User ID to send notification to
 * @param {string} title - Notification Title
 * @param {string} message - Notification Message
 * @param {string} link - URL to redirect to when clicked
 */
export async function sendNotification(userId, title, message, link = '/') {
  try {
    const db = await getDbConnection();
    const notificationId = uuidv4();

    // 1. Save to DB
    await db.execute(
      `INSERT INTO notifications (id, user_id, title, message, link) VALUES (?, ?, ?, ?, ?)`,
      [notificationId, userId, title, message, link]
    );

    // 2. Send Web Push
    try {
      const [subs] = await db.execute('SELECT * FROM push_subscriptions WHERE user_id = ?', [userId]);
      const payload = JSON.stringify({
        title,
        body: message,
        url: link,
      });

      for (const sub of subs) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth
          }
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
        } catch (pushErr) {
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            // Subscription expired or invalid, remove from DB
            await db.execute('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
          } else {
            console.error('Error sending web push:', pushErr);
          }
        }
      }
    } catch (err) {
      console.error('Failed to process web push subscriptions:', err);
    }

    // 3. Trigger in-app popup instantly via socket
    try {
      const { io } = require('socket.io-client');
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');
      socket.emit('send-notification', {
        id: notificationId,
        userId: userId,
        title,
        message,
        link,
        created_at: new Date().toISOString(),
        is_read: 0
      });
      // Close socket after emitting
      setTimeout(() => socket.disconnect(), 1000);
    } catch (err) {
      console.error('Failed to emit socket notification:', err);
    }

    return { success: true, notificationId };
  } catch (err) {
    console.error('Error in sendNotification:', err);
    return { success: false, error: err.message };
  }
}
