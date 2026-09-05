// Project marketplace routes (TASK-041, TASK-042, api.md Bagian 6). Base: /api/v1/projects
const express = require('express');
const controller = require('../controllers/projects.controller');
const { authenticateToken, optionalAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const { handleValidationErrors } = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/rateLimit');
const { marketplaceQueryRules, projectIdRules, applyRules } = require('../validators/projects.validators');

const router = express.Router();

router.get('/', authLimiter, optionalAuth, marketplaceQueryRules, handleValidationErrors, controller.browse);
router.get('/:id', authLimiter, optionalAuth, projectIdRules, handleValidationErrors, controller.detail);
router.post('/:id/apply', authLimiter, authenticateToken, requireRole('mahasiswa'), applyRules, handleValidationErrors, controller.apply);

module.exports = router;
