import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

async function createDemoUsers() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root', // update if needed
    password: '', // update if needed
    database: 'devicedesk' // update if needed
  });

  const pepper = 'devicedesk_secure_pepper_key_2026'; // Match your environment variable if different
  const defaultPassword = 'password123';
  const hashedPassword = await bcrypt.hash(defaultPassword + pepper, 10);

  // 1. Demo Client
  const clientId = 'emp_demo_client_' + Date.now();
  const clientEmail = 'client@demo.com';
  
  // 2. Demo Marketing Executive
  const mktId = 'emp_demo_mkt_' + Date.now();
  const mktEmail = 'marketing@demo.com';

  try {
    // Insert Client
    await db.execute(
      `INSERT INTO employees (id, name, email, password, role, department, ticketLimit, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [clientId, 'Demo Client', clientEmail, hashedPassword, 'client', 'N/A', 100]
    );
    console.log('✅ Demo Client created successfully.');
    console.log(`   Email: ${clientEmail}`);
    console.log(`   Password: ${defaultPassword}`);

    // Insert Marketing Exec
    await db.execute(
      `INSERT INTO employees (id, name, email, password, role, department, ticketLimit, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [mktId, 'Demo Marketing Exec', mktEmail, hashedPassword, 'marketing', 'Marketing', 100]
    );
    console.log('\n✅ Demo Marketing Executive created successfully.');
    console.log(`   Email: ${mktEmail}`);
    console.log(`   Password: ${defaultPassword}`);

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.log('Demo users already exist or email is taken.');
    } else {
      console.error('Error inserting users:', err);
    }
  } finally {
    await db.end();
  }
}

createDemoUsers();
