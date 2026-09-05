// Skill Gap controller (TASK-070/071/072, api.md Bagian 8).
const { getDb } = require('../db/connection');
const { ok, fail } = require('../utils/response');
const { analyzeGaps } = require('../services/gapAnalysis');
const { generateForStudent } = require('./recommendations.controller');

function assertScope(req, res, studentId) {
  if (req.user.role === 'mahasiswa' && req.user.id !== Number(studentId)) {
    fail(res, 'Mahasiswa hanya bisa melihat gap sendiri', [], 403);
    return false;
  }
  return true;
}

function fetchStudent(db, studentId) {
  return db.prepare('SELECT id, name FROM users WHERE id = ? AND role = ? AND deleted_at IS NULL').get(studentId, 'mahasiswa');
}

// Requirement: skill project tertentu, atau gabungan semua project active
// (max level per skill) bila projectId null.
// [ASSUMPTION]: gap tanpa project = vs requirement terberat pasar aktif.
function fetchRequired(db, projectId) {
  if (projectId) {
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND deleted_at IS NULL').get(projectId);
    if (!project) return null;
    return db
      .prepare(
        `SELECT ps.skill_id, s.name, ps.level_required
         FROM project_skills ps JOIN skills s ON s.id = ps.skill_id
         WHERE ps.project_id = ? ORDER BY s.name`
      )
      .all(projectId);
  }
  return db
    .prepare(
      `SELECT ps.skill_id, s.name, MAX(ps.level_required) AS level_required
       FROM project_skills ps
       JOIN skills s ON s.id = ps.skill_id
       JOIN projects p ON p.id = ps.project_id
       WHERE p.status = 'active' AND p.deleted_at IS NULL
       GROUP BY ps.skill_id, s.name ORDER BY s.name`
    )
    .all();
}

function fetchStudentSkills(db, studentId) {
  return db.prepare('SELECT ss.id, ss.skill_id, ss.proficiency_level FROM student_skills ss WHERE ss.student_id = ?').all(studentId);
}

// Persist snapshot analisis (DELETE scope + INSERT) — TASK-070 "disimpan ke SkillGap".
function persistGaps(db, studentId, projectId, gaps) {
  const tx = db.transaction(() => {
    if (projectId) {
      db.prepare('DELETE FROM skill_gaps WHERE student_id = ? AND project_id = ?').run(studentId, projectId);
    } else {
      db.prepare('DELETE FROM skill_gaps WHERE student_id = ? AND project_id IS NULL').run(studentId);
    }
    const skillRowId = new Map(fetchStudentSkills(db, studentId).map((s) => [s.skill_id, s.id]));
    const insert = db.prepare(
      'INSERT INTO skill_gaps (student_id, project_id, required_skill_id, student_skill_id, gap_value, classification, recommendation_type, recommendation_title, recommendation_source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const g of gaps) {
      insert.run(
        studentId,
        projectId,
        g.skill_id,
        skillRowId.get(g.skill_id) || null,
        g.gap_value,
        g.classification,
        g.recommendation.type,
        g.recommendation.title,
        g.recommendation.source
      );
    }
  });
  tx();
}

// GET /gap-analysis/:studentId/:projectId? — analisis + persist.
function analyze(req, res, next) {
  try {
    const db = getDb();
    const studentId = Number(req.params.studentId);
    const projectId = req.params.projectId !== undefined ? Number(req.params.projectId) : null;
    if (!assertScope(req, res, studentId)) return undefined;
    const student = fetchStudent(db, studentId);
    if (!student) {
      return fail(res, 'Mahasiswa tidak ditemukan', [], 404);
    }
    const required = fetchRequired(db, projectId);
    if (required === null) {
      return fail(res, 'Project tidak ditemukan', [], 404);
    }
    const studentSkills = fetchStudentSkills(db, studentId).map((s) => ({
      skill_id: s.skill_id,
      proficiency_level: s.proficiency_level,
    }));
    const result = analyzeGaps({ requiredSkills: required, studentSkills });
    persistGaps(db, studentId, projectId, result.gaps);
    // TASK-080: tiap analisis gap otomatis men-generate rekomendasi (idempotent).
    generateForStudent(db, studentId, result.gaps);
    return ok(res, { student_id: studentId, project_id: projectId, ...result }, 'OK');
  } catch (err) {
    return next(err);
  }
}

// GET /gap-analysis/student/:studentId — distribusi keseluruhan (TASK-072: data grafik).
function distribution(req, res, next) {
  try {
    const db = getDb();
    const studentId = Number(req.params.studentId);
    if (!assertScope(req, res, studentId)) return undefined;
    const student = fetchStudent(db, studentId);
    if (!student) {
      return fail(res, 'Mahasiswa tidak ditemukan', [], 404);
    }
    const required = fetchRequired(db, null);
    const studentSkills = fetchStudentSkills(db, studentId).map((s) => ({
      skill_id: s.skill_id,
      proficiency_level: s.proficiency_level,
    }));
    const { summary } = analyzeGaps({ requiredSkills: required, studentSkills });
    return ok(
      res,
      {
        student_id: studentId,
        overall_gap_distribution: summary.counts,
        total: summary.total,
        avg_gap: summary.avg_gap,
        worst: summary.worst,
      },
      'OK'
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = { analyze, distribution };
