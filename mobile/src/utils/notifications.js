import { Alert, Platform, PermissionsAndroid } from 'react-native';
import { playTicketSound } from './sound';

let getApps = null;
let getMessaging = null;
let AuthorizationStatus = null;

try {
  // Dynamically load firebase app and messaging modules
  const firebaseApp = require('@react-native-firebase/app');
  const firebaseMessaging = require('@react-native-firebase/messaging');
  
  getApps = firebaseApp.getApps;
  getMessaging = firebaseMessaging.getMessaging;
  AuthorizationStatus = firebaseMessaging.AuthorizationStatus;
} catch (e) {
  console.warn('Firebase libraries are not linked or available.');
}

/**
 * Check if Firebase default app is successfully initialized by native configuration
 */
function isFirebaseReady() {
  if (!getApps || !getMessaging) return false;
  try {
    const apps = getApps();
    return apps && apps.length > 0;
  } catch (e) {
    return false;
  }
}

/**
 * Request notification permission for Android 13+ and iOS devices, then retrieve FCM token
 */
export async function requestUserPermission() {
  // 1. Android 13+ (API 33+) explicit POST_NOTIFICATIONS permission prompt
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Android 13+ notification permission granted.');
      } else {
        console.warn('Android 13+ notification permission denied by user.');
      }
    } catch (androidErr) {
      console.warn('Error requesting Android notification permission:', androidErr);
    }
  }

  // 2. iOS & Firebase messaging permission prompt
  if (!isFirebaseReady()) {
    console.warn(
      Platform.OS === 'ios'
        ? 'Firebase Push Notifications: Missing GoogleService-Info.plist in ios/DeviceDeskMobile. Add it in Xcode to enable iOS notifications.'
        : 'Firebase Push Notifications: Default app is not initialized. Please check google-services.json in android/app/.'
    );
    return null;
  }

  try {
    const messagingInstance = getMessaging();
    const authStatus = await messagingInstance.requestPermission();
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Push notification authorization status:', authStatus);
      return await getFcmToken();
    } else {
      console.warn('FCM Push notification permission denied or dismissed by user.');
    }
  } catch (error) {
    console.error('Error requesting push permission:', error);
  }
  return null;
}

/**
 * Retrieve the unique Firebase Cloud Messaging token for this device
 */
export async function getFcmToken() {
  if (!isFirebaseReady()) return null;

  try {
    const messagingInstance = getMessaging();
    const fcmToken = await messagingInstance.getToken();
    if (fcmToken) {
      console.log('-----------------------------');
      console.log('DEVICE FCM TOKEN (PUSH KEYS):');
      console.log(fcmToken);
      console.log('-----------------------------');
      return fcmToken;
    }
  } catch (error) {
    console.error('Error retrieving FCM token:', error);
  }
  return null;
}

let notificationHandler = null;

/**
 * Register a global listener for when a user taps a push notification
 */
export function onNotificationOpened(callback) {
  notificationHandler = callback;
}

/**
 * Main initializer for Firebase Push Notifications setup
 */
export async function setupPushNotifications(onNotificationClick) {
  if (onNotificationClick) {
    notificationHandler = onNotificationClick;
  }

  if (!isFirebaseReady()) {
    console.log('Push notifications: Firebase default app not initialized. Skipping listener configuration.');
    return;
  }

  try {
    const messagingInstance = getMessaging();

    // 1. Request permission and get device token
    await requestUserPermission();

    // 2. Handle foreground messages (when user is active inside the app)
    messagingInstance.onMessage(async remoteMessage => {
      console.log('A new FCM message arrived in foreground:', remoteMessage);
      
      const type = remoteMessage.data?.type || 'notification';
      playTicketSound(type);

      const title = remoteMessage.notification?.title || 'New Notification';
      const body = remoteMessage.notification?.body || '';
      const richImageUrl = remoteMessage.notification?.imageUrl || remoteMessage.data?.imageUrl || remoteMessage.data?.image || null;

      // In foreground, if user is already chatting in that room, don't interrupt with an alert
      if (type === 'chat' && remoteMessage.data?.chatId) {
        // Subtle sound already played
        return;
      }

      Alert.alert(
        title,
        body + (richImageUrl ? '\n[📷 Image Attached]' : ''),
        [
          { text: 'Dismiss', style: 'cancel' },
          ...(remoteMessage.data && Object.keys(remoteMessage.data).length > 0
            ? [{
                text: 'View',
                onPress: () => {
                  if (notificationHandler) {
                    notificationHandler(remoteMessage.data);
                  }
                },
              }]
            : [])
        ]
      );
    });

    // 3. Handle when app is in background but still running, and user clicks notification
    messagingInstance.onNotificationOpenedApp(remoteMessage => {
      console.log('App opened from background by clicking notification:', remoteMessage);
      if (remoteMessage?.data && notificationHandler) {
        notificationHandler(remoteMessage.data);
      }
    });

    // 4. Handle when app was completely closed/terminated, and user clicks notification to open it
    messagingInstance
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('App opened from terminated state by clicking notification:', remoteMessage);
          if (remoteMessage?.data && notificationHandler) {
            notificationHandler(remoteMessage.data);
          }
        }
      });
  } catch (err) {
    console.error('Failed to configure push notification listeners:', err);
  }
}
