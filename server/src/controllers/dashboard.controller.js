// Dashboard aggregations per role (TASK-100/101/102).
// Read-only; fungsi bangun-data diekspor agar dipakai ulang halaman EJS.
const { getDb } = require('../db/connection');
const { ok } = require('../utils/response');
const { fetchProjectFull } = require('../utils/project');
const { calculateMatchScore } = require('../services/matchScore');
const { buildInputs } = require('./matching.controller');
const { analyzeGaps } = require('../services/gapAnalysis');

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

// GET /students/dashboard — TASK-100 (TC-STU ringkasan).
function studentDashboardData(db, studentId) {
  const newProjects = db
    .prepare("SELECT id FROM projects WHERE status = 'active' AND deleted_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 5")
    .all()
    .map((r) => fetchProjectFull(db, r.id))
    .filter(Boolean)
    .map((p) => ({ ...p, match_score: calculateMatchScore(buildInputs(db, studentId, p.id)).score }));
  const recommendations = db
    .prepare("SELECT * FROM recommendations WHERE student_id = ? AND status IN ('pending', 'in-progress')")
    .all(studentId)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.id - a.id)
    .slice(0, 3);
  const applications = db
    .prepare(
      `SELECT a.id, a.status, a.match_score, a.applied_at, p.judul AS project_judul
       FROM applications a JOIN projects p ON p.id = a.project_id
       WHERE a.student_id = ? AND a.status = 'pending' ORDER BY a.applied_at DESC`
    )
    .all(studentId);
  const unread = db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE recipient_id = ? AND is_read = 0').get(studentId).c;
  const latestNotifs = db
    .prepare('SELECT id, type, content, created_at FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC, id DESC LIMIT 5')
    .all(studentId);
  const skillsCount = db.prepare('SELECT COUNT(*) AS c FROM student_skills WHERE student_id = ?').get(studentId).c;
  return {
    new_projects: newProjects,
    top_recommendations: recommendations,
    pending_applications: applications,
    unread_notifications: unread,
    latest_notifications: latestNotifs,
    skills_count: skillsCount,
  };
}

// GET /companies/dashboard — TASK-101 (TC-CMP-005).
function companyDashboardData(db, userId) {
  const company = db.prepare('SELECT * FROM companies WHERE user_id = ?').get(userId);
  if (!company) return null;
  const activeProjects = db
    .prepare("SELECT * FROM projects WHERE company_id = ? AND status = 'active' AND deleted_at IS NULL ORDER BY created_at DESC")
    .all(company.id);
  const projectIds = activeProjects.map((p) => p.id);
  let waiting = [];
  let avgMatch = null;
  if (projectIds.length > 0) {
    const ph = projectIds.map(() => '?').join(',');
    waiting = db
      .prepare(
        `SELECT a.id AS application_id, a.match_score, a.applied_at, u.name AS student_name, p.judul AS project_judul
         FROM applications a JOIN users u ON u.id = a.student_id JOIN projects p ON p.id = a.project_id
         WHERE a.project_id IN (${ph}) AND a.status = 'pending' ORDER BY a.applied_at DESC`
      )
      .all(...projectIds);
    const avg = db
      .prepare(`SELECT AVG(match_score) AS avg FROM applications WHERE project_id IN (${ph}) AND match_score IS NOT NULL`)
      .get(...projectIds).avg;
    avgMatch = avg === null ? null : Math.round(avg * 10) / 10;
  }
  const allCompanyProjectIds = db.prepare('SELECT id FROM projects WHERE company_id = ? AND deleted_at IS NULL').all(company.id).map((r) => r.id);
  let pendingEvals = [];
  if (allCompanyProjectIds.length > 0) {
    const ph = allCompanyProjectIds.map(() => '?').join(',');
    pendingEvals = db
      .prepare(
        `SELECT a.id AS application_id, u.name AS student_name, p.judul AS project_judul
         FROM applications a JOIN users u ON u.id = a.student_id JOIN projects p ON p.id = a.project_id
         WHERE a.project_id IN (${ph}) AND a.status = 'accepted'
           AND NOT EXISTS (SELECT 1 FROM assessments s WHERE s.project_id = a.project_id AND s.student_id = a.student_id)
         ORDER BY a.applied_at DESC`
      )
      .all(...allCompanyProjectIds);
  }
  return {
    company: { id: company.id, nama_perusahaan: company.nama_perusahaan, verified_status: company.verified_status },
    active_projects: activeProjects.map((p) => ({ id: p.id, judul: p.judul, deadline: p.deadline, difficulty: p.difficulty })),
    active_projects_count: activeProjects.length,
    waiting_candidates: waiting,
    waiting_candidates_count: waiting.length,
    pending_evaluations: pendingEvals,
    pending_evaluations_count: pendingEvals.length,
    avg_match_score: avgMatch,
  };
}

