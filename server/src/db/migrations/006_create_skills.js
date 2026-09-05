// Migration 006: skills taxonomy table (database.md, TASK-030).
module.exports = {
  version: 6,
  name: 'create_skills',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL CHECK (category IN ('technical', 'soft-skill', 'certification', 'tool')),
        description TEXT NULL,
        level_scale_default INTEGER NOT NULL DEFAULT 100,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
      CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
    `);
  },
};
