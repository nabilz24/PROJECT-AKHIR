// express-validator chains untuk Project Marketplace (TASK-040/041/042).
const { body, param, query } = require('express-validator');

function isTodayOrFuture(value) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(value).getTime() >= today.getTime();
}

const skillsArrayRules = [
  body('skills').isArray({ min: 1 }).withMessage('skills wajib array minimal 1 item'),
  body('skills.*.skill_id').isInt({ min: 1 }).withMessage('skills[].skill_id tidak valid').toInt(),
  body('skills.*.level_required')
    .isInt({ min: 0, max: 100 })
    .withMessage('skills[].level_required harus 0–100')
    .toInt(),
];

const projectCreateRules = [
  body('judul').trim().isLength({ min: 5, max: 150 }).withMessage('Judul 5–150 karakter'),
  body('deskripsi').optional().trim().isLength({ max: 5000 }).withMessage('Deskripsi maksimal 5000 karakter'),
  body('sektor_industri').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Sektor 2–50 karakter'),
  body('deadline')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('Deadline harus tanggal valid (YYYY-MM-DD)')
    .custom(isTodayOrFuture)
    .withMessage('Deadline harus hari ini atau masa depan'),
  body('status').optional().isIn(['draft', 'active']).withMessage('Status harus draft atau active'),
  body('difficulty').optional({ values: 'null' }).isIn(['easy', 'medium', 'hard']).withMessage('Difficulty harus easy, medium, atau hard'),
  body('match_score_threshold').optional().isInt({ min: 0, max: 100 }).withMessage('match_score_threshold harus 0–100').toInt(),
  ...skillsArrayRules,
];

const projectUpdateRules = [
  param('id').isInt({ min: 1 }).withMessage('id project tidak valid').toInt(),
  body('judul').optional().trim().isLength({ min: 5, max: 150 }).withMessage('Judul 5–150 karakter'),
  body('deskripsi').optional().trim().isLength({ max: 5000 }).withMessage('Deskripsi maksimal 5000 karakter'),
  body('sektor_industri').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Sektor 2–50 karakter'),
  body('deadline')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('Deadline harus tanggal valid (YYYY-MM-DD)')
    .custom(isTodayOrFuture)
    .withMessage('Deadline harus hari ini atau masa depan'),
  body('status').optional().isIn(['draft', 'active', 'closed']).withMessage('Status harus draft, active, atau closed'),
  body('difficulty').optional({ values: 'null' }).isIn(['easy', 'medium', 'hard']).withMessage('Difficulty harus easy, medium, atau hard'),
  body('match_score_threshold').optional().isInt({ min: 0, max: 100 }).withMessage('match_score_threshold harus 0–100').toInt(),
  body('skills').optional().isArray({ min: 1 }).withMessage('skills wajib array minimal 1 item'),
  body('skills.*.skill_id').optional().isInt({ min: 1 }).withMessage('skills[].skill_id tidak valid').toInt(),
  body('skills.*.level_required')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('skills[].level_required harus 0–100')
    .toInt(),
];

const projectIdRules = [param('id').isInt({ min: 1 }).withMessage('id project tidak valid').toInt()];

// Konvensi filter api.md: ?filter[field]=value (butuh query parser extended).
const marketplaceQueryRules = [
  query('filter.sektor_industri').optional().trim().isLength({ min: 2, max: 50 }).withMessage('filter sektor 2–50 karakter'),
  query('filter.skill').optional().trim().isLength({ min: 1, max: 50 }).withMessage('filter skill 1–50 karakter'),
  query('filter.difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('filter difficulty tidak dikenal'),
  query('filter.status').optional().isIn(['draft', 'active', 'closed']).withMessage('filter status tidak dikenal'),
  query('sort').optional().isIn(['terbaru', 'deadline', 'match_score']).withMessage('sort harus terbaru, deadline, atau match_score'),
  query('page').optional().isInt({ min: 1 }).withMessage('page minimal 1').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit 1–100').toInt(),
];

const applyRules = [
  param('id').isInt({ min: 1 }).withMessage('id project tidak valid').toInt(),
  body('cover_letter').optional({ values: 'null' }).trim().isLength({ max: 2000 }).withMessage('Cover letter maksimal 2000 karakter'),
  body('portfolio_url').optional({ values: 'null' }).trim().isURL().withMessage('portfolio_url harus URL valid').isLength({ max: 255 }).withMessage('portfolio_url maksimal 255 karakter'),
  body('skills_showcase').optional().isArray().withMessage('skills_showcase harus array skill_id'),
  body('skills_showcase.*').optional().isInt({ min: 1 }).withMessage('skills_showcase[] tidak valid').toInt(),
];

module.exports = {
  projectCreateRules,
  projectUpdateRules,
  projectIdRules,
  marketplaceQueryRules,
  applyRules,
};
