// Central error handler (api.md: 500 Internal Server Error).
// Semua error yang dilempar ke next(err) diformat konsisten.
const { fail } = require('../utils/response');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err.message);
  return fail(res, 'Internal Server Error', [], 500);
}

function notFoundHandler(req, res) {
  return fail(res, `Not Found: ${req.method} ${req.originalUrl}`, [], 404);
}

module.exports = { errorHandler, notFoundHandler };
