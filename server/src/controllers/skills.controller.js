// Skills taxonomy controller (TASK-030).
const { getDb } = require('../db/connection');
const { ok } = require('../utils/response');

// GET /skills — daftar taxonomy (filter ?category= & ?search= untuk dropdown frontend).
function listSkills(req, res, next) {
  try {
    const db = getDb();
    const { category, search } = req.query;
    const conds = [];
    const vals = [];
    if (category) {
      conds.push('category = ?');
      vals.push(category);
    }
    if (search) {
      conds.push('name LIKE ?');
      vals.push(`%${search}%`);
    }
    const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
    const rows = db
      .prepare(`SELECT id, name, category, description, level_scale_default FROM skills ${where} ORDER BY name`)
      .all(...vals);
    return ok(res, { skills: rows, total: rows.length }, 'OK');
  } catch (err) {
    return next(err);
  }
}

module.exports = { listSkills };
