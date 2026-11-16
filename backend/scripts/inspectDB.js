/**
 * scripts/inspectDB.js
 *
 * Run this script ONCE to inspect the existing MySQL database.
 *
 * It will:
 *   1. Connect to MySQL using .env credentials
 *   2. List all tables (SHOW TABLES)
 *   3. DESCRIBE each table (column names, types, constraints)
 *   4. SHOW CREATE TABLE (foreign keys, indexes)
 *
 * HOW TO RUN:
 *   cd backend
 *   node scripts/inspectDB.js
 *
 * This script does NOT modify the database.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const run = async () => {
  const dbName = process.env.DB_NAME ? process.env.DB_NAME.trim() : '';

  console.log('');
  console.log('══════════════════════════════════════════════════════════');
  console.log('  Database Inspector — Smart Recipe Pantry');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Host    : ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  console.log(`  User    : ${process.env.DB_USER}`);
  console.log(`  Database: "${dbName}"`);
  console.log('══════════════════════════════════════════════════════════');
  console.log('');

  let connection;
  try {
    connection = await mysql.createConnection({
      host    : process.env.DB_HOST,
      port    : parseInt(process.env.DB_PORT, 10) || 3306,
      user    : process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: dbName,
    });

    console.log('✅  Connected to MySQL successfully!\n');

    // ── Step 1: List all tables ───────────────────────────────────────────
    const [tables] = await connection.query('SHOW TABLES');
    const tableKey = `Tables_in_${dbName}`;

    console.log(`📋  Tables found: ${tables.length}`);
    tables.forEach((t, i) => console.log(`    ${i + 1}. ${t[tableKey]}`));
    console.log('');

    // ── Step 2: DESCRIBE each table ───────────────────────────────────────
    for (const tableRow of tables) {
      const tableName = tableRow[tableKey];
      console.log(`─── DESCRIBE \`${tableName}\` ───────────────────────────`);
      const [cols] = await connection.query(`DESCRIBE \`${tableName}\``);
      cols.forEach(col => {
        console.log(
          `    ${col.Field.padEnd(25)} ${col.Type.padEnd(25)} ` +
          `Null:${col.Null.padEnd(4)} Key:${col.Key.padEnd(4)} Default:${col.Default}`
        );
      });
      console.log('');
    }

    // ── Step 3: SHOW CREATE TABLE for FK and index details ────────────────
    console.log('\n══ FOREIGN KEY / INDEX DETAILS ══════════════════════════');
    for (const tableRow of tables) {
      const tableName = tableRow[tableKey];
      const [[{ 'Create Table': createSQL }]] = await connection.query(
        `SHOW CREATE TABLE \`${tableName}\``
      );
      // Only print if the table has FOREIGN KEY constraints
      if (createSQL.includes('FOREIGN KEY')) {
        console.log(`\n── \`${tableName}\` ──`);
        // Extract only the CONSTRAINT lines
        createSQL.split('\n')
          .filter(line => line.includes('CONSTRAINT') || line.includes('FOREIGN KEY') || line.includes('REFERENCES'))
          .forEach(line => console.log('  ' + line.trim()));
      }
    }

    console.log('\n══════════════════════════════════════════════════════════');
    console.log('  Inspection complete. Database schema verified.');
    console.log('══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌  Database inspection failed!');
    console.error('    Error    :', error.message);
    console.error('    Code     :', error.code);
    console.error('\n    Troubleshooting:');
    console.error('    • Is MySQL Server running?');
    console.error('    • Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in .env');
    console.error(`    • Does the database "${dbName}" exist?`);
    console.error('      Run in MySQL Workbench: SHOW DATABASES;');
    console.error('      Then update DB_NAME in .env to match exactly.\n');
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
};

run();
