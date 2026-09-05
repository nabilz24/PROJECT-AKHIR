// Notifications controller (TASK-051, api.md Bagian 11).
const { getDb } = require('../db/connection');
const { ok, fail } = require('../utils/response');

// GET /notifications — notifikasi milik user login (?type=&?is_read=).
function listMine(req, res, next) {
  try {
    const db = getDb();
    const page = req.query.page || 1;
    const limit = req.query.limit || 15;
    const conds = ['recipient_id = ?'];
    const vals = [req.user.id];
    if (req.query.type) {
      conds.push('type = ?');
      vals.push(req.query.type);
    }
    if (req.query.is_read !== undefined) {
      conds.push('is_read = ?');
      vals.push(parseInt(req.query.is_read, 10));
    }
    const total = db.prepare(`SELECT COUNT(*) AS c FROM notifications WHERE ${conds.join(' AND ')}`).get(...vals).c;
    const rows = db
      .prepare(`SELECT * FROM notifications WHERE ${conds.join(' AND ')} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
      .all(...vals, limit, (page - 1) * limit);
    return ok(res, { notifications: rows, pagination: { page, limit, total } }, 'OK');
  } catch (err) {
    return next(err);
  }
}

// PUT /notifications/:id/read — tandai milik sendiri sebagai dibaca.
function markRead(req, res, next) {
  try {
    const db = getDb();
    const notif = db.prepare('SELECT id FROM notifications WHERE id = ? AND recipient_id = ?').get(req.params.id, req.user.id);
    if (!notif) {
      return fail(res, 'Notifikasi tidak ditemukan', [], 404);
    }
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
    return ok(res, null, 'Notifikasi ditandai sebagai baca');
  } catch (err) {
    return next(err);
  }
}

module.exports = { listMine, markRead };
