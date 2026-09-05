// Migration 009: project_skills table (database.md, TASK-040).
// UNIQUE(project_id, skill_id): satu skill hanya sekali per project.
module.exports = {
  version: 9,
  name: 'create_project_skills',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS project_skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
        level_required INTEGER NOT NULL CHECK (level_required BETWEEN 0 AND 100),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (project_id, skill_id)
      );
      CREATE INDEX IF NOT EXISTS idx_project_skills_project ON project_skills(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_skills_lookup ON project_skills(project_id, skill_id);
    `);
  },
};
