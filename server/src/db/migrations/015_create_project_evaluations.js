// Migration 015: project_evaluations table (database.md, TASK-091).
// Dibuat otomatis setiap assessment masuk (overall = rata-rata dibulatkan,
// category_ratings JSON, status draft).
module.exports = {
  version: 15,
  name: 'create_project_evaluations',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS project_evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assessment_id INTEGER NOT NULL UNIQUE REFERENCES assessments(id) ON DELETE CASCADE,
        overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
        category_ratings TEXT NOT NULL,
        feedback_text TEXT NULL,
        published_status TEXT NOT NULL DEFAULT 'draft' CHECK (published_status IN ('draft', 'published'))
      );
    `);
  },
};
