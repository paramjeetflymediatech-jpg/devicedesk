import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_URL_KEY = 'devicedesk_api_url';

// Default URLs: 10.0.2.2 for Android Emulator, localhost for iOS simulator
// const DEFAULT_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
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

export async function checkInMarketingTrip({ employee_id, from_location, to_location, notes, latitude, longitude, dest_latitude, dest_longitude, estimated_km, device_id }) {
  const url = `${currentApiUrl}/api/marketing/attendance`;
  try {
    const devId = device_id || await getOrCreateDeviceId();
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
        dest_latitude: dest_latitude || null,
        dest_longitude: dest_longitude || null,
        estimated_km: estimated_km || 0,
        device_id: devId,
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

export async function postCandidateRegistration(data) {
  const url = `${currentApiUrl}/api/candidates/register`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (err) {
    console.error(`Post candidate registration failed at ${url}:`, err);
    throw err;
  }
}

export async function uploadCandidateFile(formData) {
  const url = `${currentApiUrl}/api/candidates/upload`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      body: formData,
    });
    return await response.json();
  } catch (err) {
    console.error(`Upload candidate file failed at ${url}:`, err);
    throw err;
  }
}

export async function fetchCandidateTest(candidateId) {
  const url = `${currentApiUrl}/api/candidates/me?candidateId=${encodeURIComponent(candidateId)}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    return await response.json();
  } catch (err) {
    console.error(`Fetch candidate test failed at ${url}:`, err);
    throw err;
  }
}

export async function submitCandidateTest(testId, candidateId, candidateAnswers) {
  const url = `${currentApiUrl}/api/candidates/submit-test`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ testId, candidateId, candidateAnswers })
    });
    return await response.json();
  } catch (err) {
    console.error(`Submit candidate test failed at ${url}:`, err);
    throw err;
  }
}

// Domain & DNS API Helpers
export async function fetchDomainsApi(search = '', status = 'ALL') {
  const params = new URLSearchParams();
  if (search.trim()) params.append('search', search.trim());
  if (status && status !== 'ALL') params.append('status', status);
  const url = `${currentApiUrl}/api/domains?${params.toString()}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return await response.json();
  } catch (err) {
    console.error(`Fetch domains failed at ${url}:`, err);
    throw err;
  }
}

export async function createDomainApi(domainData) {
  const url = `${currentApiUrl}/api/domains`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(domainData)
    });
    return await response.json();
  } catch (err) {
    console.error(`Create domain failed at ${url}:`, err);
    throw err;
  }
}

export async function updateDomainApi(id, domainData) {
  const url = `${currentApiUrl}/api/domains/${encodeURIComponent(id)}`;
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(domainData)
    });
    return await response.json();
  } catch (err) {
    console.error(`Update domain failed at ${url}:`, err);
    throw err;
  }
}

export async function deleteDomainApi(id) {
  const url = `${currentApiUrl}/api/domains/${encodeURIComponent(id)}`;
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' }
    });
    return await response.json();
  } catch (err) {
    console.error(`Delete domain failed at ${url}:`, err);
    throw err;
  }
}

export async function triggerDomainExpiryCheckApi() {
  const url = `${currentApiUrl}/api/domains/check-expiry`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Accept': 'application/json' }
    });
    return await response.json();
  } catch (err) {
    console.error(`Trigger domain expiry check failed at ${url}:`, err);
    throw err;
  }
}

// Candidates Pool & HR Screening API Helpers
export async function fetchCandidatesPoolApi() {
  const url = `${currentApiUrl}/api/candidates-pool`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return await response.json();
  } catch (err) {
    console.error(`Fetch candidates pool failed at ${url}:`, err);
    throw err;
  }
}

export async function addCandidatePoolApi(candidateData) {
  const url = `${currentApiUrl}/api/candidates-pool`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(candidateData)
    });
    return await response.json();
  } catch (err) {
    console.error(`Add candidate pool failed at ${url}:`, err);
    throw err;
  }
}

export async function updateCandidatePoolApi(id, status, feedback) {
  const url = `${currentApiUrl}/api/candidates-pool`;
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, status, feedback })
    });
    return await response.json();
  } catch (err) {
    console.error(`Update candidate pool failed at ${url}:`, err);
    throw err;
  }
}

export async function fetchCandidatesListApi() {
  const url = `${currentApiUrl}/api/candidates/list`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return await response.json();
  } catch (err) {
    console.error(`Fetch candidates list failed at ${url}:`, err);
    throw err;
  }
}

