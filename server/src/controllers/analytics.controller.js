// Analytics endpoints (TASK-103, TC-CMP-007, api.md Bagian 12).
// Grafik = data JSON siap render (pie/line/heatmap); builder diekspor agar
// dipakai ulang halaman EJS.
const { getDb } = require('../db/connection');
const { ok, fail } = require('../utils/response');
const { analyzeGaps } = require('../services/gapAnalysis');

function periodCutoff(period) {
  if (period === 'last_30_days') return "datetime('now', '-30 days')";
  if (period === 'last_6_months') return "datetime('now', '-6 months')";
  return null; // all
}

// Pie: distribusi skill mahasiswa.
function skillDistributionData(db, prodi) {
  const joinProdi = prodi ? 'JOIN student_profiles sp ON sp.user_id = u.id AND sp.program_studi = ?' : '';
  const vals = prodi ? [prodi] : [];
  const totalStudents = db
    .prepare(`SELECT COUNT(DISTINCT u.id) AS c FROM users u ${joinProdi} WHERE u.role = 'mahasiswa' AND u.deleted_at IS NULL`)
    .get(...vals).c;
  const distribution = db
    .prepare(
      `SELECT s.name, s.category, COUNT(DISTINCT ss.student_id) AS students, ROUND(AVG(ss.proficiency_level), 1) AS avg_level
       FROM student_skills ss JOIN skills s ON s.id = ss.skill_id
       JOIN users u ON u.id = ss.student_id ${joinProdi}
       WHERE u.role = 'mahasiswa' AND u.deleted_at IS NULL
       GROUP BY s.name, s.category ORDER BY students DESC, s.name ASC`
    )
    .all(...vals);
  return { total_students: totalStudents, distribution };
}

// Line: tren skill dicari per bulan.
function industryDemandData(db, period) {
  const cutoff = periodCutoff(period);
  const timeFilter = cutoff ? `AND p.created_at >= ${cutoff}` : '';
  const trend = db
    .prepare(
      `SELECT substr(p.created_at, 1, 7) AS month, s.name AS skill, COUNT(*) AS c
       FROM project_skills ps JOIN skills s ON s.id = ps.skill_id
       JOIN projects p ON p.id = ps.project_id
       WHERE p.deleted_at IS NULL ${timeFilter}
       GROUP BY month, skill ORDER BY month ASC, c DESC`
    )
    .all();
  const topSkills = db
    .prepare(
      `SELECT s.name AS skill, COUNT(*) AS c FROM project_skills ps
       JOIN skills s ON s.id = ps.skill_id JOIN projects p ON p.id = ps.project_id
       WHERE p.deleted_at IS NULL ${timeFilter}
       GROUP BY skill ORDER BY c DESC, skill ASC LIMIT 10`
    )
    .all();
  return { period, trend, top_skills: topSkills };
}

// Heatmap: matriks prodi x skill rata-rata gap (skill dibatasi 12 teratas).
function gapHeatmapData(db, prodiFilter) {
  const skills = db
    .prepare(
      `SELECT s.id AS skill_id, s.name, COUNT(*) AS c FROM project_skills ps
       JOIN skills s ON s.id = ps.skill_id JOIN projects p ON p.id = ps.project_id
       WHERE p.status = 'active' AND p.deleted_at IS NULL
       GROUP BY s.id, s.name ORDER BY c DESC, s.name ASC LIMIT 12`
    )
    .all();
  let programs = db.prepare("SELECT DISTINCT program_studi FROM student_profiles WHERE program_studi IS NOT NULL ORDER BY program_studi").all().map((r) => r.program_studi);
  if (prodiFilter) {
    programs = programs.filter((p) => p === prodiFilter);
  }
  const skillStmt = db.prepare('SELECT skill_id, proficiency_level FROM student_skills WHERE student_id = ?');
  const matrix = [];
  for (const prodi of programs) {
    const studentIds = db.prepare('SELECT user_id FROM student_profiles WHERE program_studi = ?').all(prodi).map((r) => r.user_id);
    const row = { program_studi: prodi, students: studentIds.length, gaps: {} };
    for (const s of skills) {
      let sum = 0;
      for (const sid of studentIds) {
        const mine = skillStmt.all(sid).find((x) => x.skill_id === s.skill_id);
        const current = mine ? mine.proficiency_level : 0;
        const req = db.prepare('SELECT MAX(ps.level_required) AS m FROM project_skills ps JOIN projects p ON p.id = ps.project_id WHERE ps.skill_id = ? AND p.status = ? AND p.deleted_at IS NULL').get(s.skill_id, 'active').m || 0;
        sum += Math.max(0, req - current);
      }
      row.gaps[s.name] = studentIds.length === 0 ? 0 : Math.round((sum / studentIds.length) * 10) / 10;
    }
    matrix.push(row);
  }
  return { skills: skills.map((s) => s.name), matrix };
}

function skillDistribution(req, res, next) {
  try {
    return ok(res, skillDistributionData(getDb(), req.query.program_studi), 'OK');
  } catch (err) {
    return next(err);
  }
}

function industryDemand(req, res, next) {
  try {
    return ok(res, industryDemandData(getDb(), req.query.period || 'last_6_months'), 'OK');
  } catch (err) {
    return next(err);
  }
}

function gapHeatmap(req, res, next) {
  try {
    return ok(res, gapHeatmapData(getDb(), req.query.program_studi), 'OK');
  } catch (err) {
    return next(err);
  }
}

// Export CSV gap per mahasiswa (TASK-103; PNG/PDF via tombol cetak di halaman).
function exportCsv(req, res, next) {
  try {
    const format = req.query.format || 'csv';
    if (format !== 'csv') {
      return fail(res, 'Format didukung: csv (PNG/PDF via tombol cetak di halaman analytics)', [], 422);
    }
    const db = getDb();
    const required = db
      .prepare(
        `SELECT ps.skill_id, s.name, MAX(ps.level_required) AS level_required
         FROM project_skills ps JOIN skills s ON s.id = ps.skill_id
         JOIN projects p ON p.id = ps.project_id
         WHERE p.status = 'active' AND p.deleted_at IS NULL GROUP BY ps.skill_id, s.name ORDER BY s.name`
      )
      .all();
    const students = db
      .prepare(
        `SELECT u.id, u.name, u.email, sp.program_studi FROM users u
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         WHERE u.role = 'mahasiswa' AND u.deleted_at IS NULL ORDER BY u.name`
      )
      .all();
    const skillStmt = db.prepare('SELECT skill_id, proficiency_level FROM student_skills WHERE student_id = ?');
    const esc = (v) => `"${String(v === null || v === undefined ? '' : v).replace(/"/g, '""')}"`;
    const lines = ['student_name,email,program_studi,skill,required,current,gap,classification'];
    for (const st of students) {
      const { gaps } = analyzeGaps({ requiredSkills: required, studentSkills: skillStmt.all(st.id) });
      for (const g of gaps) {
        lines.push([st.name, st.email, st.program_studi, g.name, g.required, g.current, g.gap_value, g.classification].map(esc).join(','));
      }
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="gap-export.csv"');
    return res.status(200).send(lines.join('\n'));
  } catch (err) {
    return next(err);
  }
}

module.exports = { skillDistributionData, industryDemandData, gapHeatmapData, skillDistribution, industryDemand, gapHeatmap, exportCsv };
