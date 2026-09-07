// Seed runner (database.md Bagian 4).
// Usage: node server/src/db/seed.js  (atau: npm run db:seed)
// Phase 1 (TASK-010): tabel skills belum ada (dibuat di Phase 3, TASK-030),
// sehingga seed skill taxonomy di-skip dengan pesan. File ini forward-compatible:
// saat tabel skills tersedia, taxonomy otomatis di-seed secara idempotent.
const { getDb, closeDb } = require('./connection');
const { runMigrations } = require('./migrate');
const { hashPassword } = require('../utils/password');

function tableExists(db, name) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name);
  return !!row;
}

function seedSkills(db) {
  // database.md Bagian 4 / TASK-030: 20 technical + 10 soft-skill (+1 certification bonus).
  const skills = [
    // --- Technical (20) ---
    ['React', 'technical', null, 100],
    ['JavaScript', 'technical', null, 100],
    ['TypeScript', 'technical', null, 100],
    ['Node.js', 'technical', null, 100],
    ['HTML/CSS', 'technical', null, 100],
    ['Python', 'technical', null, 100],
    ['Java', 'technical', null, 100],
    ['PHP', 'technical', null, 100],
    ['SQL', 'technical', null, 100],
    ['Git', 'technical', null, 100],
    ['Docker', 'technical', null, 100],
    ['CI/CD', 'technical', null, 100],
    ['API Development', 'technical', null, 100],
    ['Software Testing', 'technical', null, 100],
    ['Data Analysis', 'technical', null, 100],
    ['Machine Learning', 'technical', null, 100],
    ['Cybersecurity Basics', 'technical', null, 100],
    ['UI/UX Design', 'technical', null, 100],
    ['Figma', 'technical', null, 100],
    ['Mobile Development', 'technical', null, 100],
    // --- Soft-skill (10) ---
    ['Communication', 'soft-skill', null, 100],
    ['Teamwork', 'soft-skill', null, 100],
    ['Problem Solving', 'soft-skill', null, 100],
    ['Time Management', 'soft-skill', null, 100],
    ['Project Management', 'soft-skill', null, 100],
    ['Design Thinking', 'soft-skill', null, 100],
    ['Leadership', 'soft-skill', null, 100],
    ['Critical Thinking', 'soft-skill', null, 100],
    ['Creativity', 'soft-skill', null, 100],
    ['Adaptability', 'soft-skill', null, 100],
    // --- Bonus ---
    ['Certification Management', 'certification', null, 100],
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

// Akun testing siap pakai (TASK-108). Idempotent (aman dijalankan ulang).
// Password semua akun: Test123! — HANYA untuk development lokal, jangan
// dipakai di staging/production. Jalankan: npm run db:seed:test
const TEST_PASSWORD = 'Test123!';
const TEST_ACCOUNTS = [
  { name: 'Mahasiswa Test', email: 'mhs@test.id', role: 'mahasiswa' },
  { name: 'PT Teknologi Test', email: 'perusahaan@test.id', role: 'perusahaan' },
  { name: 'Admin Kampus', email: 'kampus@test.id', role: 'kampus' },
  { name: 'Dosen Test', email: 'dosen@test.id', role: 'dosen' },
];

async function seedTestAccounts(db) {
  const need = ['users', 'student_profiles', 'companies', 'skills', 'student_skills', 'projects', 'project_skills', 'applications'];
  for (const t of need) {
    if (!tableExists(db, t)) return { testAccounts: `skipped (tabel ${t} belum ada)` };
  }
  const passwordHash = await hashPassword(TEST_PASSWORD);
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
  const byEmail = (email) => db.prepare('SELECT id, role FROM users WHERE email = ?').get(email);
  const tx = db.transaction(() => {
    for (const a of TEST_ACCOUNTS) insertUser.run(a.name, a.email, passwordHash, a.role);
  });
  tx();

  const mhs = byEmail('mhs@test.id');
  const comp = byEmail('perusahaan@test.id');
  db.prepare('INSERT OR IGNORE INTO student_profiles (user_id, npm, program_studi, angkatan, bio) VALUES (?, ?, ?, ?, ?)')
    .run(mhs.id, '20230001', 'Informatika', 2023, 'Akun testing mahasiswa.');
  db.prepare("INSERT OR IGNORE INTO companies (user_id, nama_perusahaan, industri, size, deskripsi, verified_status) VALUES (?, ?, ?, ?, ?, ?)")
    .run(comp.id, 'PT Teknologi Test', 'Teknologi', 'medium', 'Akun testing perusahaan (terverifikasi).', 1);

  const skillId = (name) => db.prepare('SELECT id FROM skills WHERE name = ?').get(name).id;
  const insertSkill = db.prepare('INSERT OR IGNORE INTO student_skills (student_id, skill_id, proficiency_level, source) VALUES (?, ?, ?, ?)');
  insertSkill.run(mhs.id, skillId('React'), 40, 'course');
  insertSkill.run(mhs.id, skillId('JavaScript'), 60, 'experience');

  // Project demo aktif + aplikasi pending agar dashboard perusahaan/mahasiswa hidup.
  const companyId = db.prepare('SELECT id FROM companies WHERE user_id = ?').get(comp.id).id;
  const existing = db.prepare('SELECT id FROM projects WHERE company_id = ? AND judul = ? AND deleted_at IS NULL').get(companyId, 'Website Company Profile');
  let projectId = existing ? existing.id : null;
  if (!projectId) {
    const deadline = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const r = db.prepare("INSERT INTO projects (company_id, judul, deskripsi, sektor_industri, deadline, status, difficulty) VALUES (?, ?, ?, ?, ?, 'active', 'medium')")
      .run(companyId, 'Website Company Profile', 'Project demo untuk testing.', 'Teknologi', deadline);
    projectId = Number(r.lastInsertRowid);
    db.prepare('INSERT OR IGNORE INTO project_skills (project_id, skill_id, level_required) VALUES (?, ?, ?)').run(projectId, skillId('React'), 60);
  }
  const appExists = db.prepare("SELECT id, match_score FROM applications WHERE student_id = ? AND project_id = ? AND status IN ('pending', 'accepted')").get(mhs.id, projectId);
  if (!appExists) {
    const r = db.prepare('INSERT INTO applications (student_id, project_id, status, cover_letter) VALUES (?, ?, ?, ?)').run(mhs.id, projectId, 'pending', 'Halo, saya tertarik (akun testing).');
    try {
      const { calculateMatchScore } = require('../services/matchScore');
      const { buildInputs } = require('../controllers/matching.controller');
      const sc = calculateMatchScore(buildInputs(db, mhs.id, projectId)).score;
      db.prepare('UPDATE applications SET match_score = ? WHERE id = ?').run(sc, r.lastInsertRowid);
    } catch (e) { /* abaikan */ }
  } else if (appExists.match_score == null) {
    try {
      const { calculateMatchScore } = require('../services/matchScore');
      const { buildInputs } = require('../controllers/matching.controller');
      const sc = calculateMatchScore(buildInputs(db, mhs.id, projectId)).score;
      db.prepare('UPDATE applications SET match_score = ? WHERE id = ?').run(sc, appExists.id);
    } catch (e) { /* abaikan */ }
  }
  return { testAccounts: TEST_ACCOUNTS.map((a) => a.email) };
}

if (require.main === module) {
  (async () => {
    console.log(runSeeds());
    if (process.argv.includes('--test-accounts')) {
      console.log(await seedTestAccounts(getDb()));
      console.log(`Password semua akun testing: ${TEST_PASSWORD} (development lokal saja)`);
    }
    closeDb();
  })();
}

module.exports = { runSeeds, seedTestAccounts, TEST_ACCOUNTS, TEST_PASSWORD };
