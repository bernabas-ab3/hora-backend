const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : undefined
});

pool.on('error', (error) => {
  console.error('Unexpected database pool error:', error.message);
});

module.exports = pool;