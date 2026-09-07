const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const router = express.Router();

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

router.post('/login', async (req, res, next) => {
  const { username, password } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
    return res.status(503).json({ error: 'Authentication service is not configured' });
  }

  try {
    const schemaResult = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users'`
    );
    const columns = schemaResult.rows.map((row) => row.column_name);
    const requiredColumns = ['user_id', 'username', 'password_hash', 'full_name', 'role'];

    if (requiredColumns.some((column) => !columns.includes(column))) {
      return res.status(500).json({ error: 'Users table is missing required authentication columns' });
    }

    const query = `SELECT ${requiredColumns.map(quoteIdentifier).join(', ')}
      FROM ${quoteIdentifier('public')}.${quoteIdentifier('users')}
      WHERE ${quoteIdentifier('username')} = $1
      LIMIT 1`;
    const result = await pool.query(query, [username]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const responseUser = {
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      role: user.role
    };
    const token = jwt.sign(
      { user_id: responseUser.user_id, username: responseUser.username, role: responseUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );

    return res.json({ token, user: responseUser });
  } catch (error) {
    console.error('[auth/login] database authentication error:', {
      code: error.code,
      message: error.message
    });
    return next(error);
  }
});

module.exports = router;