// Project marketplace routes (TASK-041, TASK-042, api.md Bagian 6). Base: /api/v1/projects
const express = require('express');
const controller = require('../controllers/projects.controller');
const matchingController = require('../controllers/matching.controller');
const { authenticateToken, optionalAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const { handleValidationErrors } = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/rateLimit');
const { marketplaceQueryRules, projectIdRules, applyRules } = require('../validators/projects.validators');
const { matchParamRules } = require('../validators/matching.validators');

const router = express.Router();

router.get('/', authLimiter, optionalAuth, marketplaceQueryRules, handleValidationErrors, controller.browse);
router.get('/:id', authLimiter, optionalAuth, projectIdRules, handleValidationErrors, controller.detail);
router.get('/:id/match', authLimiter, authenticateToken, requireRole('mahasiswa'), matchParamRules, handleValidationErrors, matchingController.projectMatch);
router.post('/:id/apply', authLimiter, authenticateToken, requireRole('mahasiswa'), applyRules, handleValidationErrors, controller.apply);

module.exports = router;
