// express-validator chains untuk Matching Engine (TASK-060/061, api.md Bagian 5/6/7).
const { body, param, query } = require('express-validator');

const calculateRules = [
  body('student_id').isInt({ min: 1 }).withMessage('student_id tidak valid').toInt(),
  body('project_id').isInt({ min: 1 }).withMessage('project_id tidak valid').toInt(),
];

const rankingRules = [
  query('project_id').isInt({ min: 1 }).withMessage('project_id wajib diisi').toInt(),
  query('min_score').optional().isInt({ min: 0, max: 100 }).withMessage('min_score harus 0–100').toInt(),
];

const candidatesRules = [
  query('project_id').isInt({ min: 1 }).withMessage('project_id wajib diisi').toInt(),
  query('min_score').optional().isInt({ min: 0, max: 100 }).withMessage('min_score harus 0–100').toInt(),
  query('skill').optional().trim().isLength({ min: 1, max: 50 }).withMessage('skill 1–50 karakter'),
];

const matchParamRules = [param('id').isInt({ min: 1 }).withMessage('id project tidak valid').toInt()];

module.exports = { calculateRules, rankingRules, candidatesRules, matchParamRules };
