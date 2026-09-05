// Assessment & Evaluation controller (TASK-090/091/092, api.md Bagian 10).
const { getDb } = require('../db/connection');
const { ok, created, fail } = require('../utils/response');
const { pushNotification } = require('../utils/notify');
const { logAudit } = require('../middlewares/audit');

// [ASSUMPTION] pemetaan TASK-092 "naik 5–10 poin": rating_skill >= 4 -> +10,
// rating_skill == 3 -> +5, di bawah itu 0. Cap 100. Hanya skill project yang
// sudah dimiliki mahasiswa yang di-bump; riwayat via audit old/new value.
function skillBump(ratingSkill) {
  if (ratingSkill >= 4) return 10;
  if (ratingSkill === 3) return 5;
  return 0;
}

function buildEvaluation(db, assessmentId, ratings, comments) {
  const overall = Math.round((ratings.skill + ratings.communication + ratings.punctuality + ratings.overall) / 4);
  const category = JSON.stringify({
    skill: ratings.skill,
    communication: ratings.communication,
    punctuality: ratings.punctuality,
    overall: ratings.overall,
  });
  const existing = db.prepare('SELECT id FROM project_evaluations WHERE assessment_id = ?').get(assessmentId);
  if (existing) {
    db.prepare('UPDATE project_evaluations SET overall_rating = ?, category_ratings = ?, feedback_text = ? WHERE assessment_id = ?').run(
      overall,
      category,
      comments,
      assessmentId
    );
  } else {
    db.prepare("INSERT INTO project_evaluations (assessment_id, overall_rating, category_ratings, feedback_text, published_status) VALUES (?, ?, ?, ?, 'draft')").run(
      assessmentId,
      overall,
      category,
      comments
    );
  }
  return db.prepare('SELECT * FROM project_evaluations WHERE assessment_id = ?').get(assessmentId);
}

function applySkillBump(db, req, projectId, studentId, ratingSkill) {
  const bump = skillBump(ratingSkill);
  if (bump === 0) return [];
  const requiredIds = db.prepare('SELECT skill_id FROM project_skills WHERE project_id = ?').all(projectId).map((r) => r.skill_id);
  const bumped = [];
  const update = db.prepare("UPDATE student_skills SET proficiency_level = ?, updated_at = datetime('now') WHERE student_id = ? AND skill_id = ?");
  for (const skillId of requiredIds) {
    const row = db.prepare('SELECT proficiency_level FROM student_skills WHERE student_id = ? AND skill_id = ?').get(studentId, skillId);
    if (!row) continue;
    const next = Math.min(100, row.proficiency_level + bump);
    if (next !== row.proficiency_level) {
      update.run(next, studentId, skillId);
      logAudit({
        userId: req.user.id,
        action: 'update_skill',
        entityType: 'skill',
        entityId: skillId,
        req,
        oldValue: { student_id: studentId, proficiency_level: row.proficiency_level, reason: `assessment rating_skill=${ratingSkill}` },
        newValue: { student_id: studentId, proficiency_level: next },
      });
      bumped.push({ skill_id: skillId, from: row.proficiency_level, to: next });
    }
  }
  return bumped;
}

function ownCompanyId(db, userId) {
  const row = db.prepare('SELECT id FROM companies WHERE user_id = ?').get(userId);
  return row ? row.id : null;
}

