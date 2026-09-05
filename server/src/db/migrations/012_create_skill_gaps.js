// Migration 012: skill_gaps table (database.md, TASK-070).
// student_skill_id NULL bila mahasiswa belum memiliki skill tersebut.
// recommendation_source NULL hingga katalog Phase 8 (TASK-080) mengisinya.
module.exports = {
  version: 12,
  name: 'create_skill_gaps',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS skill_gaps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER NULL REFERENCES projects(id) ON DELETE CASCADE,
        required_skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
        student_skill_id INTEGER NULL REFERENCES student_skills(id) ON DELETE SET NULL,
        gap_value INTEGER NOT NULL,
        classification TEXT NOT NULL CHECK (classification IN ('no-gap', 'small', 'medium', 'large', 'critical')),
        recommendation_type TEXT NULL CHECK (recommendation_type IN ('course', 'workshop', 'certification', 'practice-project', 'mentor')),
        recommendation_title TEXT NULL,
        recommendation_source TEXT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        resolved_at TEXT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_skill_gaps_student ON skill_gaps(student_id);
      CREATE INDEX IF NOT EXISTS idx_skill_gaps_lookup ON skill_gaps(required_skill_id, student_id);
    `);
  },
};
