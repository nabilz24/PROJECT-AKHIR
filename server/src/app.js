// Express app factory (TASK-010). Diekspor tanpa listen agar bisa diuji supertest.
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { ok } = require('./utils/response');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/v1/health', (req, res) => ok(res, { status: 'up' }, 'OK'));
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', usersRoutes);
  // Static file serving untuk foto profil (TASK-020, local storage MVP).
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
