const Client = require('ssh2-sftp-client');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = match[2] || '';
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        env[match[1]] = value.trim();
      }
    }
  }
  return env;
}

async function testSftp() {
  const env = loadEnv();
  const sftp = new Client();

  const host = env.WHM_SFTP_HOST || '2a00:1169:115:1590::';
  const port = parseInt(env.WHM_SFTP_PORT || '22');
  const username = env.WHM_SFTP_USER || 'storage';
  const password = env.WHM_SFTP_PASS || '1Sparsh@2@2@';

  console.log('=====================================================');
  console.log('🧪 Testing SFTP Connection to WHM Storage Server');
  console.log('🖥️  Host:', host);
  console.log('🔌 Port:', port);
  console.log('👤 User:', username);
  console.log('🔑 Password set:', password ? 'YES (Length: ' + password.length + ')' : 'NO');
  console.log('=====================================================\n');

  try {
    console.log('⏳ Connecting...');
    await sftp.connect({
      host,
      port,
      username,
      password,
      tryKeyboard: true,
      readyTimeout: 15000,
      debug: (msg) => console.log('   [SSH2 DEBUG]', msg)
    });

    console.log('✅ SFTP Connected Successfully!');
    const remotePath = env.WHM_SFTP_REMOTE_PATH || '/home/storage/public_html/uploads';
    console.log(`📁 Checking remote directory: "${remotePath}"...`);
    const exists = await sftp.exists(remotePath);
    console.log(`📂 Remote path exists:`, exists);

    if (!exists) {
      console.log(`🛠️ Creating remote directory: "${remotePath}"...`);
      await sftp.mkdir(remotePath, true);
      console.log(`✅ Directory created successfully!`);
    }

    // Test a mini write and delete
    const testFile = `${remotePath}/test_devicedesk.txt`;
    await sftp.put(Buffer.from('DeviceDesk SFTP Sync Test OK - ' + new Date().toISOString()), testFile);
    console.log(`✅ Test file upload succeeded: ${testFile}`);
    await sftp.delete(testFile);
    console.log(`🧹 Test file cleaned up.`);

    console.log('\n🎉 ALL SFTP TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('\n❌ SFTP Connection Failed:');
    console.error('Error Name:', err.name);
    console.error('Error Message:', err.message);
    if (err.level) console.error('Error Level:', err.level);
    if (err.description) console.error('Error Description:', err.description);
  } finally {
    try { await sftp.end(); } catch (e) {}
  }
}

testSftp();
