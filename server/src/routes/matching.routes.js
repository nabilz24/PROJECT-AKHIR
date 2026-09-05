// Matching Engine routes (TASK-060, api.md Bagian 7). Base: /api/v1/matching
const express = require('express');
const controller = require('../controllers/matching.controller');
const { authenticateToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const { handleValidationErrors } = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/rateLimit');
const { calculateRules, rankingRules } = require('../validators/matching.validators');

const router = express.Router();

router.post('/calculate', authLimiter, authenticateToken, calculateRules, handleValidationErrors, controller.calculate);
router.get(
  '/ranking',
  authLimiter,
  authenticateToken,
  requireRole('perusahaan', 'kampus', 'dosen'),
  rankingRules,
  handleValidationErrors,
  controller.ranking
);

module.exports = router;
