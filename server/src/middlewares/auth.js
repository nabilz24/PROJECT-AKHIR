// JWT authentication middleware (TASK-010, G_DESIGN RBAC entry point).
// Memverifikasi Bearer token, menolak token yang di-revoke (logout),
// dan memasang req.user = { id, name, email, role }.
const { verifyToken } = require('../utils/jwt');
const { fail } = require('../utils/response');
const { getDb } = require('../db/connection');

function authenticateToken(req, res, next) {
  const header = req.headers.authorization || '';
  let token = null;
  const [scheme, headerToken] = header.split(' ');
  if (scheme === 'Bearer' && headerToken) {
    token = headerToken;
  } else if (req.query && req.query.token) {
    // [NEEDS DECISION]: fallback query-token agar navigasi browser ke halaman
    // EJS bisa terautentikasi (browser tak bisa kirim Bearer). Opsi produksi:
    // httpOnly cookie session. Jangan log URL bertoken.
    token = req.query.token;
  }
  if (!token) {
    return fail(res, 'Unauthorized: token hilang atau format salah', [], 401);
  }
  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    return fail(res, 'Unauthorized: token tidak valid atau kedaluwarsa', [], 401);
  }
  if (payload.purpose && payload.purpose !== 'access') {
    return fail(res, 'Unauthorized: token bukan token akses', [], 401);
  }
  const db = getDb();
  const revoked = db.prepare('SELECT id FROM revoked_tokens WHERE jti = ?').get(payload.jti);
  if (revoked) {
    return fail(res, 'Unauthorized: token sudah logout', [], 401);
  }
  const user = db
    .prepare('SELECT id, name, email, role FROM users WHERE id = ? AND deleted_at IS NULL')
    .get(payload.sub);
  if (!user) {
    return fail(res, 'Unauthorized: user tidak ditemukan', [], 401);
  }
  req.user = user;
  req.token = { jti: payload.jti, exp: payload.exp };
  return next();
}

// Optional auth untuk endpoint publik-yang-diperkaya (marketplace TASK-041):
// bila Bearer valid terpasang user, bila tidak tetap lanjut sebagai publik.
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next();
  }
  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    return next();
  }
  if (payload.purpose && payload.purpose !== 'access') {
    return next();
  }
  const db = getDb();
  const revoked = db.prepare('SELECT id FROM revoked_tokens WHERE jti = ?').get(payload.jti);
  if (revoked) {
    return next();
  }
  const user = db
    .prepare('SELECT id, name, email, role FROM users WHERE id = ? AND deleted_at IS NULL')
    .get(payload.sub);
  if (user) {
    req.user = user;
    req.token = { jti: payload.jti, exp: payload.exp };
  }
  return next();
}

module.exports = { authenticateToken, optionalAuth };
