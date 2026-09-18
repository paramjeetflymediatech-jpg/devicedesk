const { getDbConnection } = require('./app/api/db/db.js'); 
async function run() { 
  const db = await getDbConnection(); 
  const [res] = await db.execute("UPDATE employees SET status = 'Active' WHERE status = 'Inactive'"); 
  console.log('Updated ' + res.affectedRows + ' inactive employees to Active!'); 
  process.exit(0); 
} 
run();
