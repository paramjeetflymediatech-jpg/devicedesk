import mysql from 'mysql2/promise';

async function updateDb() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'system_tracking'
  });

  try {
    console.log("Adding assigned_tl_id to service_requests...");
    await db.execute('ALTER TABLE service_requests ADD COLUMN assigned_tl_id VARCHAR(50) DEFAULT NULL;');
    console.log("Added assigned_tl_id.");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') console.log("assigned_tl_id already exists.");
    else console.error(err);
  }

  await db.end();
}

updateDb();
