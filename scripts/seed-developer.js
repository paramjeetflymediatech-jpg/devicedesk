const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'devicedesk',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log("Setting up Developer Database Tables...");
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employeeId VARCHAR(100),
        employeeName VARCHAR(150),
        action VARCHAR(100) NOT NULL,
        details TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✅ agent_logs table verified.");

    const pepper = process.env.PASSWORD_PEPPER || 'devicedesk_secure_pepper_key_2026';
    const hashedPassword = await bcrypt.hash('Developer@123' + pepper, 10);
    const devEmail = 'developer@devicedesk.com';

    const [existing] = await pool.query(`SELECT id FROM employees WHERE email = ?`, [devEmail]);
    
    if (existing.length === 0) {
      await pool.query(
        `INSERT INTO employees (id, name, email, password, role, department, status, createdAt) 
         VALUES (?, ?, ?, ?, 'Admin', 'Development', 'ACTIVE', NOW())`,
        ['EMP-DEV-001', 'Developer Admin', devEmail, hashedPassword]
      );
      console.log("✅ Developer User Created!");
    } else {
      // Force update the password in case it was created without the pepper previously
      await pool.query(`UPDATE employees SET password = ? WHERE email = ?`, [hashedPassword, devEmail]);
      console.log("✅ Developer User already existed, password reset successfully.");
    }

    console.log("   Email: developer@devicedesk.com");
    console.log("   Password: Developer@123");

    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Seed error:", error);
  } finally {
    process.exit(0);
  }
}

seed();
