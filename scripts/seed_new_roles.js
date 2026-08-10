const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Flexible env loading
const envCandidates = [
  path.join(__dirname, '..', '.env.local'),
  path.join(__dirname, '..', '.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '.env.local')
];

for (const envFile of envCandidates) {
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
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

async function seed() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const pass = process.env.DB_PASS || process.env.DB_PASSWORD || 'root';
  const database = process.env.DB_NAME || 'system_tracking';
  const pepper = process.env.PASSWORD_PEPPER || 'devicedesk_secure_pepper_key_2026';

  console.log(`Connecting to MySQL database [${database}] at ${host}:${port}...`);
  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password: pass,
    database
  });

  console.log('Inserting/updating HR department...');
  await conn.execute(
    `INSERT INTO departments (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
    ['dept7', 'HR']
  );

  const usersToSeed = [
    {
      id: 'emp_employee',
      name: 'Employee',
      email: 'employee@yopmail.com',
      rawPass: 'employee123',
      role: 'Team Member',
      department: 'Operations',
      ticketLimit: 5
    },
    {
      id: 'emp_hr',
      name: 'HR Management',
      email: 'hr@yopmail.com',
      rawPass: 'hr123',
      role: 'HR Management',
      department: 'HR',
      ticketLimit: 20
    },
    {
      id: 'emp_itsupport',
      name: 'IT Support',
      email: 'itsupport@yopmail.com',
      rawPass: 'itsupport123',
      role: 'IT Support',
      department: 'IT Support',
      ticketLimit: 20
    },
    {
      id: 'emp1',
      name: 'Pravi Sir',
      email: 'pravi@yopmail.com',
      rawPass: 'pravi123',
      role: 'Admin',
      department: 'Executive',
      ticketLimit: 20
    }
  ];

  for (const u of usersToSeed) {
    const hashed = await bcrypt.hash(u.rawPass + pepper, 10);
    console.log(`Upserting user ${u.name} (${u.email})...`);
    await conn.execute(
      `INSERT INTO employees (id, name, email, password, role, department, ticketLimit, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')
       ON DUPLICATE KEY UPDATE 
         name=VALUES(name),
         password=VALUES(password),
         role=VALUES(role),
         department=VALUES(department),
         ticketLimit=VALUES(ticketLimit),
         status='Active'`,
      [u.id, u.name, u.email, hashed, u.role, u.department, u.ticketLimit]
    );
  }

  console.log('✅ Successfully seeded users into local MySQL database!');
  await conn.end();
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