// POST /assessments — company (aplikasi accepted + project closed miliknya)
// atau dosen (aplikasi accepted mana pun).
function createAssessment(req, res, next) {
  try {
    const db = getDb();
    const { project_id, student_id, rating_skill, rating_communication, rating_punctuality, rating_overall, comments = null } = req.body;
    const role = req.user.role; // perusahaan | dosen (RBAC di route)
    const evaluatorRole = role === 'perusahaan' ? 'company' : 'dosen';

    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL').get(project_id);
    if (!project) {
      return fail(res, 'Project tidak ditemukan', [], 404);
    }
    const student = db.prepare('SELECT id, name FROM users WHERE id = ? AND role = ? AND deleted_at IS NULL').get(student_id, 'mahasiswa');
    if (!student) {
      return fail(res, 'Mahasiswa tidak ditemukan', [], 404);
    }
    const application = db
      .prepare('SELECT id, status FROM applications WHERE student_id = ? AND project_id = ? ORDER BY applied_at DESC LIMIT 1')
      .get(student_id, project_id);
    if (!application || application.status !== 'accepted') {
      return fail(res, 'Penilaian hanya untuk aplikasi yang diterima (accepted)', [], 400);
    }
    if (role === 'perusahaan') {
      const companyId = ownCompanyId(db, req.user.id);
      if (!companyId || project.company_id !== companyId) {
        return fail(res, 'Project tidak ditemukan', [], 404);
      }
    }
    // TASK-090: "bisa diisi kapan saja sesudah project selesai" (berlaku company & dosen).
    if (project.status !== 'closed') {
      return fail(res, 'Project belum selesai (status harus closed)', [], 400);
    }
    const dup = db
      .prepare('SELECT id FROM assessments WHERE project_id = ? AND student_id = ? AND evaluator_role = ?')
      .get(project_id, student_id, evaluatorRole);
    if (dup) {
      return fail(res, 'Penilaian sudah ada — gunakan PUT untuk memperbarui', [], 400);
    }

    const ratings = { skill: rating_skill, communication: rating_communication, punctuality: rating_punctuality, overall: rating_overall };
    const tx = db.transaction(() => {
      const result = db
        .prepare('INSERT INTO assessments (project_id, student_id, evaluator_id, evaluator_role, rating_skill, rating_communication, rating_punctuality, rating_overall, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(project_id, student_id, req.user.id, evaluatorRole, rating_skill, rating_communication, rating_punctuality, rating_overall, comments);
      const evaluation = buildEvaluation(db, result.lastInsertRowid, ratings, comments);
      return { assessmentId: result.lastInsertRowid, evaluation };
    });
    const { assessmentId, evaluation } = tx();
    // TASK-092: bump skill sekali saat penilaian dibuat (update via PUT tidak re-bump).
    const bumped = applySkillBump(db, req, project_id, student_id, rating_skill);
    pushNotification(db, {
      recipientType: 'student',
      recipientId: student_id,
      type: 'eval',
      content: `Evaluasi project "${project.judul}" telah terbit dengan rating keseluruhan ${evaluation.overall_rating}/5.`,
    });
    logAudit({ userId: req.user.id, action: 'evaluate', entityType: 'assessment', entityId: assessmentId, req });
    const assessment = db.prepare('SELECT * FROM assessments WHERE id = ?').get(assessmentId);
    return created(res, { assessment, evaluation, skills_bumped: bumped }, 'Evaluasi disimpan');
  } catch (err) {
    return next(err);
  }
}

function fetchPair(db, projectId, studentId) {
  const assessment = db
    .prepare('SELECT * FROM assessments WHERE project_id = ? AND student_id = ? ORDER BY assessed_at DESC LIMIT 1')
    .get(projectId, studentId);
  if (!assessment) return null;
  const evaluation = db.prepare('SELECT * FROM project_evaluations WHERE assessment_id = ?').get(assessment.id);
  const project = db.prepare('SELECT id, company_id, judul FROM projects WHERE id = ?').get(projectId);
  return { assessment, evaluation, project };
}

function canView(req, project) {
  if (req.user.role === 'mahasiswa') return true; // dicek student_id == self di handler
  if (req.user.role === 'perusahaan') {
    const db = getDb();
    const companyId = ownCompanyId(db, req.user.id);
    return !!companyId && project && project.company_id === companyId;
  }
  return req.user.role === 'dosen' || req.user.role === 'kampus'; // oversight
}

// GET /evaluations/:projectId/:studentId — TASK-091.
function getEvaluation(req, res, next) {
  try {
    const db = getDb();
    const { projectId, studentId } = req.params;
    if (req.user.role === 'mahasiswa' && req.user.id !== Number(studentId)) {
      return fail(res, 'Hanya bisa melihat evaluasi sendiri', [], 403);
    }
    const pair = fetchPair(db, projectId, studentId);
    if (!pair) {
      return fail(res, 'Evaluasi tidak ditemukan', [], 404);
    }
    if (!canView(req, pair.project)) {
      return fail(res, 'Evaluasi tidak ditemukan', [], 404);
    }
    return ok(res, { assessment: pair.assessment, evaluation: pair.evaluation }, 'OK');
  } catch (err) {
    return next(err);
  }
}

// PUT /evaluations/:projectId/:studentId — update oleh penilai yang sama
// (perusahaan pemilik / dosen pembuat). Tidak re-bump skill ([ASSUMPTION]).
function updateEvaluation(req, res, next) {
  try {
    const db = getDb();
    const { projectId, studentId } = req.params;
    const pair = fetchPair(db, projectId, studentId);
    if (!pair) {
      return fail(res, 'Evaluasi tidak ditemukan', [], 404);
    }
    const a = pair.assessment;
    if (req.user.role === 'perusahaan') {
      const companyId = ownCompanyId(db, req.user.id);
      if (a.evaluator_role !== 'company' || !companyId || pair.project.company_id !== companyId) {
        return fail(res, 'Evaluasi tidak ditemukan', [], 404);
      }
    } else if (req.user.role === 'dosen') {
      if (a.evaluator_role !== 'dosen' || a.evaluator_id !== req.user.id) {
        return fail(res, 'Hanya dosen penilai yang bisa memperbarui', [], 403);
      }
    } else {
      return fail(res, 'Role tidak diizinkan memperbarui evaluasi', [], 403);
    }
    const { rating_skill, rating_communication, rating_punctuality, rating_overall, comments } = req.body;
    const next_ratings = {
      skill: rating_skill !== undefined ? rating_skill : a.rating_skill,
      communication: rating_communication !== undefined ? rating_communication : a.rating_communication,
      punctuality: rating_punctuality !== undefined ? rating_punctuality : a.rating_punctuality,
      overall: rating_overall !== undefined ? rating_overall : a.rating_overall,
    };
    const next_comments = comments !== undefined ? comments : a.comments;
    db.prepare('UPDATE assessments SET rating_skill = ?, rating_communication = ?, rating_punctuality = ?, rating_overall = ?, comments = ? WHERE id = ?').run(
      next_ratings.skill,
      next_ratings.communication,
      next_ratings.punctuality,
      next_ratings.overall,
      next_comments,
      a.id
    );
    const evaluation = buildEvaluation(db, a.id, next_ratings, next_comments);
    logAudit({ userId: req.user.id, action: 'evaluate', entityType: 'assessment', entityId: a.id, req });
    const assessment = db.prepare('SELECT * FROM assessments WHERE id = ?').get(a.id);
    return ok(res, { assessment, evaluation }, 'Evaluasi diupdate');
  } catch (err) {
    return next(err);
  }
}

module.exports = { createAssessment, getEvaluation, updateEvaluation, skillBump };
