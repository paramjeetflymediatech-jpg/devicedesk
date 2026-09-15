import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_URL_KEY = 'devicedesk_api_url';

// Default URLs: 10.0.2.2 for Android Emulator, localhost for iOS simulator
//const DEFAULT_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
const DEFAULT_URL = 'https://devicedesk.flymediatech.com';

let currentApiUrl = DEFAULT_URL;

export async function initApiUrl() {
  try {
    currentApiUrl = DEFAULT_URL;
    await AsyncStorage.setItem(API_URL_KEY, DEFAULT_URL);
  } catch (err) {
    console.error('Failed to init API url:', err);
  }
  return currentApiUrl;
}

export function getApiUrl() {
  return currentApiUrl;
}

export async function setApiUrl(url) {
  try {
    let cleanUrl = url.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    currentApiUrl = cleanUrl;
    await AsyncStorage.setItem(API_URL_KEY, cleanUrl);
    return true;
  } catch (err) {
    console.error('Failed to set API url:', err);
    return false;
  }
}

export async function fetchFromDb() {
  const url = `${currentApiUrl}/api/db`;
  try {
    const headers = {
      'Accept': 'application/json',
    };
    try {
      const storedUser = await AsyncStorage.getItem('@currentUser');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.id) {
          headers['x-user-id'] = parsed.id;
        }
      }
    } catch (e) {}

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`Fetch from database failed at ${url}:`, err);
    throw err;
  }
}

export async function postToDb(action, data) {
  const url = `${currentApiUrl}/api/db`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ action, data }),
    });
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`Post action ${action} to database failed at ${url}:`, err);
    throw err;
  }
}

export async function getOrCreateDeviceId() {
  try {
    let deviceId = await AsyncStorage.getItem('devicedesk_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      await AsyncStorage.setItem('devicedesk_device_id', deviceId);
    }
    return deviceId;
  } catch (err) {
    console.error('Failed to get/create deviceId:', err);
    return 'dev_fallback_' + Date.now();
  }
}

export async function registerDeviceToken(userId, fcmToken, deviceId, deviceModel) {
  const url = `${currentApiUrl}/api/devices`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ userId, fcmToken, deviceId, deviceModel }),
    });
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`Register device token failed at ${url}:`, err);
    throw err;
  }
}

export async function deregisterDeviceToken(fcmToken, deviceId) {
  const params = [];
  if (fcmToken) params.push(`fcmToken=${encodeURIComponent(fcmToken)}`);
  if (deviceId) params.push(`deviceId=${encodeURIComponent(deviceId)}`);

  const url = `${currentApiUrl}/api/devices?${params.join('&')}`;
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`Deregister device token failed at ${url}:`, err);
    throw err;
  }
}

export async function requestForgotPasswordLink(email) {
  const url = `${currentApiUrl}/api/forgot-password`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP Error ${response.status}`);
    }
    return data;
  } catch (err) {
    console.error(`Request forgot password failed at ${url}:`, err);
    throw err;
  }
}

export async function fetchAttendanceStatus(employeeId) {
  const url = `${currentApiUrl}/api/attendance/status?employeeId=${encodeURIComponent(employeeId)}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`Fetch attendance status failed at ${url}:`, err);
    throw err;
  }
}

