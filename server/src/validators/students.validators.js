// express-validator chains untuk Student Skills API (TASK-031, api.md Bagian 4).
const { body, param, query } = require('express-validator');
const { VALID_CATEGORIES } = require('../utils/proficiency');

const studentSkillCreateRules = [
  body('skill_id').isInt({ min: 1 }).withMessage('skill_id wajib berupa id taxonomy').toInt(),
  // Level numerik 0–100 ATAU kategori; salah satu wajib ada (dicek di controller).
  body('proficiency_level')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('proficiency_level harus 0–100')
    .toInt(),
  body('proficiency_category')
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage(`proficiency_category harus salah satu: ${VALID_CATEGORIES.join(', ')}`),
  body('source')
    .isIn(['course', 'certification', 'experience'])
    .withMessage('source harus salah satu: course, certification, experience'),
];

const studentSkillUpdateRules = [
  param('skill_id').isInt({ min: 1 }).withMessage('skill_id tidak valid').toInt(),
  body('proficiency_level')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('proficiency_level harus 0–100')
    .toInt(),
  body('proficiency_category')
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage(`proficiency_category harus salah satu: ${VALID_CATEGORIES.join(', ')}`),
  body('source')
    .optional()
    .isIn(['course', 'certification', 'experience'])
    .withMessage('source harus salah satu: course, certification, experience'),
];

const studentSkillIdRules = [
  param('skill_id').isInt({ min: 1 }).withMessage('skill_id tidak valid').toInt(),
];

const skillsQueryRules = [
  query('category')
    .optional()
    .isIn(['technical', 'soft-skill', 'certification', 'tool'])
    .withMessage('category tidak dikenal'),
  query('search').optional().trim().isLength({ max: 50 }).withMessage('search maksimal 50 karakter'),
];

module.exports = {
  studentSkillCreateRules,
  studentSkillUpdateRules,
  studentSkillIdRules,
  skillsQueryRules,
};
