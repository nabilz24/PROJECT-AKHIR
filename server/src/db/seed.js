// Seed runner (database.md Bagian 4).
// Usage: node server/src/db/seed.js  (atau: npm run db:seed)
// Phase 1 (TASK-010): tabel skills belum ada (dibuat di Phase 3, TASK-030),
// sehingga seed skill taxonomy di-skip dengan pesan. File ini forward-compatible:
// saat tabel skills tersedia, taxonomy otomatis di-seed secara idempotent.
const { getDb, closeDb } = require('./connection');
const { runMigrations } = require('./migrate');

function tableExists(db, name) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name);
  return !!row;
}

function seedSkills(db) {
  // database.md Bagian 4: 20 entry awal (akan dilengkapi 10 soft skill di TASK-030).
  const skills = [
    ['React', 'technical', null, 100],
    ['JavaScript', 'technical', null, 100],
    ['Node.js', 'technical', null, 100],
    ['HTML/CSS', 'technical', null, 100],
    ['Python', 'technical', null, 100],
    ['TypeScript', 'technical', null, 100],
    ['SQL', 'technical', null, 100],
    ['Git', 'technical', null, 100],
    ['Docker', 'technical', null, 100],
    ['Figma', 'technical', null, 100],
    ['Communication', 'soft-skill', null, 100],
    ['Teamwork', 'soft-skill', null, 100],
    ['Problem Solving', 'soft-skill', null, 100],
    ['Time Management', 'soft-skill', null, 100],
    ['Project Management', 'soft-skill', null, 100],
    ['Design Thinking', 'soft-skill', null, 100],
    ['Certification Management', 'certification', null, 100],
    ['API Development', 'technical', null, 100],
    ['Data Analysis', 'technical', null, 100],
    ['UI/UX Design', 'technical', null, 100],
  ];
  const insert = db.prepare(
    'INSERT OR IGNORE INTO skills (name, category, description, level_scale_default) VALUES (?, ?, ?, ?)'
  );
  const tx = db.transaction(() => {
    for (const s of skills) insert.run(...s);
  });
  tx();
  return skills.length;
}

function runSeeds() {
  runMigrations();
  const db = getDb();
  const summary = {};
  if (tableExists(db, 'skills')) {
    summary.skills = seedSkills(db);
  } else {
    summary.skills = 'skipped (tabel skills belum ada — dibuat di Phase 3/TASK-030)';
  }
  return summary;
}

if (require.main === module) {
  console.log(runSeeds());
  closeDb();
}

module.exports = { runSeeds };
