import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getDbConnection } from '../db/db.js';

let isInitialized = false;

try {
  const apps = getApps();
  if (apps.length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    
    if (projectId && clientEmail && privateKey) {
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey
        })
      });
      isInitialized = true;
    } else if (serviceAccountBase64) {
      const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('ascii'));
      initializeApp({
        credential: cert(serviceAccount)
      });
      isInitialized = true;
    } else {
      console.warn('Firebase Admin: No credentials provided. Push notifications will run in mock mode.');
    }
  } else {
    isInitialized = true;
  }
} catch (e) {
  console.warn('Could not initialize Firebase Admin SDK. Push notifications will be mocked.', e.message);
}

/**
 * Send a push notification to all logged-in devices of Admin, Management, and Team Leader users.
 */
export async function sendPushNotificationToAdmins(title, body, data = {}) {
  try {
    const db = await getDbConnection();

    // 1. Fetch IDs of all admin/management/team leader employees
    const [adminRows] = await db.execute(
      `SELECT id FROM employees WHERE role IN ('Admin', 'Management', 'IT Engineer', 'Team Leader')`
    );

    const adminUserIds = new Set(['admin', 'Admin', 'emp1']);
    adminRows.forEach(row => {
      if (row.id) adminUserIds.add(row.id);
    });

    const targetUserIds = Array.from(adminUserIds);
    const placeholders = targetUserIds.map(() => '?').join(',');

    // 2. Fetch registered FCM tokens for these user IDs (no JOINs, no collation conflicts!)
    const [devices] = await db.execute(
      `SELECT DISTINCT fcmToken FROM user_devices WHERE userId IN (${placeholders})`,
      targetUserIds
    );

    if (devices.length === 0) {
      console.log(`Push notifications: No registered admin/management devices found.`);
      return { success: false, reason: 'No registered admin devices' };
    }

    const tokens = devices.map(d => d.fcmToken);

    if (!isInitialized) {
      console.log(`[MOCK PUSH ADMIN] Title: ${title} | Body: ${body}`);
      console.log(`[MOCK PUSH ADMIN] Sent to tokens:`, tokens);
      return { success: true, mocked: true, tokensCount: tokens.length };
    }

    const message = {
      notification: { title, body },
      data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {},
      tokens: tokens,
    };

    const messaging = getMessaging();
    const response = await messaging.sendEachForMulticast(message);

    console.log(`Push notifications (Admins): Sent successfully. Success: ${response.successCount}, Failures: ${response.failureCount}`);

    const badTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errCode = resp.error?.code;
        if (
          errCode === 'messaging/registration-token-not-registered' || 
          errCode === 'messaging/invalid-registration-token'
        ) {
          badTokens.push(tokens[idx]);
        }
      }
    });

    if (badTokens.length > 0) {
      const placeholders = badTokens.map(() => '?').join(',');
      await db.execute(
        `DELETE FROM user_devices WHERE fcmToken IN (${placeholders})`,
        badTokens
      );
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };

  } catch (err) {
    console.error('Error sending push notification to admins:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send a push notification to all logged-in devices of a specific user.
 * 
 * @param {string} userId - Recipient employee/admin ID (e.g. 'emp1')
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {object} data - Optional payload data key-value pairs
 */
export async function sendPushNotification(userId, title, body, data = {}) {
  try {
    const cleanUserId = String(userId || '').trim();
    if (!cleanUserId || ['admin', 'Admin', 'system', 'System'].includes(cleanUserId)) {
      return await sendPushNotificationToAdmins(title, body, data);
    }

    const db = await getDbConnection();
    
    // 1. Fetch all registered FCM tokens for this user
    const [devices] = await db.execute(
      'SELECT fcmToken FROM user_devices WHERE userId = ?',
      [cleanUserId]
    );

    if (devices.length === 0) {
      console.log(`Push notifications: No registered devices found for user ${userId}.`);
      return { success: false, reason: 'No registered devices' };
    }

    const tokens = devices.map(d => d.fcmToken);

    // 2. If Firebase Admin is not initialized, run in mock mode
    if (!isInitialized) {
      console.log(`[MOCK PUSH] User: ${userId} | Title: ${title} | Body: ${body}`);
      console.log(`[MOCK PUSH] Sent to tokens:`, tokens);
      return { success: true, mocked: true, tokensCount: tokens.length };
    }

    // 3. Format message payload
    const message = {
      notification: { title, body },
      data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {},
      tokens: tokens,
    };

    // 4. Send multicast message using modular getMessaging
    const messaging = getMessaging();
    const response = await messaging.sendEachForMulticast(message);
    
    console.log(`Push notifications: Sent successfully. Success: ${response.successCount}, Failures: ${response.failureCount}`);

    // 5. Clean up stale/invalid tokens reported by FCM
    const badTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errCode = resp.error?.code;
        if (
          errCode === 'messaging/registration-token-not-registered' || 
          errCode === 'messaging/invalid-registration-token'
        ) {
          badTokens.push(tokens[idx]);
        }
      }
    });

    if (badTokens.length > 0) {
      console.log(`Push notifications: Removing ${badTokens.length} stale tokens from DB...`);
      const placeholders = badTokens.map(() => '?').join(',');
      await db.execute(
        `DELETE FROM user_devices WHERE fcmToken IN (${placeholders})`,
        badTokens
      );
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };

  } catch (err) {
    console.error(`Error sending push notification to user ${userId}:`, err);
    return { success: false, error: err.message };
  }
}
