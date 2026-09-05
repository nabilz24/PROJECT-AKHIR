// Migration 014: assessments table (database.md, TASK-090).
// Tambahan dari sketsa: evaluator_id (identitas penilai, perlu untuk ownership
// update oleh dosen) + UNIQUE(project, student, evaluator_role) agar satu
// pasangan hanya dinilai sekali per peran (update via PUT).
module.exports = {
  version: 14,
  name: 'create_assessments',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        evaluator_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
        evaluator_role TEXT NOT NULL CHECK (evaluator_role IN ('company', 'dosen')),
        rating_skill INTEGER NOT NULL CHECK (rating_skill BETWEEN 1 AND 5),
        rating_communication INTEGER NOT NULL CHECK (rating_communication BETWEEN 1 AND 5),
        rating_punctuality INTEGER NOT NULL CHECK (rating_punctuality BETWEEN 1 AND 5),
        rating_overall INTEGER NOT NULL CHECK (rating_overall BETWEEN 1 AND 5),
        comments TEXT NULL,
        assessed_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (project_id, student_id, evaluator_role)
      );
      CREATE INDEX IF NOT EXISTS idx_assessments_lookup ON assessments(project_id, student_id);
    `);
  },
};
