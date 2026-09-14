const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// 1. Manually parse env file if present (.env.local, .env, or .env.production)
const envNames = ['.env.local', '.env', '.env.production'];
for (const name of envNames) {
  const envPath = path.join(__dirname, '..', name);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const parts = trimmed.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
    break;
  }
}

// 2. Setup DB Credentials
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'system_tracking'
};

const DEFAULT_PASSWORD = process.argv[2] || 'password@123';
const pepper = process.env.PASSWORD_PEPPER || 'devicedesk_secure_pepper_key_2026';

function isExcludedAccount(emp) {
  const role = (emp.role || '').toLowerCase().trim();
  const dept = (emp.department || '').toLowerCase().trim();
  const name = (emp.name || '').toLowerCase().trim();
  const email = (emp.email || '').toLowerCase().trim();

  // Admin checks
  if (
    role === 'admin' ||
    role === 'super admin' ||
    role.includes('admin') ||
    name === 'admin' ||
    name === 'superadmin' ||
    name.includes('verification admin') ||
    email.startsWith('admin@') ||
    email.startsWith('superadmin@') ||
    email.includes('devicedesk.com')
  ) {
    return { excluded: true, reason: 'Admin Account' };
  }

  // IT checks
  if (
    role === 'it' ||
    role === 'it support' ||
    role === 'it engineer' ||
    role.includes('it ') ||
    dept === 'it' ||
    dept === 'it support' ||
    name === 'it' ||
    name.includes('it support') ||
    email.startsWith('it@') ||
    email.startsWith('itsupport@')
  ) {
    return { excluded: true, reason: 'IT Account' };
  }

  // HR checks
  if (
    role === 'hr' ||
    role === 'hr management' ||
    role.includes('hr') ||
    dept === 'hr' ||
    dept === 'human resources' ||
    name === 'hr' ||
    name.includes('hr management') ||
    email.startsWith('hr@') ||
    email.startsWith('hrmanagement@')
  ) {
    return { excluded: true, reason: 'HR Account' };
  }

  return { excluded: false, reason: null };
}

async function updatePasswords() {
  console.log('=====================================================');
  console.log('🔑 DeviceDesk Bulk Employee Password Updater');
  console.log(`🎯 Target Default Password: "${DEFAULT_PASSWORD}"`);
  console.log('🚫 Exclusions: Admin, IT, and HR accounts');
  console.log('=====================================================\n');

  let connection;
  try {
    console.log(`⏳ Connecting to MySQL database [${dbConfig.database}] at ${dbConfig.host}:${dbConfig.port}...`);
    connection = await mysql.createConnection(
      
    );
    console.log('✅ Connected successfully!\n');

    // Fetch all employees
    const [employees] = await connection.execute(
      'SELECT id, name, email, role, department FROM employees'
    );

    console.log(`📋 Found total ${employees.length} employee account(s) in database.\n`);

    const excludedList = [];
    const updateList = [];

    for (const emp of employees) {
      const check = isExcludedAccount(emp);
      if (check.excluded) {
        excludedList.push({ ...emp, exclusionReason: check.reason });
      } else {
        updateList.push(emp);
      }
    }

    // Print Excluded Accounts
    console.log('-----------------------------------------------------');
    console.log(`🛡️  EXCLUDED ACCOUNTS (${excludedList.length}):`);
    console.log('-----------------------------------------------------');
    if (excludedList.length === 0) {
      console.log('   None');
    } else {
      excludedList.forEach((e, idx) => {
        console.log(`   ${idx + 1}. [${e.exclusionReason}] ${e.name} (${e.email || 'No email'}) | Role: "${e.role}" | Dept: "${e.department}"`);
      });
    }

    // Print Accounts to Update
    console.log('\n-----------------------------------------------------');
    console.log(`🔄 ACCOUNTS TO UPDATE (${updateList.length}):`);
    console.log('-----------------------------------------------------');
    if (updateList.length === 0) {
      console.log('   No accounts eligible for password update.');
      return;
    }

    updateList.forEach((e, idx) => {
      console.log(`   ${idx + 1}. ${e.name} (${e.email || 'No email'}) | Role: "${e.role}" | Dept: "${e.department}"`);
    });

    // Hash the target password with bcrypt + pepper
    console.log(`\n🔒 Generating secure bcrypt hash for "${DEFAULT_PASSWORD}"...`);
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD + pepper, 10);

    console.log('✍️  Updating passwords in database...');
    let updatedCount = 0;

    for (const emp of updateList) {
      await connection.execute(
        'UPDATE employees SET password = ? WHERE id = ?',
        [hashedPassword, emp.id]
      );
      updatedCount++;
    }

    console.log('\n=====================================================');
    console.log('🎉 SUCCESS! Bulk Password Update Complete.');
    console.log(`✅ Updated:  ${updatedCount} employee account(s) to "${DEFAULT_PASSWORD}"`);
    console.log(`🛡️  Preserved: ${excludedList.length} Admin / IT / HR account(s) unchanged`);
    console.log('=====================================================\n');

  } catch (err) {
    console.error('\n❌ Error updating passwords:', err);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

updatePasswords();
