// Student Skills controller (TASK-031, TASK-032, api.md Bagian 4).
const { getDb } = require('../db/connection');
const { ok, created, fail } = require('../utils/response');
const { levelToCategory, resolveLevel } = require('../utils/proficiency');
const { logAudit } = require('../middlewares/audit');

function rowToSkill(row) {
  return {
    skill_id: row.skill_id,
    name: row.name,
    category: row.category,
    proficiency_level: row.proficiency_level,
    proficiency_category: levelToCategory(row.proficiency_level),
    source: row.source,
  };
}

// GET /students/skills — daftar skill mahasiswa + proficiency.
function listMySkills(req, res, next) {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT ss.skill_id, s.name, s.category, ss.proficiency_level, ss.source
         FROM student_skills ss JOIN skills s ON s.id = ss.skill_id
         WHERE ss.student_id = ? ORDER BY s.name`
      )
      .all(req.user.id);
    return ok(res, { skills: rows.map(rowToSkill) }, 'OK');
  } catch (err) {
    return next(err);
  }
}

// POST /students/skills — tambah skill dari dropdown taxonomy.
function addMySkill(req, res, next) {
  try {
    const db = getDb();
    const { skill_id, source } = req.body;
    const level = resolveLevel(req.body);
    if (level === undefined || level === null) {
      return fail(
        res,
        'proficiency_level (0–100) atau proficiency_category wajib diisi',
        [{ field: 'proficiency_level', message: 'level atau kategori wajib diisi' }],
        422
      );
    }
    const taxonomy = db.prepare('SELECT id FROM skills WHERE id = ?').get(skill_id);
    if (!taxonomy) {
      return fail(res, 'Skill tidak ditemukan di taxonomy', [{ field: 'skill_id', message: 'Skill tidak ditemukan di taxonomy' }], 404);
    }
    const dup = db
      .prepare('SELECT id FROM student_skills WHERE student_id = ? AND skill_id = ?')
      .get(req.user.id, skill_id);
    if (dup) {
      return fail(res, 'Skill sudah ada di profil', [{ field: 'skill_id', message: 'Skill sudah ada di profil' }], 400);
    }
    db.prepare('INSERT INTO student_skills (student_id, skill_id, proficiency_level, source) VALUES (?, ?, ?, ?)').run(
      req.user.id,
      skill_id,
      level,
      source
    );
    const row = db
      .prepare(
        `SELECT ss.skill_id, s.name, s.category, ss.proficiency_level, ss.source
         FROM student_skills ss JOIN skills s ON s.id = ss.skill_id
         WHERE ss.student_id = ? AND ss.skill_id = ?`
      )
      .get(req.user.id, skill_id);
    logAudit({ userId: req.user.id, action: 'update_skill', entityType: 'skill', entityId: skill_id, req });
    return created(res, { student_skill: rowToSkill(row) }, 'Skill ditambahkan');
  } catch (err) {
    return next(err);
  }
}

// PUT /students/skills/:skill_id — update level/source (TASK-032: tombol edit level).
function updateMySkill(req, res, next) {
  try {
    const db = getDb();
    const skillId = req.params.skill_id;
    const existing = db
      .prepare('SELECT id FROM student_skills WHERE student_id = ? AND skill_id = ?')
      .get(req.user.id, skillId);
    if (!existing) {
      return fail(res, 'Skill tidak ada di profil mahasiswa', [], 404);
    }
    const sets = [];
    const vals = [];
    if (req.body.proficiency_level !== undefined || req.body.proficiency_category !== undefined) {
      sets.push('proficiency_level = ?');
      vals.push(resolveLevel(req.body));
    }
    if (req.body.source !== undefined) {
      sets.push('source = ?');
      vals.push(req.body.source);
    }
    if (sets.length === 0) {
      return fail(res, 'Tidak ada field yang diupdate', [], 400);
    }
    db.prepare(`UPDATE student_skills SET ${sets.join(', ')}, updated_at = datetime('now') WHERE student_id = ? AND skill_id = ?`).run(
      ...vals,
      req.user.id,
      skillId
    );
    const row = db
      .prepare(
        `SELECT ss.skill_id, s.name, s.category, ss.proficiency_level, ss.source
         FROM student_skills ss JOIN skills s ON s.id = ss.skill_id
         WHERE ss.student_id = ? AND ss.skill_id = ?`
      )
      .get(req.user.id, skillId);
    logAudit({ userId: req.user.id, action: 'update_skill', entityType: 'skill', entityId: skillId, req });
    return ok(res, { student_skill: rowToSkill(row) }, 'Skill diupdate');
  } catch (err) {
    return next(err);
  }
}

// Cek apakah skill dipakai aplikasi aktif mahasiswa (TASK-032).
// [ASSUMPTION]: "digunakan project" = ada application berstatus pending/accepted
// ke project yang mensyaratkan skill tersebut. Tabel applications/project_skills
// dibuat di Phase 4–5; jika belum ada, guard dilewati (dicek via sqlite_master).
function isSkillUsedByActiveApplication(db, studentId, skillId) {
  const has = (name) =>
    !!db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
  if (!has('applications') || !has('project_skills')) {
    return false;
  }
  const row = db
    .prepare(
      `SELECT a.id FROM applications a
       JOIN project_skills ps ON ps.project_id = a.project_id
       WHERE a.student_id = ? AND ps.skill_id = ? AND a.status IN ('pending', 'accepted')
       LIMIT 1`
    )
    .get(studentId, skillId);
  return !!row;
}

// DELETE /students/skills/:skill_id — hapus skill (TASK-032 + guard).
function deleteMySkill(req, res, next) {
  try {
    const db = getDb();
    const skillId = req.params.skill_id;
    const existing = db
      .prepare('SELECT id FROM student_skills WHERE student_id = ? AND skill_id = ?')
      .get(req.user.id, skillId);
    if (!existing) {
      return fail(res, 'Skill tidak ada di profil mahasiswa', [], 404);
    }
    if (isSkillUsedByActiveApplication(db, req.user.id, skillId)) {
      return fail(
        res,
        'Skill tidak bisa dihapus karena masih digunakan project (aplikasi aktif)',
        [{ field: 'skill_id', message: 'Skill masih digunakan project' }],
        400
      );
    }
    db.prepare('DELETE FROM student_skills WHERE student_id = ? AND skill_id = ?').run(req.user.id, skillId);
    logAudit({ userId: req.user.id, action: 'update_skill', entityType: 'skill', entityId: skillId, req });
    return ok(res, null, 'Skill dihapus');
  } catch (err) {
    return next(err);
  }
}

module.exports = { listMySkills, addMySkill, updateMySkill, deleteMySkill, isSkillUsedByActiveApplication };
