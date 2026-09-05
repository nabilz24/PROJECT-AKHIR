// Response helpers — format standar api.md Bagian 1:
// { success: boolean, data: {}, message: string, errors: [...] }
function ok(res, data, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, data, message, errors: [] });
}

function created(res, data, message = 'Created') {
  return ok(res, data, message, 201);
}

function fail(res, message, errors = [], status = 400) {
  return res.status(status).json({ success: false, data: null, message, errors });
}

module.exports = { ok, created, fail };
