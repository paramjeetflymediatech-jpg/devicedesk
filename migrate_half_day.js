import mysql from 'mysql2/promise';

async function migrate() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'devicedesk'
  });

  try {
    console.log('Altering leave_requests table to support half days...');
    await db.execute('ALTER TABLE leave_requests MODIFY totalDays FLOAT NOT NULL DEFAULT 0;');
    console.log('Migration successful.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await db.end();
  }
}

migrate();
