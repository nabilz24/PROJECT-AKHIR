// express-validator chains untuk Recommendation API (TASK-080/081, api.md Bagian 9).
const { body, param, query } = require('express-validator');

const recStudentRules = [
  param('studentId').isInt({ min: 1 }).withMessage('studentId tidak valid').toInt(),
  query('priority').optional().isIn(['high', 'medium', 'low']).withMessage('priority tidak dikenal'),
  query('type').optional().isIn(['course', 'workshop', 'certification', 'practice-project', 'mentor']).withMessage('type tidak dikenal'),
];

const recActionRules = [
  param('id').isInt({ min: 1 }).withMessage('id rekomendasi tidak valid').toInt(),
  body('action').isIn(['start', 'completed', 'consumed']).withMessage('action harus start, completed, atau consumed'),
];

module.exports = { recStudentRules, recActionRules };
