// Migration 005: companies table (database.md, TASK-020).
// Kolom logo adalah tambahan dari database.md agar upload foto profil
// perusahaan (TASK-020: "Foto profil upload dengan validasi tipe/ukuran")
// bisa disimpan, simetris dengan student_profiles.foto_profile.
module.exports = {
  version: 5,
  name: 'create_companies',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        nama_perusahaan TEXT NOT NULL,
        industri TEXT NULL,
        size TEXT NULL CHECK (size IN ('startup', 'medium', 'large', 'corporate')),
        deskripsi TEXT NULL,
        logo TEXT NULL,
        verified_status INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_companies_user ON companies(user_id);
    `);
  },
};
