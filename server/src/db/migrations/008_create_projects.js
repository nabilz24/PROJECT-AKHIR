// Migration 008: projects table (database.md, TASK-040).
// Tambahan dari sketsa: difficulty (TASK-041 filter Easy/Medium/Hard) dan
// deleted_at (soft-delete sesuai aturan integritas database.md Bagian 5).
module.exports = {
  version: 8,
  name: 'create_projects',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        judul TEXT NOT NULL,
        deskripsi TEXT NULL,
        sektor_industri TEXT NULL,
        deadline TEXT NULL,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
        difficulty TEXT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
        match_score_threshold INTEGER NOT NULL DEFAULT 70,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
      CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    `);
  },
};
