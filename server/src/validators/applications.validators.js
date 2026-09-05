// express-validator chains untuk Application & Notification API (TASK-050/051).
const { body, param, query } = require('express-validator');

const applicationIdRules = [param('id').isInt({ min: 1 }).withMessage('id aplikasi tidak valid').toInt()];

const applicationStatusRules = [
  ...applicationIdRules,
  body('status').isIn(['accepted', 'rejected']).withMessage('status harus accepted atau rejected'),
];

const projectApplicationsQueryRules = [
  param('projectId').isInt({ min: 1 }).withMessage('id project tidak valid').toInt(),
  query('filter.status').optional().isIn(['pending', 'accepted', 'rejected']).withMessage('filter status tidak dikenal'),
];

const notificationsQueryRules = [
  query('type').optional().isIn(['apply', 'match', 'gap', 'rec', 'eval', 'system']).withMessage('type tidak dikenal'),
  query('is_read').optional().isIn(['0', '1']).withMessage('is_read harus 0 atau 1'),
  query('page').optional().isInt({ min: 1 }).withMessage('page minimal 1').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit 1–100').toInt(),
];

const notificationIdRules = [param('id').isInt({ min: 1 }).withMessage('id notifikasi tidak valid').toInt()];

module.exports = {
  applicationIdRules,
  applicationStatusRules,
  projectApplicationsQueryRules,
  notificationsQueryRules,
  notificationIdRules,
};
