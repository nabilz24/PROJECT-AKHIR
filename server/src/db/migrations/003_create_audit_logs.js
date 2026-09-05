// Migration 003: audit_logs table (database.md, G_DESIGN security).
// Mencatat tindakan kritis: register/login/logout/gagal login/password_reset.
module.exports = {
  version: 3,
  name: 'create_audit_logs',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL CHECK (action IN ('login', 'register', 'logout', 'create_project', 'update_skill', 'apply_project', 'evaluate', 'password_reset', 'etc')),
        entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'student', 'company', 'project', 'skill', 'application', 'assessment', 'etc')),
        entity_id INTEGER NULL,
        old_value TEXT NULL,
        new_value TEXT NULL,
        ip_address TEXT NULL,
        user_agent TEXT NULL,
        logged_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_logged ON audit_logs(user_id, logged_at);
    `);
  },
};
