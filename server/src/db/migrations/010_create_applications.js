// Migration 010: applications table MINIMAL (TASK-042).
// Phase 4 hanya butuh penyimpanan aplikasi (status awal pending). Workflow
// ubah status + notifikasi menyusul di Phase 5 (TASK-050/051) via migrasi baru
// bila perlu kolom tambahan. Duplikat dicegah di application layer: hanya satu
// aplikasi pending/accepted per pasangan student+project (re-apply setelah
// rejected diperbolehkan).
module.exports = {
  version: 10,
  name: 'create_applications',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
        match_score INTEGER NULL,
        cover_letter TEXT NULL,
        portfolio_url TEXT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_applications_student_project ON applications(student_id, project_id);
      CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
    `);
  },
};
