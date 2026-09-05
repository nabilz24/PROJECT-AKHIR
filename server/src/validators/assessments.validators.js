// express-validator chains untuk Assessment API (TASK-090, api.md Bagian 10).
const { body, param } = require('express-validator');

const rating = (field) =>
  body(field).isInt({ min: 1, max: 5 }).withMessage(`${field} harus 1–5`).toInt();

const assessmentCreateRules = [
  body('project_id').isInt({ min: 1 }).withMessage('project_id tidak valid').toInt(),
  body('student_id').isInt({ min: 1 }).withMessage('student_id tidak valid').toInt(),
  rating('rating_skill'),
  rating('rating_communication'),
  rating('rating_punctuality'),
  rating('rating_overall'),
  body('comments').optional({ values: 'null' }).trim().isLength({ max: 2000 }).withMessage('Komentar maksimal 2000 karakter'),
];

const evalParamRules = [
  param('projectId').isInt({ min: 1 }).withMessage('projectId tidak valid').toInt(),
  param('studentId').isInt({ min: 1 }).withMessage('studentId tidak valid').toInt(),
];

const assessmentUpdateRules = [
  ...evalParamRules,
  body('rating_skill').optional().isInt({ min: 1, max: 5 }).withMessage('rating_skill harus 1–5').toInt(),
  body('rating_communication').optional().isInt({ min: 1, max: 5 }).withMessage('rating_communication harus 1–5').toInt(),
  body('rating_punctuality').optional().isInt({ min: 1, max: 5 }).withMessage('rating_punctuality harus 1–5').toInt(),
  body('rating_overall').optional().isInt({ min: 1, max: 5 }).withMessage('rating_overall harus 1–5').toInt(),
  body('comments').optional({ values: 'null' }).trim().isLength({ max: 2000 }).withMessage('Komentar maksimal 2000 karakter'),
];

module.exports = { assessmentCreateRules, evalParamRules, assessmentUpdateRules };
