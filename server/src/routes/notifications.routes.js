// Notification routes (TASK-051, api.md Bagian 11). Base: /api/v1/notifications
const express = require('express');
const controller = require('../controllers/notifications.controller');
const { authenticateToken } = require('../middlewares/auth');
const { handleValidationErrors } = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/rateLimit');
const { notificationsQueryRules, notificationIdRules } = require('../validators/applications.validators');

const router = express.Router();

router.get('/', authLimiter, authenticateToken, notificationsQueryRules, handleValidationErrors, controller.listMine);
router.put('/:id/read', authLimiter, authenticateToken, notificationIdRules, handleValidationErrors, controller.markRead);

module.exports = router;
