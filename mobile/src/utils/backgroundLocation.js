import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import { getApiUrl } from './api';

const { BackgroundLocationModule } = NativeModules;

/**
 * Request all required location permissions for Android including background & notifications.
 */
export async function requestBackgroundPermissions() {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    // 1. Request foreground fine location first
    const fineGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'DeviceDesk Location Access',
        message: 'DeviceDesk tracks your field trip route to accurately log distance and client visits.',
        buttonNeutral: 'Ask Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'Allow GPS',
      }
    );

    if (fineGranted !== PermissionsAndroid.RESULTS.GRANTED) {
      console.warn('Fine location permission denied');
      return false;
    }

    // 2. Request notification permission for Android 13+ (API 33+)
    if (Platform.Version >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
      try {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Live Tracking Notification',
            message: 'DeviceDesk displays an ongoing notification while field route tracking is active.',
            buttonPositive: 'OK',
          }
        );
      } catch (err) {
        console.warn('Notification permission request error (non-fatal):', err);
      }
    }

    // 3. Request background location permission for Android 10+ (API 29+)
    if (Platform.Version >= 29 && PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION) {
      try {
        const bgGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: 'Background Location Tracking',
            message: 'DeviceDesk needs "Allow all the time" location access so your route continues logging even when the app is minimized or closed.',
            buttonNeutral: 'Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow All The Time',
          }
        );
        console.log('Background location permission result:', bgGranted);
      } catch (err) {
        console.warn('Background location permission request error (non-fatal):', err);
      }
    }

    return true;
  } catch (err) {
    console.warn('Error requesting background location permissions:', err);
    return false;
  }
}

/**
 * Start continuous background GPS tracking service.
 */
export async function startBackgroundTracking({ employeeId, attendanceId }) {
  if (!employeeId || !attendanceId) {
    console.warn('Cannot start background tracking without employeeId and attendanceId');
    return false;
  }

  if (BackgroundLocationModule?.startTracking) {
    try {
      if (Platform.OS === 'android') {
        await requestBackgroundPermissions();
      }
      const apiUrl = getApiUrl();
      const success = await BackgroundLocationModule.startTracking(
        String(employeeId),
        String(attendanceId),
        apiUrl
      );
      console.log('Background tracking service started successfully:', { employeeId, attendanceId, platform: Platform.OS, success });
      return success;
    } catch (err) {
      console.error('Failed to start native background tracking service:', err);
      return false;
    }
  }

  return false;
}

/**
 * Stop continuous background GPS tracking service.
 */
export async function stopBackgroundTracking() {
  if (BackgroundLocationModule?.stopTracking) {
    try {
      const success = await BackgroundLocationModule.stopTracking();
      console.log('Background tracking service stopped successfully');
      return success;
    } catch (err) {
      console.error('Failed to stop native background tracking service:', err);
      return false;
    }
  }
  return true;
}

/**
 * Update the active attendance ID in the background service.
 */
export async function updateBackgroundTrip(attendanceId) {
  if (BackgroundLocationModule?.updateTrip) {
    try {
      return await BackgroundLocationModule.updateTrip(String(attendanceId));
    } catch (err) {
      console.warn('Failed to update background trip attendance ID:', err);
    }
  }
  return false;
}

/**
 * Check if the background service is currently active.
 */
export async function isBackgroundTrackingActive() {
  if (BackgroundLocationModule?.isTracking) {
    try {
      return await BackgroundLocationModule.isTracking();
    } catch (err) {
      console.warn('Failed to check if background tracking is active:', err);
    }
  }
  return false;
}
