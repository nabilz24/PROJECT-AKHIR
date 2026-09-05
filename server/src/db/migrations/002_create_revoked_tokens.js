// Migration 002: revoked_tokens denylist (TASK-010: "Logout menghapus token").
// JWT stateless tidak bisa dihapus dari sisi client saja, sehingga jti token
// yang logout disimpan di sini dan dicek di auth middleware.
module.exports = {
  version: 2,
  name: 'create_revoked_tokens',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS revoked_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jti TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_revoked_tokens_jti ON revoked_tokens(jti);
    `);
  },
};
