// Auth controller (TASK-010, api.md Bagian 2, QA TC-AUTH-001..007).
const { getDb } = require('../db/connection');
const config = require('../config');
const { ok, created, fail } = require('../utils/response');
const { hashPassword, comparePassword } = require('../utils/password');
const { signAccessToken, signPasswordResetToken, verifyToken } = require('../utils/jwt');
const { send } = require('../utils/mailer');
const { getDashboardUrl } = require('../utils/redirect');
const { logAudit } = require('../middlewares/audit');

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

function findActiveUserByEmail(db, email) {
  return db
    .prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL')
    .get(email);
}

function isLocked(user) {
  return !!user.locked_until && new Date(user.locked_until).getTime() > Date.now();
}

// POST /auth/register — QA TC-AUTH-001/002
async function register(req, res, next) {
  try {
    const db = getDb();
    const { name, email, password, role } = req.body;
    const existing = findActiveUserByEmail(db, email);
    if (existing) {
      return fail(res, 'Email already registered', [{ field: 'email', message: 'Email already registered' }], 400);
    }
    const passwordHash = await hashPassword(password);
    const result = db
      .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(name, email, passwordHash, role);
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    // TASK-020: profil peran otomatis dibuat saat registrasi agar GET /users/profile
    // langsung tersedia (mahasiswa -> student_profiles, perusahaan -> companies).
    if (role === 'mahasiswa') {
      db.prepare('INSERT INTO student_profiles (user_id) VALUES (?)').run(user.id);
    } else if (role === 'perusahaan') {
      db.prepare('INSERT INTO companies (user_id, nama_perusahaan) VALUES (?, ?)').run(user.id, name);
    }
    // [NEEDS DECISION]: verifikasi email disimulasikan hingga provider SMTP diputuskan.
    send({
      to: email,
      subject: 'Verifikasi email Campus Industry Talent Hub',
      body: `Halo ${name}, akun ${role} Anda terdaftar. (simulasi — link verifikasi belum aktif)`,
      meta: { kind: 'email-verification', userId: user.id },
    });
    logAudit({ userId: user.id, action: 'register', entityType: 'user', entityId: user.id, req });
    const token = signAccessToken(user);
    return created(res, { user, token, dashboard_url: getDashboardUrl(user.role) }, 'Daftar berhasil');
  } catch (err) {
    return next(err);
  }
}

// POST /auth/login — QA TC-AUTH-003/004/005
async function login(req, res, next) {
  try {
    const db = getDb();
    const { email, password } = req.body;
    const user = findActiveUserByEmail(db, email);
    if (!user) {
      logAudit({ userId: null, action: 'login', entityType: 'user', entityId: null, req });
      return fail(res, 'Invalid email or password', [], 401);
    }
    if (isLocked(user)) {
      return fail(res, 'Account locked, coba lagi setelah 15 menit', [], 401);
    }
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      const attempts = (user.failed_attempts || 0) + 1;
      let lockedUntil = user.locked_until;
      if (attempts >= config.lockoutThreshold) {
        lockedUntil = new Date(Date.now() + config.lockoutMinutes * 60 * 1000).toISOString();
      }
      db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
        attempts,
        lockedUntil,
        user.id
      );
      logAudit({ userId: user.id, action: 'login', entityType: 'user', entityId: user.id, req });
      if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
        return fail(res, 'Account locked, coba lagi setelah 15 menit', [], 401);
      }
      return fail(res, 'Invalid email or password', [], 401);
    }
    db.prepare("UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = datetime('now') WHERE id = ?").run(user.id);
    const publicData = publicUser(user);
    logAudit({ userId: user.id, action: 'login', entityType: 'user', entityId: user.id, req });
    const token = signAccessToken(publicData);
    return ok(res, { user: publicData, token, dashboard_url: getDashboardUrl(publicData.role) }, 'Login berhasil');
  } catch (err) {
    return next(err);
  }
}

// POST /auth/logout — QA TC-AUTH-006 (token masuk denylist)
async function logout(req, res, next) {
  try {
    const db = getDb();
    const expiresAt = new Date(req.token.exp * 1000).toISOString();
    db.prepare('INSERT OR IGNORE INTO revoked_tokens (jti, user_id, expires_at) VALUES (?, ?, ?)').run(
      req.token.jti,
      req.user.id,
      expiresAt
    );
    logAudit({ userId: req.user.id, action: 'logout', entityType: 'user', entityId: req.user.id, req });
    return ok(res, null, 'Logout berhasil');
  } catch (err) {
    return next(err);
  }
}

// GET /auth/me
async function me(req, res, next) {
  try {
    return ok(res, { user: req.user }, 'OK');
  } catch (err) {
    return next(err);
  }
}

// POST /auth/password-reset — QA TC-AUTH-007 (simulasi email, anti-enumeration)
async function requestPasswordReset(req, res, next) {
  try {
    const db = getDb();
    const { email } = req.body;
    const user = findActiveUserByEmail(db, email);
    if (user) {
      const token = signPasswordResetToken(publicUser(user));
      send({
        to: email,
        subject: 'Reset password Campus Industry Talent Hub',
        body: `Gunakan token berikut dalam 24 jam (simulasi): ${token}`,
        meta: { kind: 'password-reset', userId: user.id, token },
      });
      logAudit({ userId: user.id, action: 'password_reset', entityType: 'user', entityId: user.id, req });
    }
    return ok(res, null, 'Link reset dikirim ke email');
  } catch (err) {
    return next(err);
  }
}

// GET /auth/password-reset/confirm/:token — validasi token reset
async function confirmPasswordResetToken(req, res, next) {
  try {
    const db = getDb();
    let payload;
    try {
      payload = verifyToken(req.params.token);
    } catch (err) {
      return fail(res, 'Token reset tidak valid atau kedaluwarsa', [], 400);
    }
    if (payload.purpose !== 'password-reset') {
      return fail(res, 'Token reset tidak valid atau kedaluwarsa', [], 400);
    }
    const user = db
      .prepare('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL')
      .get(payload.sub);
    if (!user) {
      return fail(res, 'Token reset tidak valid atau kedaluwarsa', [], 400);
    }
    return ok(res, { canReset: true }, 'Token valid');
  } catch (err) {
    return next(err);
  }
}

// POST /auth/password-reset/confirm/:token — set password baru.
// (Tambahan dari api.md Bagian 2 yang hanya mendefinisikan GET confirm;
// dicatat sebagai baris baru di api.md Bagian 13 agar traceable.)
async function resetPassword(req, res, next) {
  try {
    const db = getDb();
    let payload;
    try {
      payload = verifyToken(req.params.token);
    } catch (err) {
      return fail(res, 'Token reset tidak valid atau kedaluwarsa', [], 400);
    }
    if (payload.purpose !== 'password-reset') {
      return fail(res, 'Token reset tidak valid atau kedaluwarsa', [], 400);
    }
    const user = db
      .prepare('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL')
      .get(payload.sub);
    if (!user) {
      return fail(res, 'Token reset tidak valid atau kedaluwarsa', [], 400);
    }
    const passwordHash = await hashPassword(req.body.password);
    db.prepare(
      "UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL, updated_at = datetime('now') WHERE id = ?"
    ).run(passwordHash, user.id);
    logAudit({ userId: user.id, action: 'password_reset', entityType: 'user', entityId: user.id, req });
    return ok(res, null, 'Password berhasil direset');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  me,
  requestPasswordReset,
  confirmPasswordResetToken,
  resetPassword,
};
