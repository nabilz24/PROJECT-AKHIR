// Auth routes (TASK-010, api.md Bagian 2). Base: /api/v1/auth
const express = require('express');
const controller = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth');
const { handleValidationErrors } = require('../middlewares/validate');
const { authLimiter, loginLimiter } = require('../middlewares/rateLimit');
const {
  registerRules,
  loginRules,
  passwordResetRequestRules,
  passwordResetConfirmRules,
} = require('../validators/auth.validators');

const router = express.Router();

router.post('/register', authLimiter, registerRules, handleValidationErrors, controller.register);
router.post('/login', authLimiter, loginLimiter, loginRules, handleValidationErrors, controller.login);
router.post('/logout', authLimiter, authenticateToken, controller.logout);
router.get('/me', authLimiter, authenticateToken, controller.me);
router.post(
  '/password-reset',
  authLimiter,
  passwordResetRequestRules,
  handleValidationErrors,
  controller.requestPasswordReset
);
router.get('/password-reset/confirm/:token', authLimiter, controller.confirmPasswordResetToken);
router.post(
  '/password-reset/confirm/:token',
  authLimiter,
  passwordResetConfirmRules,
  handleValidationErrors,
  controller.resetPassword
);

module.exports = router;
