// Migration 011: notifications table (database.md, TASK-051).
module.exports = {
  version: 11,
  name: 'create_notifications',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient_type TEXT NOT NULL CHECK (recipient_type IN ('student', 'company', 'campus')),
        recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('apply', 'match', 'gap', 'rec', 'eval', 'system')),
        content TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_type, recipient_id);
    `);
  },
};