export async function evaluateCandidateTestApi(testId, status) {
  const url = `${currentApiUrl}/api/candidates/evaluate-test`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test_id: testId, status })
    });
    return await response.json();
  } catch (err) {
    console.error(`Evaluate candidate test failed at ${url}:`, err);
    throw err;
  }
}

// ==========================================
// Work Submissions & EOD Reports APIs
// ==========================================

export async function fetchWorkSubmissionsApi(params = {}) {
  let queryString = '';
  const queryParts = [];
  if (params.projectId) queryParts.push(`project_id=${encodeURIComponent(params.projectId)}`);
  if (params.taskId) queryParts.push(`task_id=${encodeURIComponent(params.taskId)}`);
  if (queryParts.length > 0) queryString = `?${queryParts.join('&')}`;

  const url = `${currentApiUrl}/api/work-submissions${queryString}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return await response.json();
  } catch (err) {
    console.error(`Fetch work submissions failed at ${url}:`, err);
    throw err;
  }
}

export async function createWorkSubmissionApi(data) {
  const url = `${currentApiUrl}/api/work-submissions`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    console.error(`Create work submission failed at ${url}:`, err);
    throw err;
  }
}

export async function updateWorkSubmissionApi(id, data) {
  const url = `${currentApiUrl}/api/work-submissions/${id}`;
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    console.error(`Update work submission failed at ${url}:`, err);
    throw err;
  }
}

export async function fetchEodReportsApi(employeeId = null, todayOnly = false) {
  let queryString = '';
  const queryParts = [];
  if (employeeId) queryParts.push(`employeeId=${encodeURIComponent(employeeId)}`);
  if (todayOnly) queryParts.push(`today=true`);
  if (queryParts.length > 0) queryString = `?${queryParts.join('&')}`;

  const url = `${currentApiUrl}/api/eod-reports${queryString}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return await response.json();
  } catch (err) {
    console.error(`Fetch EOD reports failed at ${url}:`, err);
    throw err;
  }
}

export async function submitEodReportApi(data) {
  const url = `${currentApiUrl}/api/eod-reports`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    console.error(`Submit EOD report failed at ${url}:`, err);
    throw err;
  }
}

export async function updateEodReportApi(data) {
  const url = `${currentApiUrl}/api/eod-reports`;
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    console.error(`Update EOD report failed at ${url}:`, err);
    throw err;
  }
}

// ==================== CLIENT PORTAL API HELPERS ====================

export async function fetchClientPackagesApi(clientId) {
  const url = `${currentApiUrl}/api/client-services/my-packages?clientId=${encodeURIComponent(clientId)}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return await response.json();
  } catch (err) {
    console.error(`Fetch client packages failed at ${url}:`, err);
    throw err;
  }
}

export async function fetchClientRequestsApi(clientId = null) {
  let url = `${currentApiUrl}/api/client-services/requests`;
  if (clientId) {
    url += `?clientId=${encodeURIComponent(clientId)}`;
  }
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return await response.json();
  } catch (err) {
    console.error(`Fetch client requests failed at ${url}:`, err);
    throw err;
  }
}

export async function createClientRequestApi(data) {
  const url = `${currentApiUrl}/api/client-services/requests`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    console.error(`Create client request failed at ${url}:`, err);
    throw err;
  }
}

export async function fetchClientSeoReportsApi(clientId) {
  const url = `${currentApiUrl}/api/client-services/seo?clientId=${encodeURIComponent(clientId)}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return await response.json();
  } catch (err) {
    console.error(`Fetch client SEO reports failed at ${url}:`, err);
    throw err;
  }
}

export async function fetchClientSmoGraphicsApi(clientId) {
  const url = `${currentApiUrl}/api/client-services/smo?clientId=${encodeURIComponent(clientId)}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return await response.json();
  } catch (err) {
    console.error(`Fetch client SMO graphics failed at ${url}:`, err);
    throw err;
  }
}

export async function createClientSmoRequestApi(data) {
  const url = `${currentApiUrl}/api/client-services/smo`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    console.error(`Create client SMO request failed at ${url}:`, err);
    throw err;
  }
}

export async function fetchClientAdsApi(clientId) {
  const url = `${currentApiUrl}/api/client-services/ads?clientId=${encodeURIComponent(clientId)}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return await response.json();
  } catch (err) {
    console.error(`Fetch client Ads failed at ${url}:`, err);
    throw err;
  }
}

