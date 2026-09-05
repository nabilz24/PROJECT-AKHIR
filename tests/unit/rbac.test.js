// Unit tests — RBAC middleware (TASK-010).
const { requireRole } = require('../../server/src/middlewares/rbac');

function mockRes() {
  const res = {};
  res.statusCode = null;
  res.body = null;
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((payload) => {
    res.body = payload;
    return res;
  });
  return res;
}

describe('requireRole', () => {
  test('role diizinkan → next() dipanggil', () => {
    const req = { user: { id: 1, role: 'kampus' } };
    const res = mockRes();
    const next = jest.fn();
    requireRole('kampus', 'dosen')(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('role tidak diizinkan → 403', () => {
    const req = { user: { id: 2, role: 'mahasiswa' } };
    const res = mockRes();
    const next = jest.fn();
    requireRole('kampus')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('tanpa user (belum login) → 401', () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();
    requireRole('mahasiswa')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});
