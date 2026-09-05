// Skills taxonomy routes (TASK-030). Base: /api/v1/skills
const express = require('express');
const controller = require('../controllers/skills.controller');
const { authenticateToken } = require('../middlewares/auth');
const { handleValidationErrors } = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/rateLimit');
const { skillsQueryRules } = require('../validators/students.validators');

const router = express.Router();

router.get('/', authLimiter, authenticateToken, skillsQueryRules, handleValidationErrors, controller.listSkills);

module.exports = router;
