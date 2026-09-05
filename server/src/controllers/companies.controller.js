// Company Projects controller (TASK-040, TASK-050, api.md Bagian 5).
// Semua operasi ter-skup ke perusahaan milik user yang login.
const { getDb } = require('../db/connection');
const { ok, created, fail } = require('../utils/response');
const { fetchProjectFull } = require('../utils/project');
const { pushNotification, notifyEmail } = require('../utils/notify');
const { logAudit } = require('../middlewares/audit');

function ownCompany(db, userId) {
  return db.prepare('SELECT * FROM companies WHERE user_id = ?').get(userId);
}

function assertSkillsExist(db, skills) {
  const ids = [...new Set(skills.map((s) => s.skill_id))];
  const placeholders = ids.map(() => '?').join(',');
  const found = db.prepare(`SELECT id FROM skills WHERE id IN (${placeholders})`).all(...ids).map((r) => r.id);
  return ids.filter((id) => !found.includes(id));
}

// POST /companies/projects — TASK-040 (+TC-CMP-001). Hanya perusahaan terverifikasi.
function createProject(req, res, next) {
  try {
    const db = getDb();
    const company = ownCompany(db, req.user.id);
    if (!company) {
      return fail(res, 'Profil perusahaan belum tersedia', [], 400);
    }
    if (!company.verified_status) {
      return fail(res, 'Perusahaan belum terverifikasi — hubungi admin kampus', [], 403);
    }
    const { judul, deskripsi = null, sektor_industri = null, deadline = null, status = 'draft', difficulty = null, match_score_threshold = 70, skills } = req.body;
    const missing = assertSkillsExist(db, skills);
    if (missing.length > 0) {
      return fail(res, `Skill tidak ada di taxonomy: ${missing.join(', ')}`, [{ field: 'skills', message: 'Skill tidak ada di taxonomy' }], 404);
    }
    const tx = db.transaction(() => {
      const result = db
        .prepare('INSERT INTO projects (company_id, judul, deskripsi, sektor_industri, deadline, status, difficulty, match_score_threshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(company.id, judul, deskripsi, sektor_industri, deadline, status, difficulty, match_score_threshold);
      const insertSkill = db.prepare('INSERT INTO project_skills (project_id, skill_id, level_required) VALUES (?, ?, ?)');
      for (const s of skills) {
        insertSkill.run(result.lastInsertRowid, s.skill_id, s.level_required);
      }
      return result.lastInsertRowid;
    });
    const projectId = tx();
    logAudit({ userId: req.user.id, action: 'create_project', entityType: 'project', entityId: projectId, req });
    return created(res, { project: fetchProjectFull(db, projectId) }, 'Project dibuat');
  } catch (err) {
    return next(err);
  }
}

// GET /companies/projects — daftar project milik sendiri (+jumlah pelamar).
function listMyProjects(req, res, next) {
  try {
    const db = getDb();
    const company = ownCompany(db, req.user.id);
    if (!company) {
      return ok(res, { projects: [], pagination: { page: 1, limit: 15, total: 0 } }, 'OK');
    }
    const filter = req.query.filter || {};
    const sort = req.query.sort || 'terbaru';
    const page = req.query.page || 1;
    const limit = req.query.limit || 15;
    const conds = ['p.company_id = ?', 'p.deleted_at IS NULL'];
    const vals = [company.id];
    if (filter.status) {
      conds.push('p.status = ?');
      vals.push(filter.status);
    }
    const order = sort === 'deadline' ? 'p.deadline ASC' : 'p.created_at DESC, p.id DESC';
    const total = db.prepare(`SELECT COUNT(*) AS c FROM projects p WHERE ${conds.join(' AND ')}`).get(...vals).c;
    const rows = db
      .prepare(`SELECT p.* FROM projects p WHERE ${conds.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`)
      .all(...vals, limit, (page - 1) * limit);
    const projects = rows.map((p) => {
      const full = fetchProjectFull(db, p.id);
      const applicants = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE project_id = ? AND status IN ('pending', 'accepted')").get(p.id).c;
      return { ...full, applications_count: applicants };
    });
    return ok(res, { projects, pagination: { page, limit, total } }, 'OK');
  } catch (err) {
    return next(err);
  }
}

// GET /companies/projects/:id — detail milik sendiri.
function getMyProject(req, res, next) {
  try {
    const db = getDb();
    const company = ownCompany(db, req.user.id);
    const full = fetchProjectFull(db, req.params.id);
    if (!company || !full || full.company_id !== company.id) {
      return fail(res, 'Project tidak ditemukan', [], 404);
    }
    return ok(res, { project: full }, 'OK');
  } catch (err) {
    return next(err);
  }
}

// PUT /companies/projects/:id — edit milik sendiri (skills = replace penuh bila dikirim).
function updateMyProject(req, res, next) {
  try {
    const db = getDb();
    const company = ownCompany(db, req.user.id);
    const full = fetchProjectFull(db, req.params.id);
    if (!company || !full || full.company_id !== company.id) {
      return fail(res, 'Project tidak ditemukan', [], 404);
    }
    const { judul, deskripsi, sektor_industri, deadline, status, difficulty, match_score_threshold, skills } = req.body;
    if (skills !== undefined) {
      const missing = assertSkillsExist(db, skills);
      if (missing.length > 0) {
        return fail(res, `Skill tidak ada di taxonomy: ${missing.join(', ')}`, [{ field: 'skills', message: 'Skill tidak ada di taxonomy' }], 404);
      }
    }
    const tx = db.transaction(() => {
      const sets = [];
      const vals = [];
      for (const [k, v] of Object.entries({ judul, deskripsi, sektor_industri, deadline, status, difficulty, match_score_threshold })) {
        if (v !== undefined) {
          sets.push(`${k} = ?`);
          vals.push(v);
        }
      }
      if (sets.length > 0) {
        db.prepare(`UPDATE projects SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...vals, full.id);
      }
      if (skills !== undefined) {
        db.prepare('DELETE FROM project_skills WHERE project_id = ?').run(full.id);
        const insertSkill = db.prepare('INSERT INTO project_skills (project_id, skill_id, level_required) VALUES (?, ?, ?)');
        for (const s of skills) {
          insertSkill.run(full.id, s.skill_id, s.level_required);
        }
      }
    });
    tx();
    logAudit({ userId: req.user.id, action: 'create_project', entityType: 'project', entityId: full.id, req });
    return ok(res, { project: fetchProjectFull(db, full.id) }, 'Project diupdate');
  } catch (err) {
    return next(err);
  }
}

// DELETE /companies/projects/:id — soft-delete milik sendiri.
function deleteMyProject(req, res, next) {
  try {
    const db = getDb();
    const company = ownCompany(db, req.user.id);
    const full = fetchProjectFull(db, req.params.id);
    if (!company || !full || full.company_id !== company.id) {
      return fail(res, 'Project tidak ditemukan', [], 404);
    }
    db.prepare("UPDATE projects SET deleted_at = datetime('now') WHERE id = ?").run(full.id);
    return ok(res, null, 'Project dihapus');
  } catch (err) {
    return next(err);
  }
}

// GET /companies/projects/:projectId/applications — daftar pelamar project milik sendiri.
function listProjectApplications(req, res, next) {
  try {
    const db = getDb();
    const company = ownCompany(db, req.user.id);
    const full = fetchProjectFull(db, req.params.projectId);
    if (!company || !full || full.company_id !== company.id) {
      return fail(res, 'Project tidak ditemukan', [], 404);
    }
    const filter = req.query.filter || {};
    const conds = ['a.project_id = ?'];
    const vals = [full.id];
    if (filter.status) {
      conds.push('a.status = ?');
      vals.push(filter.status);
    }
    const rows = db
      .prepare(
        `SELECT a.*, u.name AS student_name, u.email AS student_email
         FROM applications a JOIN users u ON u.id = a.student_id
         WHERE ${conds.join(' AND ')} ORDER BY a.applied_at DESC, a.id DESC`
      )
      .all(...vals);
    const skillStmt = db.prepare(
      `SELECT s.id AS skill_id, s.name, ss.proficiency_level
       FROM student_skills ss JOIN skills s ON s.id = ss.skill_id
       WHERE ss.student_id = ? ORDER BY s.name`
    );
    const applications = rows.map((a) => ({
      ...a,
      student: { id: a.student_id, name: a.student_name, email: a.student_email },
      skills: skillStmt.all(a.student_id),
    }));
    return ok(res, { applications, total: applications.length }, 'OK');
  } catch (err) {
    return next(err);
  }
}

// PATCH /companies/applications/:id — terima/tolak pelamar (TASK-050, TC-CMP-003).
// Hanya aplikasi pending yang bisa diubah; milik project perusahaan sendiri.
function updateApplicationStatus(req, res, next) {
  try {
    const db = getDb();
    const company = ownCompany(db, req.user.id);
    const app = db
      .prepare(
        `SELECT a.*, p.judul AS project_judul, p.company_id, u.name AS student_name, u.email AS student_email
         FROM applications a
         JOIN projects p ON p.id = a.project_id
         JOIN users u ON u.id = a.student_id
         WHERE a.id = ?`
      )
      .get(req.params.id);
    if (!company || !app || app.company_id !== company.id) {
      return fail(res, 'Aplikasi tidak ditemukan', [], 404);
    }
    if (app.status !== 'pending') {
      return fail(res, `Hanya aplikasi pending yang bisa diubah (status saat ini: ${app.status})`, [], 400);
    }
    const { status } = req.body; // accepted | rejected (divalidasi)
    db.prepare("UPDATE applications SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, app.id);
    const statusId = status === 'accepted' ? 'diterima' : 'ditolak';
    // TASK-051: notifikasi in-app + email (simulasi) ke mahasiswa.
    pushNotification(db, {
      recipientType: 'student',
      recipientId: app.student_id,
      type: 'apply',
      content: `Halo ${app.student_name}, aplikasi Anda untuk project "${app.project_judul}" berstatus ${statusId}.`,
    });
    notifyEmail({
      to: app.student_email,
      subject: `Aplikasi project "${app.project_judul}" ${statusId}`,
      body: `Halo ${app.student_name}, aplikasi Anda untuk project "${app.project_judul}" berstatus ${statusId}. (simulasi)`,
      meta: { kind: 'application-status', applicationId: app.id, status },
    });
    logAudit({ userId: req.user.id, action: 'apply_project', entityType: 'application', entityId: app.id, req });
    const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(app.id);
    return ok(res, { application: updated }, `Aplikasi ${statusId}`);
  } catch (err) {
    return next(err);
  }
}

module.exports = { createProject, listMyProjects, getMyProject, updateMyProject, deleteMyProject, listProjectApplications, updateApplicationStatus };
