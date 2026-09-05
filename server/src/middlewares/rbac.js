// RBAC middleware (TASK-010: tiap role mengakses endpoint sesuai scope).
// G_DESIGN roles: Mahasiswa, Perusahaan, Kampus/Admin, Dosen.
// Dipakai setelah authenticateToken: requireRole('kampus'), dst.
const { fail } = require('../utils/response');

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 'Unauthorized: login diperlukan', [], 401);
    }
    if (!allowedRoles.includes(req.user.role)) {
      return fail(res, `Forbidden: role '${req.user.role}' tidak diizinkan`, [], 403);
    }
    return next();
  };
}

module.exports = { requireRole };
