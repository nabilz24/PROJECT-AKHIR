// Recommendations controller (TASK-080, TASK-081, api.md Bagian 9).
const { getDb } = require('../db/connection');
const { ok, fail } = require('../utils/response');
const { buildRecommendations } = require('../services/recommendation');
const { pushNotification } = require('../utils/notify');

function assertScope(req, res, studentId) {
  if (req.user.role === 'mahasiswa' && req.user.id !== Number(studentId)) {
    fail(res, 'Mahasiswa hanya bisa melihat rekomendasi sendiri', [], 403);
    return false;
  }
  return true;
}

// Generate idempotent: lewati (student, skill, type) yang masih aktif.
// Dipanggil otomatis setiap analisis gap (TASK-070 -> TASK-080).
// Mengembalikan jumlah rekomendasi BARU; kirim 1 notifikasi 'rec' bila ada.
function generateForStudent(db, studentId, gaps) {
  const built = buildRecommendations(gaps);
  const activeStmt = db.prepare(
    "SELECT id FROM recommendations WHERE student_id = ? AND skill_id IS ? AND type = ? AND status IN ('pending', 'in-progress')"
  );
  const insert = db.prepare(
    'INSERT INTO recommendations (student_id, skill_id, type, title, description, priority, source) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  let created = 0;
  const tx = db.transaction(() => {
    for (const r of built) {
      const exists = activeStmt.get(studentId, r.skill_id, r.type);
      if (!exists) {
        insert.run(studentId, r.skill_id, r.type, r.title, r.description, r.priority, r.source);
        created += 1;
      }
    }
  });
  tx();
  if (created > 0) {
    pushNotification(db, {
      recipientType: 'student',
      recipientId: studentId,
      type: 'rec',
      content: `${created} rekomendasi pembelajaran baru tersedia berdasarkan skill gap Anda.`,
    });
  }
  return created;
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

// GET /recommendations/student/:studentId — daftar + progres (TASK-080/081).
function listByStudent(req, res, next) {
  try {
    const db = getDb();
    const studentId = Number(req.params.studentId);
    if (!assertScope(req, res, studentId)) return undefined;
    const student = db.prepare('SELECT id FROM users WHERE id = ? AND role = ? AND deleted_at IS NULL').get(studentId, 'mahasiswa');
    if (!student) {
      return fail(res, 'Mahasiswa tidak ditemukan', [], 404);
    }
    const conds = ['student_id = ?'];
    const vals = [studentId];
    if (req.query.priority) {
      conds.push('priority = ?');
      vals.push(req.query.priority);
    }
    if (req.query.type) {
      conds.push('type = ?');
      vals.push(req.query.type);
    }
    const rows = db
      .prepare(`SELECT * FROM recommendations WHERE ${conds.join(' AND ')} ORDER BY id DESC`)
      .all(...vals);
    rows.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.id - a.id);
    const progress = { pending: 0, 'in-progress': 0, completed: 0, consumed: 0 };
    for (const r of db.prepare('SELECT status, COUNT(*) AS c FROM recommendations WHERE student_id = ? GROUP BY status').all(studentId)) {
      progress[r.status] = r.c;
    }
    return ok(res, { recommendations: rows, total: rows.length, progress }, 'OK');
  } catch (err) {
    return next(err);
  }
}

// POST /recommendations/:id/action — start/completed/consumed (TASK-081).
// Transisi: pending --start--> in-progress --completed--> completed; consumed dari mana saja.
function action(req, res, next) {
  try {
    const db = getDb();
    const rec = db.prepare('SELECT * FROM recommendations WHERE id = ?').get(req.params.id);
    if (!rec) {
      return fail(res, 'Rekomendasi tidak ditemukan', [], 404);
    }
    if (req.user.role === 'mahasiswa' && rec.student_id !== req.user.id) {
      return fail(res, 'Rekomendasi tidak ditemukan', [], 404);
    }
    const { action: act } = req.body;
    let next_status = null;
    if (act === 'start' && rec.status === 'pending') {
      next_status = 'in-progress';
    } else if (act === 'completed' && rec.status === 'in-progress') {
      next_status = 'completed';
    } else if (act === 'consumed' && rec.status !== 'consumed') {
      next_status = 'consumed';
    } else {
      return fail(res, `Aksi '${act}' tidak valid untuk status '${rec.status}'`, [], 400);
    }
    if (next_status === 'completed' || next_status === 'consumed') {
      db.prepare("UPDATE recommendations SET status = ?, consumed_at = datetime('now') WHERE id = ?").run(next_status, rec.id);
    } else {
      db.prepare('UPDATE recommendations SET status = ? WHERE id = ?').run(next_status, rec.id);
    }
    const updated = db.prepare('SELECT * FROM recommendations WHERE id = ?').get(rec.id);
    return ok(res, { recommendation: updated }, 'Status diupdate');
  } catch (err) {
    return next(err);
  }
}

module.exports = { generateForStudent, listByStudent, action };
