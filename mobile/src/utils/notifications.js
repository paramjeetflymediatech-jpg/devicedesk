import { Alert } from 'react-native';

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
 * Request permission for iOS devices and log FCM token
 */
export async function requestUserPermission() {
  if (!isFirebaseReady()) {
    console.warn('Firebase Push Notifications: Default app is not initialized. Please add google-services.json to android/app/.');
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

/**
 * Main initializer for Firebase Push Notifications setup
 */
export async function setupPushNotifications() {
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
      Alert.alert(
        remoteMessage.notification?.title || 'New Notification',
        remoteMessage.notification?.body || 'You have new information regarding your devices.'
      );
    });

    // 3. Handle when app is in background but still running, and user clicks notification
    messagingInstance.onNotificationOpenedApp(remoteMessage => {
      console.log('App opened from background by clicking notification:', remoteMessage);
    });

    // 4. Handle when app was completely closed/terminated, and user clicks notification to open it
    messagingInstance
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('App opened from terminated state by clicking notification:', remoteMessage);
        }
      });
  } catch (err) {
    console.error('Failed to configure push notification listeners:', err);
  }
}