export async function fetchClientInvoicesApi(clientId) {
  const url = `${currentApiUrl}/api/invoices?client_id=${encodeURIComponent(clientId)}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return await response.json();
  } catch (err) {
    console.error(`Fetch client invoices failed at ${url}:`, err);
    throw err;
  }
}

export async function fetchClientNotesApi(clientId) {
  const url = `${currentApiUrl}/api/client-notes?client_id=${encodeURIComponent(clientId)}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return await response.json();
  } catch (err) {
    console.error(`Fetch client notes failed at ${url}:`, err);
    throw err;
  }
}

export async function createClientNoteApi(data) {
  const url = `${currentApiUrl}/api/client-notes`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    console.error(`Create client note failed at ${url}:`, err);
    throw err;
  }
}

export async function fetchClientDetailsApi(clientId) {
  const url = `${currentApiUrl}/api/client-details?clientId=${encodeURIComponent(clientId)}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return await response.json();
  } catch (err) {
    console.error(`Fetch client details failed at ${url}:`, err);
    throw err;
  }
}

export async function updateClientDetailsApi(data) {
  const url = `${currentApiUrl}/api/client-details`;
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    console.error(`Update client details failed at ${url}:`, err);
    throw err;
  }
}

// ==========================================
// Live Desktop Screenshots APIs
// ==========================================

export function resolveSafeImageUri(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  // iOS RCTImageLoader crashes if given Android content:// URLs
  if (Platform.OS === 'ios' && trimmed.startsWith('content://')) {
    return null;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/') || trimmed.startsWith('file://')) {
    return trimmed;
  }
  const cleanBase = currentApiUrl.replace(/\/$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${cleanBase}${cleanPath}`;
}

export function resolveScreenshotImageUrl(rawUrl) {
  return resolveSafeImageUri(rawUrl) || '';
}

export async function fetchScreenshotsListApi(params = {}) {
  let queryString = '';
  const queryParts = [];
  if (params.employeeId && params.employeeId !== 'all') queryParts.push(`employeeId=${encodeURIComponent(params.employeeId)}`);
  if (params.department && params.department !== 'all') queryParts.push(`department=${encodeURIComponent(params.department)}`);
  if (params.date) queryParts.push(`date=${encodeURIComponent(params.date)}`);
  if (params.limit && params.limit !== 'all') queryParts.push(`limit=${encodeURIComponent(params.limit)}`);
  if (queryParts.length > 0) queryString = `?${queryParts.join('&')}`;

  const url = `${currentApiUrl}/api/screenshots/list${queryString}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return await response.json();
  } catch (err) {
    console.error(`Fetch screenshots failed at ${url}:`, err);
    throw err;
  }
}

export async function deleteScreenshotApi(id) {
  const url = `${currentApiUrl}/api/screenshots/delete`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id })
    });
    return await response.json();
  } catch (err) {
    console.error(`Delete screenshot failed at ${url}:`, err);
    throw err;
  }
}

export async function deleteAllScreenshotsApi(employeeId = null, deleteAll = false) {
  const url = `${currentApiUrl}/api/screenshots/delete`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ employeeId, deleteAll })
    });
    return await response.json();
  } catch (err) {
    console.error(`Delete all screenshots failed at ${url}:`, err);
    throw err;
  }
}

// ==========================================
// TEAM LEADER & TASK MANAGEMENT APIS
// ==========================================

export async function fetchTasksApi() {
  const url = `${currentApiUrl}/api/tasks`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return await response.json();
  } catch (err) {
    console.error(`Fetch tasks failed at ${url}:`, err);
    throw err;
  }
}

export async function postTaskApi({ title, description, assignedTo, assignedToName, assignedBy, assignedByName, project_id }) {
  const url = `${currentApiUrl}/api/tasks`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        description,
        assignedTo,
        assignedToName,
        assignedBy: assignedBy || 'TL',
        assignedByName: assignedByName || 'Team Leader',
        project_id: project_id || null
      })
    });
    return await response.json();
  } catch (err) {
    console.error(`Post task failed at ${url}:`, err);
    throw err;
  }
}

export async function updateTaskStatusApi(id, status) {
  const url = `${currentApiUrl}/api/tasks`;
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, status })
    });
    return await response.json();
  } catch (err) {
    console.error(`Update task status failed at ${url}:`, err);
    throw err;
  }
}

export async function updateClientRequestStatusApi(id, status) {
  const url = `${currentApiUrl}/api/client-services/requests`;
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, status })
    });
    return await response.json();
  } catch (err) {
    console.error(`Update client request status failed at ${url}:`, err);
    throw err;
  }
}


