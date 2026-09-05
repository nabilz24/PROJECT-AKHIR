// Validation-result handler (api.md: 422 Validation Unprocessable).
// Dipakai setelah express-validator chain: ...rules, handleValidationErrors, handler.
const { validationResult } = require('express-validator');
const { fail } = require('../utils/response');

function handleValidationErrors(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }
  const errors = result.array().map((e) => ({
    field: e.path || e.param || 'unknown',
    message: e.msg,
  }));
  return fail(res, 'Validasi gagal', errors, 422);
}

module.exports = { handleValidationErrors };
