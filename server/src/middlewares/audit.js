// Audit log helper (database.md audit_logs, G_DESIGN security).
const { getDb } = require('../db/connection');

function logAudit({ userId = null, action, entityType, entityId = null, req = null, oldValue = null, newValue = null }) {
  const db = getDb();
  db.prepare(
    'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    userId,
    action,
    entityType,
    entityId,
    oldValue !== null && oldValue !== undefined ? JSON.stringify(oldValue) : null,
    newValue !== null && newValue !== undefined ? JSON.stringify(newValue) : null,
    req ? (req.headers['x-forwarded-for'] || req.ip || null) : null,
    req ? (req.headers['user-agent'] || null) : null
  );
}

module.exports = { logAudit };
