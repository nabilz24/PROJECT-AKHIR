// Skill Gap routes (TASK-070/071/072, api.md Bagian 8). Base: /api/v1/gap-analysis
// Urutan penting: /student/:studentId didaftarkan SEBELUM /:studentId agar
// segmen literal 'student' tidak ditangkap sebagai param.
const express = require('express');
const controller = require('../controllers/gap.controller');
const { authenticateToken } = require('../middlewares/auth');
const { handleValidationErrors } = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/rateLimit');
const { gapParamsRules, gapStudentRules } = require('../validators/gap.validators');

const router = express.Router();

router.get('/student/:studentId', authLimiter, authenticateToken, gapStudentRules, handleValidationErrors, controller.distribution);
router.get('/:studentId/:projectId', authLimiter, authenticateToken, gapParamsRules, handleValidationErrors, controller.analyze);
router.get('/:studentId', authLimiter, authenticateToken, gapParamsRules, handleValidationErrors, controller.analyze);

module.exports = router;
