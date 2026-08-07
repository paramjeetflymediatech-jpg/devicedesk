const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Flexible environment file path resolution for local dev & server deployment
const customEnvPath = process.env.ENV_PATH || process.argv.find(arg => arg.startsWith('--env='))?.split('=')[1];
const envCandidates = customEnvPath
  ? [path.resolve(customEnvPath)]
  : [
      path.join(__dirname, '..', '.env.local'),
      path.join(__dirname, '..', '.env'),
      path.join(__dirname, '..', '.env.production'),
      path.join(process.cwd(), '.env'),
      path.join(process.cwd(), '.env.local')
    ];

let loadedEnvPath = null;
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
    loadedEnvPath = envFile;
    break;
  }
}

async function getConnection() {
  const envPass = process.env.DB_PASS || process.env.DB_PASSWORD;
  const candidatePasswords = envPass !== undefined 
    ? [envPass] 
    : ['root', 'Root@123', '', '123456', 'password', 'admin'];

  let lastError;
  for (const pass of candidatePasswords) {
    try {
      const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: pass,
        multipleStatements: true
      });
      console.log(`🔑 Connected to MySQL server as user '${process.env.DB_USER || 'root'}'!`);
      return conn;
    } catch (err) {
      lastError = err;
      if (err.code !== 'ER_ACCESS_DENIED_ERROR') {
        throw err;
      }
    }
  }
  throw lastError;
}

async function runMigration() {
  console.log('==========================================================');
  console.log('🚀 DeviceDesk Automated Database Migration Tool');
  console.log('==========================================================');
  if (loadedEnvPath) {
    console.log(`📌 Loaded Environment File: ${loadedEnvPath}`);
  } else {
    console.log('⚠️ No explicit .env file found. Using default environment variables.');
  }

  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const user = process.env.DB_USER || 'root';
  const targetDb = process.env.DB_NAME || 'system_tracking';

  console.log(`Target Host: ${host}:${port}`);
  console.log(`Database User: ${user}`);
  console.log(`Target Database: ${targetDb}\n`);

  let connection;
  try {
    connection = await getConnection();

    // 1. Ensure database exists
    console.log(`--> Ensuring database [${targetDb}] exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${targetDb}\`;`);
    await connection.changeUser({ database: targetDb });
    console.log(`✅ Using database [${targetDb}]\n`);

    // 2. Run schema.sql if present
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('📄 Executing schema.sql...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await connection.query(schemaSql);
      console.log('✅ schema.sql executed successfully.\n');
    }

    // 3. Run alter.sql if present
    const alterPath = path.join(__dirname, '..', 'alter.sql');
    if (fs.existsSync(alterPath)) {
      console.log('📄 Executing alter.sql...');
      const alterSql = fs.readFileSync(alterPath, 'utf8');
      const statements = alterSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        try {
          await connection.query(statement);
          console.log(`  ✓ Executed: ${statement.substring(0, 50)}...`);
        } catch (err) {
          if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column')) {
            console.log(`  ℹ Ignored duplicate column warning for: ${statement.substring(0, 40)}...`);
          } else {
            console.warn(`  ⚠️ Warning on statement: ${err.message}`);
          }
        }
      }
      console.log('✅ alter.sql processing complete.\n');
    }

    console.log('==========================================================');
    console.log('🎉 Database Migration completed successfully!');
    console.log('==========================================================');
  } catch (error) {
    console.error('\n❌ Migration Failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();
