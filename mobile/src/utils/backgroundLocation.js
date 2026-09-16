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
    // 1. Request foreground fine location and coarse location together (required on Android 12+)
    const permissionsToRequest = [
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ];

    if (Platform.Version >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
      permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    const result = await PermissionsAndroid.requestMultiple(permissionsToRequest);
    const fineGranted = result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
    const coarseGranted = result[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

    if (!fineGranted && !coarseGranted) {
      console.warn('Location permissions denied');
      return false;
    }

    // 2. Request background location permission separately for Android 10+ (API 29+)
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
