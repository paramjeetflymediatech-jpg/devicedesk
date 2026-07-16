const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// 1. Manually parse .env.local if present
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '');
      process.env[key] = val;
    }
  });
}

// 2. Setup DB Credentials
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'Root@123',
  database: process.env.DB_NAME || 'system_tracking'
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('🛡️  DeviceDesk Admin Creator Script');
  console.log('-----------------------------------');

  let name = process.argv[2];
  let email = process.argv[3];
  let password = process.argv[4];

  if (!name || !email || !password) {
    console.log('No arguments provided. Please enter details below:\n');
    name = await question('👤 Enter Admin Name: ');
    email = await question('✉️ Enter Admin Email: ');
    password = await question('🔑 Enter Password: ');
  }

  name = name.trim();
  email = email.trim();
  password = password.trim();

  if (!name || !email || !password) {
    console.log('\n❌ Error: Name, Email, and Password are all required!');
    rl.close();
    process.exit(1);
  }

  let connection;
  try {
    console.log('\n⏳ Connecting to MySQL database with the following config:');
    console.log(`   Host:     ${dbConfig.host}`);
    console.log(`   Port:     ${dbConfig.port}`);
    console.log(`   User:     ${dbConfig.user}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log('-----------------------------------');
    
    connection = await mysql.createConnection(dbConfig);

    // Hash password with bcrypt (salt rounds = 10) and secret key
    console.log('🔒 Hashing password securely with secret key...');
    const pepper = process.env.PASSWORD_PEPPER || 'devicedesk_secure_pepper_key_2026';
    const hashedPassword = await bcrypt.hash(password + pepper, 10);

    const empId = 'emp_' + Date.now();
    const role = 'Admin';
    const department = 'IT';
    const ticketLimit = 5;

    console.log('✍️  Writing admin account to database...');
    await connection.execute(
      `INSERT INTO employees (id, name, email, password, role, department, ticketLimit) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [empId, name, email, hashedPassword, role, department, ticketLimit]
    );

    console.log('\n=============================================');
    console.log('✅ Success! Admin Account Created Successfully.');
    console.log(`👤 Name:     ${name}`);
    console.log(`✉️ Email:    ${email}`);
    console.log(`🛡️ Role:     ${role}`);
    console.log(`📁 Dept:     ${department}`);
    console.log('=============================================');

  } catch (err) {
    console.error('\n❌ Database Error:', err.message);
  } finally {
    if (connection) await connection.end();
    rl.close();
  }
}

main();
