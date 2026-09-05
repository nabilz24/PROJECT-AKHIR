// Assessment & Evaluation routes (TASK-090/091/092, api.md Bagian 10). Base: /api/v1
const express = require('express');
const controller = require('../controllers/assessments.controller');
const { authenticateToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const { handleValidationErrors } = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/rateLimit');
const { assessmentCreateRules, evalParamRules, assessmentUpdateRules } = require('../validators/assessments.validators');

const router = express.Router();

router.post(
  '/assessments',
  authLimiter,
  authenticateToken,
  requireRole('perusahaan', 'dosen'),
  assessmentCreateRules,
  handleValidationErrors,
  controller.createAssessment
);
router.get(
  '/evaluations/:projectId/:studentId',
  authLimiter,
  authenticateToken,
  evalParamRules,
  handleValidationErrors,
  controller.getEvaluation
);
router.put(
  '/evaluations/:projectId/:studentId',
  authLimiter,
  authenticateToken,
  requireRole('perusahaan', 'dosen'),
  assessmentUpdateRules,
  handleValidationErrors,
  controller.updateEvaluation
);

module.exports = router;
