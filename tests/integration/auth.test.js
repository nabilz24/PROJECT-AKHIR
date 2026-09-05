// Integration tests — Auth API (TASK-010, QA TC-AUTH-001..007, api.md Bagian 2).
process.env.DB_PATH = ':memory:';

const request = require('supertest');
const { createApp } = require('../../server/src/app');
const { runMigrations } = require('../../server/src/db/migrate');
const { getDb, closeDb } = require('../../server/src/db/connection');
const { lastSentTo, clearOutbox } = require('../../server/src/utils/mailer');

const app = createApp();
const VALID_PASSWORD = 'S3cret!pass';

beforeAll(() => {
  runMigrations();
});

afterAll(() => {
  closeDb();
});

beforeEach(() => {
  clearOutbox();
});

describe('POST /api/v1/auth/register', () => {
  test('TC-AUTH-001: register email valid → 201 user + token', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Mahasiswa Satu',
      email: 'mhs1@kampus.ac.id',
      password: VALID_PASSWORD,
      role: 'mahasiswa',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('mhs1@kampus.ac.id');
    expect(res.body.data.user.role).toBe('mahasiswa');
    expect(res.body.data.user).not.toHaveProperty('password_hash');
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.message).toBe('Daftar berhasil');
  });

  test('TC-AUTH-002: register email duplikat → 400 "Email already registered"', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Duplikat',
      email: 'dup@kampus.ac.id',
      password: VALID_PASSWORD,
      role: 'mahasiswa',
    });
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Duplikat Lagi',
      email: 'dup@kampus.ac.id',
      password: VALID_PASSWORD,
      role: 'perusahaan',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Email already registered');
  });

  test('validasi: email salah format → 422', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Bad Email',
      email: 'bukan-email',
      password: VALID_PASSWORD,
      role: 'mahasiswa',
    });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  test('validasi: password lemah → 422', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Weak Pass',
      email: 'weak@kampus.ac.id',
      password: '12345678',
      role: 'mahasiswa',
    });
    expect(res.status).toBe(422);
  });

  test('validasi: role tidak dikenal → 422', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Bad Role',
      email: 'role@kampus.ac.id',
      password: VALID_PASSWORD,
      role: 'superadmin',
    });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeAll(async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Login User',
      email: 'login@kampus.ac.id',
      password: VALID_PASSWORD,
      role: 'perusahaan',
    });
  });

  test('TC-AUTH-003: login kredensial benar → 200 + JWT', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'login@kampus.ac.id',
      password: VALID_PASSWORD,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('perusahaan');
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.message).toBe('Login berhasil');
  });

  test('TC-AUTH-004: login kredensial salah → 401 + audit tercatat', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'login@kampus.ac.id',
      password: 'Wr0ng!pass',
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
    const db = getDb();
    const audit = db
      .prepare("SELECT id FROM audit_logs WHERE action = 'login' AND entity_type = 'user'")
      .get();
    expect(audit).toBeTruthy();
  });

  test('TC-AUTH-005: 3x gagal → akun terkunci 15 menit', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Lock User',
      email: 'lock@kampus.ac.id',
      password: VALID_PASSWORD,
      role: 'mahasiswa',
    });
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(app).post('/api/v1/auth/login').send({
        email: 'lock@kampus.ac.id',
        password: 'Wr0ng!pass',
      });
    }
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'lock@kampus.ac.id',
      password: VALID_PASSWORD,
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Account locked/);
  });
});

describe('POST /api/v1/auth/logout & GET /api/v1/auth/me', () => {
  test('TC-AUTH-006: logout membuang token; /me lalu 401; tanpa token 401', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Logout User',
      email: 'logout@kampus.ac.id',
      password: VALID_PASSWORD,
      role: 'mahasiswa',
    });
    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'logout@kampus.ac.id',
      password: VALID_PASSWORD,
    });
    const token = login.body.data.token;

    const meBefore = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(meBefore.status).toBe(200);
    expect(meBefore.body.data.user.email).toBe('logout@kampus.ac.id');

    const logout = await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(logout.status).toBe(200);
    expect(logout.body.message).toBe('Logout berhasil');

    const meAfter = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(meAfter.status).toBe(401);

    const meNone = await request(app).get('/api/v1/auth/me');
    expect(meNone.status).toBe(401);
  });
});

describe('Password reset (simulasi email)', () => {
  test('TC-AUTH-007: request → confirm → reset → login password baru', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Reset User',
      email: 'reset@kampus.ac.id',
      password: VALID_PASSWORD,
      role: 'mahasiswa',
    });

    const reqReset = await request(app).post('/api/v1/auth/password-reset').send({
      email: 'reset@kampus.ac.id',
    });
    expect(reqReset.status).toBe(200);
    expect(reqReset.body.message).toBe('Link reset dikirim ke email');

    const sent = lastSentTo('reset@kampus.ac.id');
    expect(sent).toBeTruthy();
    const token = sent.meta.token;
    expect(typeof token).toBe('string');

    const confirm = await request(app).get(`/api/v1/auth/password-reset/confirm/${token}`);
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.canReset).toBe(true);

    const newPassword = 'N3w!passw0rd';
    const reset = await request(app)
      .post(`/api/v1/auth/password-reset/confirm/${token}`)
      .send({ password: newPassword });
    expect(reset.status).toBe(200);

    const loginNew = await request(app).post('/api/v1/auth/login').send({
      email: 'reset@kampus.ac.id',
      password: newPassword,
    });
    expect(loginNew.status).toBe(200);

    const loginOld = await request(app).post('/api/v1/auth/login').send({
      email: 'reset@kampus.ac.id',
      password: VALID_PASSWORD,
    });
    expect(loginOld.status).toBe(401);
  });

  test('token reset palsu → 400', async () => {
    const res = await request(app).get('/api/v1/auth/password-reset/confirm/bogus-token');
    expect(res.status).toBe(400);
  });
});
