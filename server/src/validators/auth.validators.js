// express-validator chains untuk Auth API (TASK-010, api.md Bagian 2).
const { body, param } = require('express-validator');
const { PASSWORD_POLICY_MESSAGE } = require('../utils/password');

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const registerRules = [
  body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Nama 3–100 karakter'),
  body('email').trim().isEmail().withMessage('Email tidak valid').normalizeEmail(),
  body('password').matches(PASSWORD_REGEX).withMessage(PASSWORD_POLICY_MESSAGE),
  // TASK-010: registrasi publik untuk Mahasiswa/Perusahaan (+Kampus sesuai api.md).
  // [ASSUMPTION]: role 'dosen' dibuat oleh admin/kampus, bukan registrasi publik.
  body('role')
    .isIn(['mahasiswa', 'perusahaan', 'kampus'])
    .withMessage('Role harus salah satu: mahasiswa, perusahaan, kampus'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Email tidak valid').normalizeEmail(),
  body('password').notEmpty().withMessage('Password wajib diisi'),
];

const passwordResetRequestRules = [
  body('email').trim().isEmail().withMessage('Email tidak valid').normalizeEmail(),
];

const passwordResetConfirmRules = [
  param('token').notEmpty().withMessage('Token wajib diisi'),
  body('password').matches(PASSWORD_REGEX).withMessage(PASSWORD_POLICY_MESSAGE),
];

module.exports = {
  registerRules,
  loginRules,
  passwordResetRequestRules,
  passwordResetConfirmRules,
};
