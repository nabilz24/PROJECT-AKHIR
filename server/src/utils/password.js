// Password helpers (TASK-010, G_DESIGN security).
// Policy: minimal 8 karakter + kombinasi huruf, angka, karakter spesial.
const bcrypt = require('bcrypt');
const config = require('../config');

const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const PASSWORD_POLICY_MESSAGE =
  'Password minimal 8 karakter dan mengandung huruf, angka, dan karakter spesial';

function meetsPasswordPolicy(password) {
  return typeof password === 'string' && PASSWORD_POLICY.test(password);
}

async function hashPassword(password) {
  return bcrypt.hash(password, config.bcryptRounds);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = { PASSWORD_POLICY_MESSAGE, meetsPasswordPolicy, hashPassword, comparePassword };
