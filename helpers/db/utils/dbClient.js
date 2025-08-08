const { Pool } = require('pg');
const dbConfig = require('../config/dbConfig');

const pool = new Pool({
  connectionString: dbConfig.connectionString,
  max: dbConfig.maxConnections,
  min: dbConfig.minConnections,
  idleTimeoutMillis: dbConfig.idleTimeoutMillis,
  // Enable SSL in production if requested via env
  ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;