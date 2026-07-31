const http = require('http');

async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'Test-Agent-Automated/1.0'
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, body: responseBody });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Automated Attendance System Tests...');

  const testEmpId = `emp_test_${Date.now()}`;
  const testEmpName = 'Automated Test User';

  try {
    // 1. Initial Status Check
    console.log('\n1️⃣ Checking initial status for new employee...');
    const status1 = await makeRequest(`/api/attendance/status?employeeId=${testEmpId}`);
    console.log('Status result:', status1.data);
    if (!status1.data.success || status1.data.punchedIn) {
      throw new Error('Initial status should indicate not punched in!');
    }
    console.log('✅ Initial status test passed!');

    // 2. Punch In Test
    console.log('\n2️⃣ Punching in employee...');
    const punchInRes = await makeRequest('/api/attendance/punch', 'POST', {
      employeeId: testEmpId,
      employeeName: testEmpName,
      action: 'PUNCH_IN'
    });
    console.log('Punch in result:', punchInRes.data);
    if (!punchInRes.data.success) {
      throw new Error(`Punch In failed: ${punchInRes.data.message}`);
    }
    console.log('✅ Punch In test passed!');

    // 3. Duplicate Punch In Attempt (Edge Case)
    console.log('\n3️⃣ Attempting duplicate Punch In (Edge Case test)...');
    const dupPunchIn = await makeRequest('/api/attendance/punch', 'POST', {
      employeeId: testEmpId,
      employeeName: testEmpName,
      action: 'PUNCH_IN'
    });
    console.log('Duplicate punch result:', dupPunchIn.data);
    if (dupPunchIn.data.success) {
      throw new Error('Duplicate Punch In SHOULD HAVE BEEN REJECTED!');
    }
    console.log('✅ Duplicate Punch In correctly blocked!');

    // 4. Start Break Test
    console.log('\n4️⃣ Starting Lunch Break...');
    const breakRes = await makeRequest('/api/attendance/punch', 'POST', {
      employeeId: testEmpId,
      employeeName: testEmpName,
      action: 'START_BREAK',
      breakType: 'Lunch Break'
    });
    console.log('Start break result:', breakRes.data);
    if (!breakRes.data.success) {
      throw new Error(`Start break failed: ${breakRes.data.message}`);
    }
    console.log('✅ Start Break test passed!');

    // 5. Attempting Second Break while on Break (Edge Case)
    console.log('\n5️⃣ Attempting second break while already on break...');
    const dupBreakRes = await makeRequest('/api/attendance/punch', 'POST', {
      employeeId: testEmpId,
      employeeName: testEmpName,
      action: 'START_BREAK',
      breakType: 'Tea Break'
    });
    console.log('Duplicate break result:', dupBreakRes.data);
    if (dupBreakRes.data.success) {
      throw new Error('Second break SHOULD HAVE BEEN REJECTED while on break!');
    }
    console.log('✅ Secondary break correctly blocked!');

    // 6. Punch Out with Auto-Close Break (Edge Case)
    console.log('\n6️⃣ Punching out while on break (Testing auto-close break feature)...');
    const punchOutRes = await makeRequest('/api/attendance/punch', 'POST', {
      employeeId: testEmpId,
      employeeName: testEmpName,
      action: 'PUNCH_OUT'
    });
    console.log('Punch out result:', punchOutRes.data);
    if (!punchOutRes.data.success) {
      throw new Error(`Punch out failed: ${punchOutRes.data.message}`);
    }
    console.log('✅ Punch Out with auto-close break test passed!');

    // 7. Verify Final Status
    console.log('\n7️⃣ Verifying final completed attendance status...');
    const finalStatus = await makeRequest(`/api/attendance/status?employeeId=${testEmpId}`);
    console.log('Final status:', finalStatus.data);
    if (finalStatus.data.punchedIn) {
      throw new Error('Employee should be punched out now!');
    }
    console.log('✅ Final status verification test passed!');

    console.log('\n🎉 ALL ATTENDANCE SYSTEM EDGE-CASE TESTS PASSED PERFECTLY!');

  } catch (err) {
    console.error('\n❌ Test Error:', err.message);
    process.exitCode = 1;
  }
}

runTests();