// GET /campus/dashboard — TASK-102 (TC-CMP-006).
function campusDashboardData(db) {
  const students = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'mahasiswa' AND deleted_at IS NULL").get().c;
  const companies = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'perusahaan' AND deleted_at IS NULL").get().c;
  const projects = db.prepare("SELECT COUNT(*) AS c FROM projects WHERE status = 'active' AND deleted_at IS NULL").get().c;
  const pendingApps = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE status = 'pending'").get().c;

  // Rata-rata gap seluruh mahasiswa vs pasar aktif (live, via service gap).
  const required = db
    .prepare(
      `SELECT ps.skill_id, s.name, MAX(ps.level_required) AS level_required
       FROM project_skills ps JOIN skills s ON s.id = ps.skill_id
       JOIN projects p ON p.id = ps.project_id
       WHERE p.status = 'active' AND p.deleted_at IS NULL GROUP BY ps.skill_id, s.name`
    )
    .all();
  const studentIds = db.prepare("SELECT id FROM users WHERE role = 'mahasiswa' AND deleted_at IS NULL").all().map((r) => r.id);
  const skillStmt = db.prepare('SELECT skill_id, proficiency_level FROM student_skills WHERE student_id = ?');
  let gapSum = 0;
  let gapCount = 0;
  for (const sid of studentIds) {
    const { summary } = analyzeGaps({
      requiredSkills: required,
      studentSkills: skillStmt.all(sid),
    });
    gapSum += summary.avg_gap * summary.total;
    gapCount += summary.total;
  }
  const avgGap = gapCount === 0 ? 0 : Math.round((gapSum / gapCount) * 10) / 10;

  // Top skill dicari + baru 30 hari (proxy alert naik/turun, TASK-102).
  const topDemanded = db
    .prepare(
      `SELECT s.name, COUNT(*) AS c FROM project_skills ps
       JOIN skills s ON s.id = ps.skill_id JOIN projects p ON p.id = ps.project_id
       WHERE p.status = 'active' AND p.deleted_at IS NULL
       GROUP BY s.name ORDER BY c DESC, s.name ASC LIMIT 5`
    )
    .all();
  const newSkills = db
    .prepare(
      `SELECT DISTINCT s.name FROM project_skills ps
       JOIN skills s ON s.id = ps.skill_id JOIN projects p ON p.id = ps.project_id
       WHERE p.status = 'active' AND p.deleted_at IS NULL AND p.created_at >= datetime('now', '-30 days')`
    )
    .all()
    .map((r) => r.name);
  const recentApps = db
    .prepare(
      `SELECT u.name AS student_name, p.judul AS project_judul, a.status, a.applied_at
       FROM applications a JOIN users u ON u.id = a.student_id JOIN projects p ON p.id = a.project_id
       ORDER BY a.applied_at DESC, a.id DESC LIMIT 5`
    )
    .all();
  return {
    total_students: students,
    total_companies: companies,
    total_active_projects: projects,
    pending_applications: pendingApps,
    avg_gap: avgGap,
    top_demanded_skills: topDemanded,
    new_skills_30d: newSkills,
    recent_applications: recentApps,
  };
}

// Data halaman Assess dosen (TASK-109): aplikasi accepted + flag sudah dinilai.
// Dibutuhkan SPA /app karena mentorDashboardData tidak membawa ID.
function awaitingAssessments(db, userId) {
  return db
    .prepare(
      `SELECT a.project_id, a.student_id, u.name AS student_name, p.judul AS project_judul,
        CASE WHEN EXISTS (SELECT 1 FROM assessments s WHERE s.project_id = a.project_id AND s.student_id = a.student_id AND s.evaluator_role = 'dosen' AND s.evaluator_id = ?) THEN 1 ELSE 0 END AS assessed
       FROM applications a JOIN users u ON u.id = a.student_id JOIN projects p ON p.id = a.project_id
       WHERE a.status = 'accepted' AND p.deleted_at IS NULL
       ORDER BY a.applied_at DESC`
    )
    .all(userId);
}

// Data halaman mentor EJS (dosen): evaluasi miliknya + accepted yang bisa dinilai.
function mentorDashboardData(db, userId) {
  const myEvals = db
    .prepare(
      `SELECT s.id, s.rating_overall, s.assessed_at, u.name AS student_name, p.judul AS project_judul
       FROM assessments s JOIN users u ON u.id = s.student_id JOIN projects p ON p.id = s.project_id
       WHERE s.evaluator_id = ? AND s.evaluator_role = 'dosen' ORDER BY s.assessed_at DESC LIMIT 10`
    )
    .all(userId);
  const awaiting = db
    .prepare(
      `SELECT a.id AS application_id, u.name AS student_name, p.judul AS project_judul
       FROM applications a JOIN users u ON u.id = a.student_id JOIN projects p ON p.id = a.project_id
       WHERE a.status = 'accepted'
         AND NOT EXISTS (SELECT 1 FROM assessments s WHERE s.project_id = a.project_id AND s.student_id = a.student_id AND s.evaluator_role = 'dosen')
       ORDER BY a.applied_at DESC LIMIT 10`
    )
    .all();
  return { my_evaluations: myEvals, my_evaluations_count: myEvals.length, awaiting_evaluation: awaiting };
}

function studentDashboard(req, res, next) {
  try {
    return require('../utils/response').ok(res, studentDashboardData(getDb(), req.user.id), 'OK');
  } catch (err) {
    return next(err);
  }
}

function companyDashboard(req, res, next) {
  try {
    const { ok, fail } = require('../utils/response');
    const data = companyDashboardData(getDb(), req.user.id);
    if (!data) return fail(res, 'Profil perusahaan belum tersedia', [], 404);
    return ok(res, data, 'OK');
  } catch (err) {
    return next(err);
  }
}

function campusDashboard(req, res, next) {
  try {
    return require('../utils/response').ok(res, campusDashboardData(getDb()), 'OK');
  } catch (err) {
    return next(err);
  }
}

// GET /mentor/awaiting — TASK-109 (halaman Assess dosen di SPA /app).
function mentorAwaiting(req, res, next) {
  try {
    return require('../utils/response').ok(res, { awaiting: awaitingAssessments(getDb(), req.user.id) }, 'OK');
  } catch (err) {
    return next(err);
  }
}

module.exports = { studentDashboardData, companyDashboardData, campusDashboardData, mentorDashboardData, awaitingAssessments, studentDashboard, companyDashboard, campusDashboard, mentorAwaiting };
