// Fixed-window in-memory rate limiter (TASK-010, api.md Bagian 1).
// Catatan: dependensi express-rate-limit v8 di package.json berstatus ESM-only
// dan tidak bisa di-require dari codebase CommonJS ini, sehingga limiter
// diimplementasikan sendiri (cocok untuk MVP satu proses).
// [NEEDS DECISION]: untuk multi-proses/produksi, ganti dengan store eksternal (Redis).
const { fail } = require('../utils/response');
const config = require('../config');

const buckets = new Map(); // key -> { count, resetAt }

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return (req.ip || (req.socket && req.socket.remoteAddress) || 'unknown').toString();
}

function createRateLimiter({ max, keyPrefix }) {
  return (req, res, next) => {
    const key = `${keyPrefix}:${clientIp(req)}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + config.rateLimit.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    if (bucket.count > max) {
      return fail(res, 'Too Many Requests', [], 429);
    }
    return next();
  };
}

function clearRateLimitBuckets() {
  buckets.clear();
}

const authLimiter = createRateLimiter({ max: config.rateLimit.maxPerIp, keyPrefix: 'auth' });
const loginLimiter = createRateLimiter({
  max: config.rateLimit.maxLoginPerIp,
  keyPrefix: 'login',
});

module.exports = { createRateLimiter, authLimiter, loginLimiter, clearRateLimitBuckets };
