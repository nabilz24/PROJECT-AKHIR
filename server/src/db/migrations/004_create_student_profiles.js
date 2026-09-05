// Migration 004: student_profiles table (database.md, TASK-020).
module.exports = {
  version: 4,
  name: 'create_student_profiles',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS student_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        npm TEXT NULL UNIQUE,
        program_studi TEXT NULL,
        angkatan INTEGER NULL,
        bio TEXT NULL,
        foto_profile TEXT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_student_profiles_user ON student_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_student_profiles_prodi ON student_profiles(program_studi);
      CREATE INDEX IF NOT EXISTS idx_student_profiles_angkatan ON student_profiles(angkatan);
    `);
  },
};
