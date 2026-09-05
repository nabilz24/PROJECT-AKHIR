// Simulated mailer (TASK-010).
// [NEEDS DECISION]: belum ada provider SMTP. Pengiriman email (verifikasi,
// password reset, notifikasi) saat ini DISIMULASIKAN: pesan dicatat ke console
// dan token terakhir disimpan di memori agar bisa diverifikasi test.
// Ganti implementasi send() dengan provider SMTP (mis. nodemailer) setelah keputusan.
const outbox = [];

function send({ to, subject, body, meta = {} }) {
  const message = { to, subject, body, meta, sentAt: new Date().toISOString() };
  outbox.push(message);
  console.log(`[mailer:simulated] to=${to} subject="${subject}"`);
  return message;
}

function lastSentTo(to) {
  for (let i = outbox.length - 1; i >= 0; i -= 1) {
    if (outbox[i].to === to) return outbox[i];
  }
  return null;
}

function clearOutbox() {
  outbox.length = 0;
}

module.exports = { send, lastSentTo, clearOutbox };
