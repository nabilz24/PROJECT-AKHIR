// Central application configuration (TASK-010).
// Values come from environment with safe development defaults.
// [NEEDS DECISION]: JWT_SECRET wajib di-set via environment di staging/production.
// Secret default di bawah HANYA untuk development lokal.
module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  dbPath: process.env.DB_PATH || 'server/data/app.db',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h', // G_DESIGN: token expiry 24 jam
  jwtResetExpiresIn: '24h', // QA TC-AUTH-007: link reset valid 24 jam
  bcryptRounds: 10, // G_DESIGN: hash bcrypt minimal 10 rounds
  lockoutThreshold: 3, // QA TC-AUTH-005: kunci setelah 3x gagal
  lockoutMinutes: 15, // QA TC-AUTH-005: lockout 15 menit
  rateLimit: {
    windowMs: 60 * 1000,
    maxPerIp: 60, // api.md: 60 request/menit per IP
    maxLoginPerIp: 30, // login lebih ketat dari default
  },
};
