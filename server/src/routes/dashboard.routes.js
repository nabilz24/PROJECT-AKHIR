// Dashboard data routes (TASK-100/101/102). Base: /api/v1
const express = require('express');
const controller = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const { authLimiter } = require('../middlewares/rateLimit');

const router = express.Router();

router.get('/students/dashboard', authLimiter, authenticateToken, requireRole('mahasiswa'), controller.studentDashboard);
router.get('/companies/dashboard', authLimiter, authenticateToken, requireRole('perusahaan'), controller.companyDashboard);
router.get('/campus/dashboard', authLimiter, authenticateToken, requireRole('kampus', 'dosen'), controller.campusDashboard);

module.exports = router;
