const mysql = require('mysql2/promise');

async function setup() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'system_tracking'
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidate_registrations (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      address TEXT,
      experience_level ENUM('Fresher', 'Experienced') DEFAULT 'Fresher',
      experience_details TEXT,
      status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidate_tests (
      id VARCHAR(50) PRIMARY KEY,
      candidate_employee_id VARCHAR(50) NOT NULL,
      test_title VARCHAR(200) NOT NULL,
      test_instructions TEXT NOT NULL,
      file_url VARCHAR(500),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  console.log('Tables created successfully');
}

setup().catch(console.error).finally(() => process.exit(0));
