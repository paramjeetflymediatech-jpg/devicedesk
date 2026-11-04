/**
 * Biometric Machine Simulator (Hardware-Free Testing)
 * ----------------------------------------------------
 * Simulates a physical ZKTeco / eSSL biometric machine sending 
 * punch logs to your DeviceDesk server.
 * 
 * Usage:
 *   node scripts/test_biometric_device.js [SERVER_URL] [EMPLOYEE_ID_OR_BIO_ID]
 * 
 * Examples:
 *   node scripts/test_biometric_device.js http://localhost:3000 emp_1784197540277
 *   node scripts/test_biometric_device.js https://your-vps-domain.com 101
 */

const targetUrl = process.argv[2] || process.env.DEVICEDESK_API_URL || 'http://localhost:3000';
const identifier = process.argv[3] || 'emp_1784197540277';
const secretKey = process.env.BIOMETRIC_SECRET_KEY || 'devicedesk_biometric_secret_2026';

const endpoint = `${targetUrl.replace(/\/$/, '')}/api/attendance/biometric`;

async function simulateBiometricPunch() {
  console.log('----------------------------------------------------');
  console.log('🤖 Simulating Biometric Machine Punch Log...');
  console.log(`🌐 Server Endpoint:  ${endpoint}`);
  console.log(`👤 Target User ID:   ${identifier}`);
  console.log('----------------------------------------------------');

  const payload = {
    apiKey: secretKey,
    logs: [
      {
        biometricId: identifier,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        deviceSerial: 'SIMULATOR_DEVICE_01'
      }
    ]
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secretKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log(`📡 Response Status: [${res.status}]`);
    console.log('📦 Server Response:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n🎉 SUCCESS! The punch was processed by the server.');
      console.log('👉 Go to your Admin Attendance Dashboard:');
      console.log(`   ${targetUrl}/admin/attendance`);
      console.log('   You will see this employee punched with a 🏷️ Biometric badge!');
    } else {
      console.log('\n❌ FAILED:', data.message || data.error);
    }
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  }
}

simulateBiometricPunch();

