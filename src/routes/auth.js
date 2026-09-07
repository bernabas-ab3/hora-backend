const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const router = express.Router();

const columnAliases = {
  userId: ['user_id', 'id'],
  username: ['username', 'user_name'],
  password: ['password_hash', 'password', 'password_digest'],
  fullName: ['full_name', 'fullname', 'name'],
  role: ['role']
};

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function findColumn(columns, aliases) {
  return aliases.find((alias) => columns.includes(alias));
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
       WHERE table_schema = current_schema() AND table_name = 'users'`
    );
    const columns = schemaResult.rows.map((row) => row.column_name);
    const selected = Object.fromEntries(
      Object.entries(columnAliases).map(([key, aliases]) => [key, findColumn(columns, aliases)])
    );

    if (Object.values(selected).some((column) => !column)) {
      return res.status(500).json({ error: 'Users table is missing required authentication columns' });
    }

    const query = `SELECT ${Object.values(selected).map(quoteIdentifier).join(', ')}
      FROM ${quoteIdentifier('users')}
      WHERE ${quoteIdentifier(selected.username)} = $1
      LIMIT 1`;
    const result = await pool.query(query, [username]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user[selected.password]))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const responseUser = {
      user_id: user[selected.userId],
      username: user[selected.username],
      full_name: user[selected.fullName],
      role: user[selected.role]
    };
    const token = jwt.sign(
      { user_id: responseUser.user_id, username: responseUser.username, role: responseUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );

    return res.json({ token, user: responseUser });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;