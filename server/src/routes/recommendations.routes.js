// Recommendation routes (TASK-080/081, api.md Bagian 9). Base: /api/v1/recommendations
const express = require('express');
const controller = require('../controllers/recommendations.controller');
const { authenticateToken } = require('../middlewares/auth');
const { handleValidationErrors } = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/rateLimit');
const { recStudentRules, recActionRules } = require('../validators/recommendations.validators');

const router = express.Router();

router.get('/student/:studentId', authLimiter, authenticateToken, recStudentRules, handleValidationErrors, controller.listByStudent);
router.post('/:id/action', authLimiter, authenticateToken, recActionRules, handleValidationErrors, controller.action);

module.exports = router;
