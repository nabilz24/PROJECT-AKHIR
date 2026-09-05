// Migration 007: student_skills table (database.md, TASK-031).
// UNIQUE(student_id, skill_id): satu skill hanya sekali per mahasiswa.
module.exports = {
  version: 7,
  name: 'create_student_skills',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS student_skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
        proficiency_level INTEGER NOT NULL DEFAULT 0 CHECK (proficiency_level BETWEEN 0 AND 100),
        source TEXT NOT NULL CHECK (source IN ('course', 'certification', 'experience')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (student_id, skill_id)
      );
      CREATE INDEX IF NOT EXISTS idx_student_skills_student ON student_skills(student_id);
      CREATE INDEX IF NOT EXISTS idx_student_skills_lookup ON student_skills(student_id, skill_id);
    `);
  },
};
