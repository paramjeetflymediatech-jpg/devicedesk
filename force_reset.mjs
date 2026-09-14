import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log("Forcing password reset for ALL users...");
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'root',
    database: process.env.DB_NAME || 'system_tracking'
  });

  const pepper = process.env.PASSWORD_PEPPER || 'devicedesk_secure_pepper_key_2026';

  // 1. Fetch all current employees from the actual database
  const [rows] = await db.execute('SELECT id, email, name, role FROM employees');
  
  let restoredCount = 0;

  for (const emp of rows) {
    const firstName = emp.name ? emp.name.split(' ')[0].toLowerCase() : 'employee';
    let newPassword = firstName + '123'; // e.g. aman123, admin123
    
    // Hash it with pepper
    const hashedPassword = await bcrypt.hash(newPassword + pepper, 10);

    // Update the user
    const [result] = await db.execute(
      `UPDATE employees SET password = ? WHERE id = ?`,
      [hashedPassword, emp.id]
    );
    
    if (result.affectedRows > 0) {
      restoredCount++;
      console.log(`Reset password for ${emp.email} (Name: ${emp.name}) to: ${newPassword}`);
    }
  }

  console.log(`\n✅ Successfully forcefully reset ${restoredCount} passwords.`);
  console.log(`You can now log in using your first name (in lowercase) followed by 123.`);
  console.log(`For example, if your name is Aman, your password is: aman123`);
  
  await db.end();
}

run().catch(console.error);
