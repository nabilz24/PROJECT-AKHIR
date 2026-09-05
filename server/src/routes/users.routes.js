// Users routes (TASK-020, TASK-021, api.md Bagian 3). Base: /api/v1/users
const express = require('express');
const controller = require('../controllers/users.controller');
const { authenticateToken } = require('../middlewares/auth');
const { handleValidationErrors } = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/rateLimit');
const { uploadPhoto } = require('../middlewares/upload');
const { profileRules } = require('../validators/users.validators');

const router = express.Router();

router.get('/profile', authLimiter, authenticateToken, controller.getProfile);
router.put('/profile', authLimiter, authenticateToken, profileRules, handleValidationErrors, controller.updateProfile);
router.post('/profile/photo-upload', authLimiter, authenticateToken, uploadPhoto, controller.uploadPhoto);
router.get('/redirect', authLimiter, authenticateToken, controller.redirect);

module.exports = router;
