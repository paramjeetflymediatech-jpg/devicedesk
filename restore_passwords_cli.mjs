import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { initialEmployees } from './app/data.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log("Restoring passwords...");
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'root',
    database: process.env.DB_NAME || 'system_tracking'
  });

  const pepper = process.env.PASSWORD_PEPPER || 'devicedesk_secure_pepper_key_2026';
  let restoredCount = 0;

  for (const initEmp of initialEmployees) {
    const firstName = initEmp.name ? initEmp.name.split(' ')[0].toLowerCase() : 'employee';
    const email = initEmp.email || `${firstName}@yopmail.com`;
    const rawPassword = initEmp.password || `${firstName}123`;
    
    let hashedPassword = rawPassword;
    if (!rawPassword.startsWith('$2a$') && !rawPassword.startsWith('$2b$')) {
      hashedPassword = await bcrypt.hash(rawPassword + pepper, 10);
    }

    const [result] = await db.execute(
      `UPDATE employees SET password = ? WHERE email = ?`,
      [hashedPassword, email]
    );
    
    if (result.affectedRows > 0) {
      restoredCount++;
    }
  }

  // Also reset developer admin just in case
  const devPass = await bcrypt.hash('admin123' + pepper, 10);
  await db.execute(`UPDATE employees SET password = ? WHERE email = ?`, [devPass, 'developer@devicedesk.com']);
  
  // Also reset admin@devicedesk.com just in case
  await db.execute(`UPDATE employees SET password = ? WHERE email = ?`, [devPass, 'admin@devicedesk.com']);

  console.log(`Successfully restored ${restoredCount} original employee passwords from the seed data.`);
  await db.end();
}

run().catch(console.error);
