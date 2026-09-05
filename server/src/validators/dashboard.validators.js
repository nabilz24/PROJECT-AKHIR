// Validators untuk Dashboard & Analytics (TASK-100..103).
const { query } = require('express-validator');

const analyticsQueryRules = [
  query('program_studi').optional().trim().isLength({ min: 2, max: 50 }).withMessage('program_studi 2–50 karakter'),
  query('period').optional().isIn(['last_30_days', 'last_6_months', 'all']).withMessage('period tidak dikenal'),
  query('format').optional().isIn(['csv', 'png', 'pdf']).withMessage('format tidak dikenal'),
];

module.exports = { analyticsQueryRules };
