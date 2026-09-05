// Student routes (TASK-031, TASK-032, api.md Bagian 4). Base: /api/v1/students
const express = require('express');
const controller = require('../controllers/students.controller');
const { authenticateToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const { handleValidationErrors } = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/rateLimit');
const {
  studentSkillCreateRules,
  studentSkillUpdateRules,
  studentSkillIdRules,
} = require('../validators/students.validators');

const router = express.Router();
const onlyStudent = requireRole('mahasiswa');

router.get('/skills', authLimiter, authenticateToken, onlyStudent, controller.listMySkills);
router.post('/skills', authLimiter, authenticateToken, onlyStudent, studentSkillCreateRules, handleValidationErrors, controller.addMySkill);
router.put('/skills/:skill_id', authLimiter, authenticateToken, onlyStudent, studentSkillUpdateRules, handleValidationErrors, controller.updateMySkill);
router.delete('/skills/:skill_id', authLimiter, authenticateToken, onlyStudent, studentSkillIdRules, handleValidationErrors, controller.deleteMySkill);

module.exports = router;
