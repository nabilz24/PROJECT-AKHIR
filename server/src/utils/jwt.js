// JWT helpers (TASK-010, G_DESIGN security: expiry 24 jam).
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

function signAccessToken(user) {
  return jwt.sign({ role: user.role, purpose: 'access' }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: config.jwtExpiresIn,
    jwtid: crypto.randomUUID(),
  });
}

function signPasswordResetToken(user) {
  return jwt.sign({ role: user.role, purpose: 'password-reset' }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: config.jwtResetExpiresIn,
    jwtid: crypto.randomUUID(),
  });
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = { signAccessToken, signPasswordResetToken, verifyToken };
