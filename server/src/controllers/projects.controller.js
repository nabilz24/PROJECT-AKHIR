// Project Marketplace controller (TASK-041, TASK-042, api.md Bagian 6).
const { getDb } = require('../db/connection');
const { ok, created, fail } = require('../utils/response');
const { fetchProjectFull, overlapScore } = require('../utils/project');
const { pushNotification, notifyEmail } = require('../utils/notify');
const { logAudit } = require('../middlewares/audit');

function studentSkillIds(db, studentId) {
  return db.prepare('SELECT skill_id FROM student_skills WHERE student_id = ?').all(studentId).map((r) => r.skill_id);
}

// GET /projects — browse (publik; match_score hanya bila login sebagai mahasiswa).
function browse(req, res, next) {
  try {
    const db = getDb();
    const filter = req.query.filter || {};
    const sort = req.query.sort || 'terbaru';
    const page = req.query.page || 1;
    const limit = req.query.limit || 15;
    const asStudent = req.user && req.user.role === 'mahasiswa' ? req.user : null;

    if (sort === 'match_score' && !asStudent) {
      return fail(res, 'Sort match_score membutuhkan login sebagai mahasiswa', [], 422);
    }

    const conds = ["p.status = 'active'", 'p.deleted_at IS NULL'];
    const vals = [];
    if (filter.sektor_industri) {
      conds.push('p.sektor_industri = ?');
      vals.push(filter.sektor_industri);
    }
    if (filter.difficulty) {
      conds.push('p.difficulty = ?');
      vals.push(filter.difficulty);
    }
    if (filter.skill) {
      conds.push(`EXISTS (SELECT 1 FROM project_skills ps JOIN skills s ON s.id = ps.skill_id WHERE ps.project_id = p.id AND s.name LIKE ?)`);
      vals.push(`%${filter.skill}%`);
    }
    const ids = db.prepare(`SELECT p.id FROM projects p WHERE ${conds.join(' AND ')}`).all(...vals).map((r) => r.id);

    let items = ids.map((id) => fetchProjectFull(db, id)).filter(Boolean);
    if (sort === 'match_score' && asStudent) {
      // PRELIMINARY (TASK-041): urut berdasarkan overlap skill; digantikan formula
      // otoritatif Phase 6 (TASK-060). Lihat utils/project.js.
      const owned = studentSkillIds(db, asStudent.id);
      items = items
        .map((p) => ({ ...p, match_score: overlapScore(p.skills.map((s) => s.skill_id), owned) }))
        .sort((a, b) => b.match_score - a.match_score || b.id - a.id);
    } else if (sort === 'deadline') {
      items.sort((a, b) => (a.deadline || 'zzzz').localeCompare(b.deadline || 'zzzz'));
    } else {
      items.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
    }

    const total = items.length;
    const paged = items.slice((page - 1) * limit, page * limit);
    return ok(res, { projects: paged, pagination: { page, limit, total } }, 'OK');
  } catch (err) {
    return next(err);
  }
}

// GET /projects/:id — detail publik + info perusahaan + skills.
function detail(req, res, next) {
  try {
    const db = getDb();
    const full = fetchProjectFull(db, req.params.id);
    if (!full || full.status !== 'active') {
      return fail(res, 'Project tidak ditemukan', [], 404);
    }
    if (req.user && req.user.role === 'mahasiswa') {
      const owned = studentSkillIds(db, req.user.id);
      full.match_score = overlapScore(full.skills.map((s) => s.skill_id), owned);
    }
    return ok(res, { project: full }, 'OK');
  } catch (err) {
    return next(err);
  }
}

// POST /projects/:id/apply — mahasiswa mendaftar (TASK-042, TC-STU-004 parsial).
// [ASSUMPTION] "minimal skill requirement terpenuhi" = mahasiswa memiliki SEMUA
// skill_id yang disyaratkan (tanpa memandang level; kesenjangan level ditangani
// Skill Gap Phase 7). Notifikasi ke perusahaan menyusul Phase 5 (TASK-051).
function apply(req, res, next) {
  try {
    const db = getDb();
    const full = fetchProjectFull(db, req.params.id);
    if (!full) {
      return fail(res, 'Project tidak ditemukan', [], 404);
    }
    if (full.status !== 'active') {
      return fail(res, 'Project tidak menerima aplikasi (status bukan active)', [], 400);
    }
    const existing = db
      .prepare("SELECT id FROM applications WHERE student_id = ? AND project_id = ? AND status IN ('pending', 'accepted')")
      .get(req.user.id, full.id);
    if (existing) {
      return fail(res, 'Anda sudah mendaftar project ini', [], 400);
    }
    const owned = studentSkillIds(db, req.user.id);
    const ownedSet = new Set(owned);
    const missing = full.skills.filter((s) => !ownedSet.has(s.skill_id));
    if (missing.length > 0) {
      return fail(
        res,
        `Skill requirement belum terpenuhi: ${missing.map((s) => s.name).join(', ')}`,
        missing.map((s) => ({ field: 'skills', message: `Belum memiliki skill: ${s.name}` })),
        400
      );
    }
    const showcase = req.body.skills_showcase || [];
    const notOwned = showcase.filter((id) => !ownedSet.has(id));
    if (notOwned.length > 0) {
      return fail(res, 'skills_showcase memuat skill yang tidak Anda miliki', [{ field: 'skills_showcase', message: 'Skill showcase harus milik sendiri' }], 400);
    }
    const { cover_letter = null, portfolio_url = null } = req.body;
    const result = db
      .prepare('INSERT INTO applications (student_id, project_id, status, cover_letter, portfolio_url) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, full.id, 'pending', cover_letter, portfolio_url);
    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(result.lastInsertRowid);
    logAudit({ userId: req.user.id, action: 'apply_project', entityType: 'application', entityId: application.id, req });
    // TASK-051: notifikasi in-app + email (simulasi) ke perusahaan.
    const companyUser = db
      .prepare('SELECT u.id, u.email FROM users u JOIN companies c ON c.user_id = u.id WHERE c.id = ?')
      .get(full.company_id);
    if (companyUser) {
      pushNotification(db, {
        recipientType: 'company',
        recipientId: companyUser.id,
        type: 'apply',
        content: `Aplikasi baru dari ${req.user.name} untuk project "${full.judul}" (status: pending)`,
      });
      notifyEmail({
        to: companyUser.email,
        subject: `Aplikasi baru untuk project "${full.judul}"`,
        body: `${req.user.name} (${req.user.email}) mendaftar ke project "${full.judul}". Status: pending. (simulasi)`,
        meta: { kind: 'application-new', applicationId: application.id },
      });
    }
    return created(res, { application }, 'Aplikasi terkirim');
  } catch (err) {
    return next(err);
  }
}

module.exports = { browse, detail, apply };
