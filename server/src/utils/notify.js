// Notification helpers (TASK-051).
// In-app: baris notifications. Email: disimulasikan via mailer
// ([NEEDS DECISION] provider SMTP, sama seperti auth).
const { send } = require('./mailer');

function pushNotification(db, { recipientType, recipientId, type, content }) {
  const result = db
    .prepare('INSERT INTO notifications (recipient_type, recipient_id, type, content) VALUES (?, ?, ?, ?)')
    .run(recipientType, recipientId, type, content);
  return result.lastInsertRowid;
}

function notifyEmail({ to, subject, body, meta }) {
  return send({ to, subject, body, meta });
}

module.exports = { pushNotification, notifyEmail };
