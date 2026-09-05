// Migration 013: recommendations table (database.md, TASK-080).
// Tambahan dari sketsa: skill_id NULL — menautkan rekomendasi ke skill target
// (PRD: "Skill target") agar generate idempotent per (student, skill, type).
module.exports = {
  version: 13,
  name: 'create_recommendations',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        skill_id INTEGER NULL REFERENCES skills(id) ON DELETE SET NULL,
        type TEXT NOT NULL CHECK (type IN ('course', 'workshop', 'certification', 'practice-project', 'mentor')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'consumed')),
        source TEXT NULL,
        consumed_at TEXT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_recommendations_student ON recommendations(student_id, status);
    `);
  },
};
