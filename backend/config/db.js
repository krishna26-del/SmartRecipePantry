/**
 * config/db.js
 *
 * Creates a reusable MySQL connection pool using mysql2/promise.
 * All credentials are read from environment variables — never hardcoded.
 *
 * Why a pool instead of a single connection?
 * A pool keeps several open connections ready. When a request comes in,
 * it borrows one, uses it, and returns it. This is much more efficient
 * than opening and closing a connection for every request.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Build the pool configuration from .env values.
// DB_NAME may have a trailing space in .env — trim it to be safe.
const poolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ? process.env.DB_NAME.trim() : undefined,
  waitForConnections: true,  // Queue requests when all connections are busy
  connectionLimit: 10,       // Maximum simultaneous connections in the pool
  queueLimit: 0,             // 0 = unlimited queued requests
  timezone: '+00:00',        // Store / retrieve dates in UTC
};

// Create the pool. This does NOT immediately open connections —
// connections are opened on first use.
const pool = mysql.createPool(poolConfig);

/**
 * testConnection()
 *
 * Borrows one connection from the pool, runs a lightweight query,
 * then releases the connection back.
 *
 * Call this once at server startup to confirm the database is reachable.
 * If anything is wrong (wrong password, server down, wrong DB name, etc.)
 * this will throw and the server startup will fail with a clear message.
 */
const testConnection = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query('SELECT 1');
    console.log(
      `✅  MySQL connected — host: ${process.env.DB_HOST}:${process.env.DB_PORT}, ` +
      `database: "${process.env.DB_NAME ? process.env.DB_NAME.trim() : 'undefined'}"`
    );
  } catch (error) {
    console.error('❌  MySQL connection failed:', error.message);
    console.error('    Error code:', error.code);
    console.error('    Possible reasons:');
    console.error('      • MySQL Server is not running.');
    console.error('      • DB_HOST / DB_PORT is incorrect in .env');
    console.error('      • DB_USER / DB_PASSWORD is incorrect in .env');
    console.error('      • DB_NAME does not exist — check the exact database name in MySQL Workbench');
    console.error('      • The user does not have permission to access that database');
    // Re-throw so the server startup process can decide what to do
    throw error;
  } finally {
    // Always release the borrowed connection, even if an error occurred
    if (connection) connection.release();
  }
};

module.exports = { pool, testConnection };
