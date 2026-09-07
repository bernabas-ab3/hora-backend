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

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
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
  console.error(err.message);
  if (err instanceof SyntaxError && err.status === 400 && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
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