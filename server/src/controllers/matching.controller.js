// Matching Engine controller (TASK-060/061/062, api.md Bagian 5/6/7).
const { getDb } = require('../db/connection');
const { ok, fail } = require('../utils/response');
const { calculateMatchScore } = require('../services/matchScore');
const { logAudit } = require('../middlewares/audit');

const SCORE_NOTE = 'Skor bersifat rekomendasi awal — keputusan seleksi tetap mempertimbangkan faktor lain (wawancara, ketersediaan jadwal, dsb). Lihat breakdown per-skill.';

function hasTable(db, name) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
}

// Rakit input formula dari DB untuk pasangan student+project.
function buildInputs(db, studentId, projectId) {
  const requiredSkills = db
    .prepare(
      `SELECT ps.skill_id, s.name, ps.level_required
       FROM project_skills ps JOIN skills s ON s.id = ps.skill_id
       WHERE ps.project_id = ? ORDER BY s.name`
    )
    .all(projectId);
  const studentSkills = db
    .prepare('SELECT skill_id, proficiency_level, source FROM student_skills WHERE student_id = ?')
    .all(studentId);
  const application = db
    .prepare("SELECT portfolio_url FROM applications WHERE student_id = ? AND project_id = ? AND status IN ('pending', 'accepted') ORDER BY applied_at DESC LIMIT 1")
    .get(studentId, projectId);
  let portfolioCount = 0;
  if (hasTable(db, 'portfolios')) {
    portfolioCount = db.prepare('SELECT COUNT(*) AS c FROM portfolios WHERE student_id = ?').get(studentId).c;
  }
  const activeApplications = db
    .prepare("SELECT COUNT(*) AS c FROM applications WHERE student_id = ? AND status IN ('pending', 'accepted')")
    .get(studentId).c;
  return {
    requiredSkills,
    studentSkills,
    portfolioUrl: application ? application.portfolio_url : null,
    portfolioCount,
    activeApplications,
  };
}

function ownCompanyId(db, userId) {
  const row = db.prepare('SELECT id FROM companies WHERE user_id = ?').get(userId);
  return row ? row.id : null;
}

function getProjectOr404(db, projectId) {
  return db.prepare('SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL').get(projectId);
}

// POST /matching/calculate — hitung skor pasangan student+project (tanpa persist).
function calculate(req, res, next) {
  try {
    const db = getDb();
    const { student_id, project_id } = req.body;
    if (req.user.role === 'mahasiswa' && Number(student_id) !== req.user.id) {
      return fail(res, 'Mahasiswa hanya bisa menghitung skor sendiri', [], 403);
    }
    const student = db.prepare('SELECT id FROM users WHERE id = ? AND role = ? AND deleted_at IS NULL').get(student_id, 'mahasiswa');
    if (!student) {
      return fail(res, 'Mahasiswa tidak ditemukan', [], 404);
    }
    const project = getProjectOr404(db, project_id);
    if (!project) {
      return fail(res, 'Project tidak ditemukan', [], 404);
    }
    const result = calculateMatchScore(buildInputs(db, Number(student_id), Number(project_id)));
    return ok(res, { student_id: Number(student_id), project_id: Number(project_id), ...result }, 'OK');
  } catch (err) {
    return next(err);
  }
}

// Inti ranking: kandidat pending terurut skor desc + persist match_score (TASK-060/061).
function rankProject(db, project, minScore) {
  const applications = db
    .prepare(
      `SELECT a.id AS application_id, a.student_id, a.applied_at, u.name AS student_name, u.email AS student_email
       FROM applications a JOIN users u ON u.id = a.student_id
       WHERE a.project_id = ? AND a.status = 'pending'
       ORDER BY a.applied_at ASC`
    )
    .all(project.id);
  const skillStmt = db.prepare(
    `SELECT s.name FROM student_skills ss JOIN skills s ON s.id = ss.skill_id WHERE ss.student_id = ?`
  );
  const updateStmt = db.prepare('UPDATE applications SET match_score = ? WHERE id = ?');
  const candidates = applications.map((a) => {
    const result = calculateMatchScore(buildInputs(db, a.student_id, project.id));
    updateStmt.run(result.score, a.application_id);
    return {
      application_id: a.application_id,
      student: { id: a.student_id, name: a.student_name, email: a.student_email },
      skills: skillStmt.all(a.student_id).map((r) => r.name),
      match_score: result.score,
      components: result.components,
      breakdown: result.breakdown,
      applied_at: a.applied_at,
    };
  });
  candidates.sort((a, b) => b.match_score - a.match_score || a.application_id - b.application_id);
  return candidates.filter((c) => c.match_score >= minScore);
}

// GET /matching/ranking — perusahaan (project miliknya) / kampus / dosen.
function ranking(req, res, next) {
  try {
    const db = getDb();
    const project = getProjectOr404(db, req.query.project_id);
    if (!project) {
      return fail(res, 'Project tidak ditemukan', [], 404);
    }
    if (req.user.role === 'perusahaan') {
      const companyId = ownCompanyId(db, req.user.id);
      if (!companyId || project.company_id !== companyId) {
        return fail(res, 'Project tidak ditemukan', [], 404);
      }
    }
    const minScore = req.query.min_score !== undefined ? req.query.min_score : project.match_score_threshold;
    const candidates = rankProject(db, project, minScore);
    return ok(res, { project_id: project.id, min_score: minScore, candidates, total: candidates.length, note: SCORE_NOTE }, 'OK');
  } catch (err) {
    return next(err);
  }
}

// GET /companies/candidates — Candidate Matching perusahaan (TASK-061, TC-CMP-002).
function candidates(req, res, next) {
  try {
    const db = getDb();
    const project = getProjectOr404(db, req.query.project_id);
    if (!project) {
      return fail(res, 'Project tidak ditemukan', [], 404);
    }
    const companyId = ownCompanyId(db, req.user.id);
    if (!companyId || project.company_id !== companyId) {
      return fail(res, 'Project tidak ditemukan', [], 404);
    }
    const minScore = req.query.min_score !== undefined ? req.query.min_score : project.match_score_threshold;
    let ranked = rankProject(db, project, minScore);
    if (req.query.skill) {
      const needle = req.query.skill.toLowerCase();
      ranked = ranked.filter((c) => c.skills.some((s) => s.toLowerCase().includes(needle)));
    }
    return ok(
      res,
      { project_id: project.id, min_score: minScore, candidates: ranked, total: ranked.length, note: SCORE_NOTE },
      'OK'
    );
  } catch (err) {
    return next(err);
  }
}

// GET /projects/:id/match — mahasiswa melihat skor vs project (api.md Bagian 6).
function projectMatch(req, res, next) {
  try {
    const db = getDb();
    const project = getProjectOr404(db, req.params.id);
    if (!project || project.status !== 'active') {
      return fail(res, 'Project tidak ditemukan', [], 404);
    }
    const result = calculateMatchScore(buildInputs(db, req.user.id, project.id));
    const application = db
      .prepare("SELECT id FROM applications WHERE student_id = ? AND project_id = ? AND status IN ('pending', 'accepted') ORDER BY applied_at DESC LIMIT 1")
      .get(req.user.id, project.id);
    if (application) {
      db.prepare('UPDATE applications SET match_score = ? WHERE id = ?').run(result.score, application.id);
    }
    // api.md: { match_score, breakdown }.
    return ok(res, { project_id: project.id, match_score: result.score, components: result.components, breakdown: result.breakdown, note: SCORE_NOTE }, 'OK');
  } catch (err) {
    return next(err);
  }
}

module.exports = { calculate, ranking, candidates, projectMatch, buildInputs };
