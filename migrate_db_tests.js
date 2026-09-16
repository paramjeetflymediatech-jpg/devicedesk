const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'root',
    database: process.env.DB_NAME || 'system_tracking'
  });

  try {
    console.log('Adding test_type to candidate_tests...');
    await pool.query(`ALTER TABLE candidate_tests ADD COLUMN test_type VARCHAR(20) DEFAULT 'text'`);
    console.log('Success.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') console.log('test_type already exists.');
    else throw err;
  }

  try {
    console.log('Adding test_data to candidate_tests...');
    await pool.query(`ALTER TABLE candidate_tests ADD COLUMN test_data JSON`);
    console.log('Success.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') console.log('test_data already exists.');
    else throw err;
  }

  try {
    console.log('Adding status to candidate_tests...');
    await pool.query(`ALTER TABLE candidate_tests ADD COLUMN status VARCHAR(20) DEFAULT 'Assigned'`);
    console.log('Success.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') console.log('status already exists.');
    else throw err;
  }

  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch(console.error);
