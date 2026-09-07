const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRouter = require('./routes/auth');

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : null;

app.use(cors({
  origin: allowedOrigins || true
}));
app.use(express.json());

app.use('/api/auth', authRouter);

app.get('/api/health', async (req, res) => {
  const timestamp = new Date().toISOString();

  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ status: 'degraded', database: 'not_configured', timestamp });
  }

  try {
    const pool = require('./db/pool');
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', database: 'connected', timestamp });
  } catch (error) {
    console.error('[health] database check failed:', { code: error.code, message: error.message });
    return res.status(503).json({ status: 'degraded', database: 'unavailable', timestamp });
  }
});

app.get('/api/services', (req, res) => {
  res.json({
    message: 'Services endpoint'
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  console.error('[http/error]', {
    path: req.path,
    method: req.method,
    code: err.code,
    message: err.message
  });
  res.status(500).json({
    error: 'Internal server error'
  });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Hora Backend running on port ${PORT}`);
  });
}

module.exports = app;