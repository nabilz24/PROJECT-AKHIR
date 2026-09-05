// Express app factory (TASK-010). Diekspor tanpa listen agar bisa diuji supertest.
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const studentsRoutes = require('./routes/students.routes');
const skillsRoutes = require('./routes/skills.routes');
const companiesRoutes = require('./routes/companies.routes');
const projectsRoutes = require('./routes/projects.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const matchingRoutes = require('./routes/matching.routes');
const gapRoutes = require('./routes/gap.routes');
const recommendationsRoutes = require('./routes/recommendations.routes');
const assessmentsRoutes = require('./routes/assessments.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const pagesRoutes = require('./routes/pages.routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { ok } = require('./utils/response');

function createApp() {
  const app = express();
  // Konvensi filter api.md ?filter[field]=value butuh parser extended
  // (default Express 5 adalah simple).
  app.set('query parser', 'extended');
  // EJS server-rendered (keputusan frontend Phase 10, TASK-100..103).
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/v1/health', (req, res) => ok(res, { status: 'up' }, 'OK'));
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/students', studentsRoutes);
  app.use('/api/v1/skills', skillsRoutes);
  app.use('/api/v1/companies', companiesRoutes);
  app.use('/api/v1/projects', projectsRoutes);
  app.use('/api/v1/notifications', notificationsRoutes);
  app.use('/api/v1/matching', matchingRoutes);
  app.use('/api/v1/gap-analysis', gapRoutes);
  app.use('/api/v1/recommendations', recommendationsRoutes);
  app.use('/api/v1', assessmentsRoutes);
  app.use('/api/v1', dashboardRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  // Halaman EJS (TASK-100..103, keputusan frontend Phase 10).
  app.use('/', pagesRoutes);
  // Static file serving untuk foto profil (TASK-020, local storage MVP).
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
