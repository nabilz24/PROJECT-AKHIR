// Company routes (TASK-040, api.md Bagian 5). Base: /api/v1/companies
const express = require('express');
const controller = require('../controllers/companies.controller');
const { authenticateToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const { handleValidationErrors } = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/rateLimit');
const {
  projectCreateRules,
  projectUpdateRules,
  projectIdRules,
  marketplaceQueryRules,
} = require('../validators/projects.validators');

const router = express.Router();
const onlyCompany = requireRole('perusahaan');

router.post('/projects', authLimiter, authenticateToken, onlyCompany, projectCreateRules, handleValidationErrors, controller.createProject);
router.get('/projects', authLimiter, authenticateToken, onlyCompany, marketplaceQueryRules, handleValidationErrors, controller.listMyProjects);
router.get('/projects/:id', authLimiter, authenticateToken, onlyCompany, projectIdRules, handleValidationErrors, controller.getMyProject);
router.put('/projects/:id', authLimiter, authenticateToken, onlyCompany, projectUpdateRules, handleValidationErrors, controller.updateMyProject);
router.delete('/projects/:id', authLimiter, authenticateToken, onlyCompany, projectIdRules, handleValidationErrors, controller.deleteMyProject);

module.exports = router;
