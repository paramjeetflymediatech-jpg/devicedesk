/**
 * Biometric Machine Synchronization Bridge Daemon
 * -------------------------------------------------------------
 * This script connects to physical ZKTeco / eSSL / Realtime attendance devices 
 * on your office local network (LAN) via TCP/IP (Default port 4370) and pushes
 * new attendance punches to your DeviceDesk Next.js API (/api/attendance/biometric).
 * 
 * Usage:
 *   1. Configure DEVICE_IP and SERVER_URL below (or in .env.local).
 *   2. Run: node scripts/biometric_sync.js
 * 
 * If using node-zklib:
 *   npm install node-zklib
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Configuration
const DEVICE_IP = process.env.BIOMETRIC_DEVICE_IP || '192.168.1.201'; // IP of your biometric machine
const DEVICE_PORT = parseInt(process.env.BIOMETRIC_DEVICE_PORT || '4370', 10);
const SERVER_URL = process.env.DEVICEDESK_API_URL || 'http://localhost:3000';
const SYNC_SECRET = process.env.BIOMETRIC_SECRET_KEY || 'devicedesk_biometric_secret_2026';
const POLL_INTERVAL_MS = parseInt(process.env.BIOMETRIC_POLL_INTERVAL || '30000', 10); // Check every 30s

console.log('----------------------------------------------------');
console.log('🚀 DeviceDesk Biometric Sync Bridge Starting...');
console.log(`📡 Target Device IP: ${DEVICE_IP}:${DEVICE_PORT}`);
console.log(`🌐 Server URL:       ${SERVER_URL}/api/attendance/biometric`);
console.log(`⏱️  Poll Interval:   ${POLL_INTERVAL_MS / 1000} seconds`);
console.log('----------------------------------------------------');

async function sendLogsToServer(logs) {
  if (!logs || logs.length === 0) return;

  const endpoint = `${SERVER_URL}/api/attendance/biometric`;
  const parsed = new URL(endpoint);
  const client = parsed.protocol === 'https:' ? https : http;

  const payload = JSON.stringify({
    apiKey: SYNC_SECRET,
    logs: logs.map(l => ({
      biometricId: String(l.userId || l.deviceUserId || l.id || '').trim(),
      timestamp: l.recordTime || l.timestamp || new Date().toISOString()
    }))
  });

  return new Promise((resolve, reject) => {
    const req = client.request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': `Bearer ${SYNC_SECRET}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Polls the device using node-zklib if installed.
 */
async function pollDevice() {
  let ZKLib;
  try {
    ZKLib = require('node-zklib');
  } catch (err) {
    console.warn('\n⚠️ [Note] "node-zklib" package is not installed.');
    console.warn('👉 To connect directly to a physical ZKTeco/eSSL machine over LAN, run:');
    console.warn('   npm install node-zklib\n');
    return;
  }

  const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 4000);

  try {
    console.log(`[${new Date().toLocaleTimeString()}] Connecting to biometric machine at ${DEVICE_IP}...`);
    await zk.createSocket();
    
    // Fetch attendances from the device buffer
    const attendances = await zk.getAttendances();

    if (attendances && attendances.data && attendances.data.length > 0) {
      console.log(`✅ Retrieved ${attendances.data.length} logs from device. Syncing to DeviceDesk...`);
      const result = await sendLogsToServer(attendances.data);
      console.log('🎉 Server sync result:', result);
    } else {
      console.log('ℹ️ No new attendance records found on device.');
    }

  } catch (err) {
    console.error('❌ Connection to biometric machine failed:', err.message);
  } finally {
    try {
      await zk.disconnect();
    } catch (e) {}
  }
}

// Initial poll + recurring interval
pollDevice();
setInterval(pollDevice, POLL_INTERVAL_MS);

