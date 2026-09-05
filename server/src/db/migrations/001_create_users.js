// Migration 001: users table (database.md + TASK-010 lockout support).
// Kolom failed_attempts/locked_until adalah tambahan dari database.md
// untuk memenuhi QA TC-AUTH-005 (lockout 15 menit setelah 3x gagal).
module.exports = {
  version: 1,
  name: 'create_users',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('mahasiswa', 'perusahaan', 'kampus', 'dosen')),
        email_verified_at TEXT NULL,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TEXT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);
  },
};