export async function fetchAttendanceRecords(employeeId, month, status = 'ALL', date = null, startDate = null, endDate = null) {
  let url = `${currentApiUrl}/api/attendance/list?status=${encodeURIComponent(status)}`;
  if (date) {
    url += `&date=${encodeURIComponent(date)}`;
  } else if (startDate && endDate) {
    url += `&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
  } else if (month) {
    url += `&month=${encodeURIComponent(month)}`;
  }
  if (employeeId) {
    url += `&employeeId=${encodeURIComponent(employeeId)}`;
  }
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`Fetch attendance records failed at ${url}:`, err);
    throw err;
  }
}

export async function postAttendancePunch(employeeId, employeeName, action, breakType = '', remarks = '', latitude = null, longitude = null) {
  const url = `${currentApiUrl}/api/attendance/punch`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        employeeId,
        employeeName,
        action,
        breakType,
        remarks,
        latitude,
        longitude,
      }),
    });
    const data = await response.json();
    return data;
  } catch (err) {
    console.error(`Post attendance punch failed at ${url}:`, err);
    throw err;
  }
}

export async function applyLeaveRequest({ employeeId, employeeName, leaveType, fromDate, toDate, reason }) {
  const url = `${currentApiUrl}/api/leave/apply`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        employeeId,
        employeeName,
        leaveType,
        fromDate,
        toDate,
        reason,
      }),
    });
    const data = await response.json();
    return data;
  } catch (err) {
    console.error(`Apply leave request failed at ${url}:`, err);
    throw err;
  }
}

export async function fetchEmployeeLeaves(employeeId, status = 'ALL') {
  const url = `${currentApiUrl}/api/leave/list?employeeId=${encodeURIComponent(employeeId)}&status=${encodeURIComponent(status)}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.error(`Fetch employee leaves failed at ${url}:`, err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Marketing Field Trips & GPS Attendance APIs
// ---------------------------------------------------------------------------

async function getAuthHeaders() {
  const headers = { 'Accept': 'application/json' };
  try {
    const storedUser = await AsyncStorage.getItem('@currentUser');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      if (parsed?.id) {
        headers['x-user-id'] = parsed.id;
      }
    }
  } catch (e) {}
  return headers;
}

export async function fetchMarketingAttendance(employeeId) {
  const url = employeeId 
    ? `${currentApiUrl}/api/marketing/attendance?employee_id=${encodeURIComponent(employeeId)}`
    : `${currentApiUrl}/api/marketing/attendance`;
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`Fetch marketing attendance failed at ${url}:`, err);
    throw err;
  }
}

export async function checkInMarketingTrip({ employee_id, from_location, to_location, notes, latitude, longitude }) {
  const url = `${currentApiUrl}/api/marketing/attendance`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        employee_id,
        action: 'check_in',
        from_location,
        to_location,
        notes,
        latitude,
        longitude,
      }),
    });
    return await response.json();
  } catch (err) {
    console.error(`Marketing trip check-in failed at ${url}:`, err);
    throw err;
  }
}

export async function checkOutMarketingTrip({ employee_id, attendance_id, latitude, longitude, total_km }) {
  const url = `${currentApiUrl}/api/marketing/attendance`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        employee_id,
        action: 'check_out',
        attendance_id,
        latitude,
        longitude,
        total_km: total_km || 0,
      }),
    });
    return await response.json();
  } catch (err) {
    console.error(`Marketing trip check-out failed at ${url}:`, err);
    throw err;
  }
}

export async function fetchMarketingAuthorizations() {
  const url = `${currentApiUrl}/api/marketing/authorizations`;
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`Fetch marketing authorizations failed at ${url}:`, err);
    throw err;
  }
}

export async function postMarketingLocationLog({ employee_id, attendance_id, latitude, longitude, accuracy }) {
  const url = `${currentApiUrl}/api/marketing/location`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        employee_id,
        attendance_id,
        latitude,
        longitude,
        accuracy: accuracy || null,
      }),
    });
    return await response.json();
  } catch (err) {
    console.error(`Post marketing location log failed at ${url}:`, err);
    throw err;
  }
}

export async function fetchMarketingLocationLogs(attendance_id, employee_id) {
  let url = `${currentApiUrl}/api/marketing/location`;
  if (attendance_id) {
    url += `?attendance_id=${encodeURIComponent(attendance_id)}`;
  } else if (employee_id) {
    url += `?employee_id=${encodeURIComponent(employee_id)}`;
  }

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`Fetch marketing location logs failed at ${url}:`, err);
    throw err;
  }
}



