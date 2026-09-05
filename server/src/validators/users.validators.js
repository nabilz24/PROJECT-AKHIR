// express-validator chains untuk Users/Profile API (TASK-020, api.md Bagian 3).
const { body } = require('express-validator');

// database.md: npm CHAR(8) UNIQUE; angkatan YEAR -> INTEGER.
const profileRules = [
  body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Nama 3–100 karakter'),
  body('npm')
    .optional({ values: 'null' })
    .trim()
    .isLength({ min: 8, max: 8 })
    .withMessage('NPM harus 8 karakter'),
  body('program_studi')
    .optional({ values: 'null' })
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Program studi 2–50 karakter'),
  body('angkatan')
    .optional({ values: 'null' })
    .isInt({ min: 1900, max: 2100 })
    .withMessage('Angkatan harus tahun valid')
    .toInt(),
  body('bio')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio maksimal 1000 karakter'),
  body('foto_profile')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('URL foto maksimal 255 karakter'),
  // Company fields (TASK-020: field berbeda per role).
  body('nama_perusahaan')
    .optional({ values: 'null' })
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Nama perusahaan 3–100 karakter'),
  body('industri')
    .optional({ values: 'null' })
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Industri 2–50 karakter'),
  body('size')
    .optional({ values: 'null' })
    .isIn(['startup', 'medium', 'large', 'corporate'])
    .withMessage('Size harus salah satu: startup, medium, large, corporate'),
  body('deskripsi')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Deskripsi maksimal 2000 karakter'),
];

module.exports = { profileRules };
