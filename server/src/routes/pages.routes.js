// Halaman EJS (TASK-100..103, DESIGN.md). Base: /
// Autentikasi via header Bearer ATAU ?token= (lihat middlewares/auth.js).
const express = require('express');
const { getDb } = require('../db/connection');
const { authenticateToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const { authLimiter } = require('../middlewares/rateLimit');
const {
  studentDashboardData,
  companyDashboardData,
  campusDashboardData,
  mentorDashboardData,
} = require('../controllers/dashboard.controller');
const {
  skillDistributionData,
  industryDemandData,
  gapHeatmapData,
} = require('../controllers/analytics.controller');

const router = express.Router();

function tokenParam(req, res, next) {
  // Teruskan token ke link navigasi agar sesi halaman tetap jalan.
  res.locals.token = req.query.token || '';
  return next();
}

router.get('/login', (req, res) => res.render('login', { title: 'Login' }));

router.get(
  '/dashboard/student',
  authLimiter,
  authenticateToken,
  requireRole('mahasiswa'),
  tokenParam,
  (req, res) => res.render('dashboards/student', { title: 'Dashboard Mahasiswa', user: req.user, data: studentDashboardData(getDb(), req.user.id) })
);

router.get(
  '/dashboard/company',
  authLimiter,
  authenticateToken,
  requireRole('perusahaan'),
  tokenParam,
  (req, res, next) => {
    const data = companyDashboardData(getDb(), req.user.id);
    if (!data) return res.status(404).send('Profil perusahaan belum tersedia');
    return res.render('dashboards/company', { title: 'Dashboard Perusahaan', user: req.user, data });
  }
);

router.get(
  '/dashboard/campus',
  authLimiter,
  authenticateToken,
  requireRole('kampus'),
  tokenParam,
  (req, res) => res.render('dashboards/campus', { title: 'Dashboard Kampus', user: req.user, data: campusDashboardData(getDb()) })
);

router.get(
  '/dashboard/mentor',
  authLimiter,
  authenticateToken,
  requireRole('dosen'),
  tokenParam,
  (req, res) => res.render('dashboards/mentor', { title: 'Dashboard Mentor', user: req.user, data: mentorDashboardData(getDb(), req.user.id) })
);

router.get(
  '/dashboard/analytics',
  authLimiter,
  authenticateToken,
  requireRole('kampus', 'dosen'),
  tokenParam,
  (req, res) => {
    const db = getDb();
    return res.render('dashboards/analytics', {
      title: 'Analytics',
      user: req.user,
      pie: skillDistributionData(db, req.query.program_studi),
      line: industryDemandData(db, req.query.period || 'last_6_months'),
      heat: gapHeatmapData(db, req.query.program_studi),
    });
  }
);

module.exports = router;
