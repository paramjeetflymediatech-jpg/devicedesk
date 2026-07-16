import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_URL_KEY = 'devicedesk_api_url';

// Default URLs: 10.0.2.2 for Android Emulator, localhost for iOS simulator
// const DEFAULT_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
const DEFAULT_URL = 'https://devicedesk.flymediatech.com';

let currentApiUrl = DEFAULT_URL;

export async function initApiUrl() {
  try {
    const saved = await AsyncStorage.getItem(API_URL_KEY);
    if (saved) {
      currentApiUrl = saved;
    } else {
      currentApiUrl = DEFAULT_URL;
      await AsyncStorage.setItem(API_URL_KEY, DEFAULT_URL);
    }
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
