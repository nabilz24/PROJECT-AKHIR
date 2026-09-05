// express-validator chains untuk Skill Gap API (TASK-070, api.md Bagian 8).
const { param } = require('express-validator');

const gapParamsRules = [
  param('studentId').isInt({ min: 1 }).withMessage('studentId tidak valid').toInt(),
  param('projectId').optional().isInt({ min: 1 }).withMessage('projectId tidak valid').toInt(),
];

const gapStudentRules = [param('studentId').isInt({ min: 1 }).withMessage('studentId tidak valid').toInt()];

module.exports = { gapParamsRules, gapStudentRules };
