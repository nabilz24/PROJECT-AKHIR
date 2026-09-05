// Analytics routes (TASK-103, api.md Bagian 12). Base: /api/v1/analytics
const express = require('express');
const controller = require('../controllers/analytics.controller');
const { authenticateToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const { handleValidationErrors } = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/rateLimit');
const { analyticsQueryRules } = require('../validators/dashboard.validators');

const router = express.Router();
const onlyCampus = requireRole('kampus', 'dosen');

router.get('/skill-distribution', authLimiter, authenticateToken, onlyCampus, analyticsQueryRules, handleValidationErrors, controller.skillDistribution);
router.get('/industry-demand', authLimiter, authenticateToken, onlyCampus, analyticsQueryRules, handleValidationErrors, controller.industryDemand);
router.get('/gap-heatmap', authLimiter, authenticateToken, onlyCampus, analyticsQueryRules, handleValidationErrors, controller.gapHeatmap);
router.get('/export', authLimiter, authenticateToken, onlyCampus, analyticsQueryRules, handleValidationErrors, controller.exportCsv);

module.exports = router;
