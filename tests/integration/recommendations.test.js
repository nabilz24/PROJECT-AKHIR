// Integration tests — Recommendation Engine (TASK-080/081, TC-STU-005).
process.env.DB_PATH = ':memory:';

const request = require('supertest');
const { createApp } = require('../../server/src/app');
const { runMigrations } = require('../../server/src/db/migrate');
const { runSeeds } = require('../../server/src/db/seed');
const { getDb, closeDb } = require('../../server/src/db/connection');
const { clearRateLimitBuckets } = require('../../server/src/middlewares/rateLimit');

const app = createApp();
const VALID_PASSWORD = 'S3cret!pass';

function futureDate(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

async function registerAndLogin(name, email, role) {
  await request(app).post('/api/v1/auth/register').send({
    name,
    email,
    password: VALID_PASSWORD,
    role,
  });
  const login = await request(app).post('/api/v1/auth/login').send({
    email,
    password: VALID_PASSWORD,
  });
  return login.body.data.token;
}

async function skillIdByName(token, name) {
  const res = await request(app).get(`/api/v1/skills?search=${encodeURIComponent(name)}`).set('Authorization', `Bearer ${token}`);
  return res.body.data.skills.find((s) => s.name === name).id;
}

function userIdByEmail(email) {
  return getDb().prepare('SELECT id FROM users WHERE email = ?').get(email).id;
}

let projectId;
let studentId;
let studentToken;

beforeAll(async () => {
  runMigrations();
  runSeeds();
  const compToken = await registerAndLogin('PT Rec', 'ptrec@corp.id', 'perusahaan');
  getDb().prepare('UPDATE companies SET verified_status = 1 WHERE user_id = (SELECT id FROM users WHERE email = ?)').run('ptrec@corp.id');
  const reactId = await skillIdByName(compToken, 'React');
  const pyId = await skillIdByName(compToken, 'Python');
  const created = await request(app).post('/api/v1/companies/projects').set('Authorization', `Bearer ${compToken}`).send({
    judul: 'Rec Target',
    sektor_industri: 'Sektor-Rec',
    status: 'active',
    deadline: futureDate(20),
    skills: [
      { skill_id: reactId, level_required: 80 },
      { skill_id: pyId, level_required: 90 },
    ],
  });
  projectId = created.body.data.project.id;

  studentToken = await registerAndLogin('Rec Kid', 'reckid@kampus.ac.id', 'mahasiswa');
  studentId = userIdByEmail('reckid@kampus.ac.id');
  await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${studentToken}`).send({
    skill_id: reactId,
    proficiency_level: 55,
    source: 'course',
  });
  // Python tidak dimiliki -> critical. Analisis gap memicu generate otomatis.
  await request(app).get(`/api/v1/gap-analysis/${studentId}/${projectId}`).set('Authorization', `Bearer ${studentToken}`);
});

afterAll(() => {
  closeDb();
});

beforeEach(() => {
  clearRateLimitBuckets();
});

describe('GET /recommendations/student/:id (TASK-080)', () => {
  test('TC-STU-005: rekomendasi muncul dari gap + field lengkap + progres', async () => {
    const res = await request(app).get(`/api/v1/recommendations/student/${studentId}`).set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    // React medium -> course + practice; Python critical -> workshop + mentor = 4.
    expect(res.body.data.total).toBe(4);
    const types = res.body.data.recommendations.map((r) => r.type).sort();
    expect(types).toEqual(['course', 'mentor', 'practice-project', 'workshop']);
    for (const r of res.body.data.recommendations) {
      expect(r.title).toBeTruthy();
      expect(r.description).toBeTruthy();
      expect(['high', 'medium', 'low']).toContain(r.priority);
      expect(r.source).toBeTruthy();
      expect(r.status).toBe('pending');
    }
    expect(res.body.data.progress).toMatchObject({ pending: 4, 'in-progress': 0, completed: 0, consumed: 0 });
  });

  test('filter ?priority=high & ?type=course', async () => {
    const high = await request(app).get(`/api/v1/recommendations/student/${studentId}?priority=high`).set('Authorization', `Bearer ${studentToken}`);
    expect(high.body.data.total).toBe(2);
    expect(high.body.data.recommendations.every((r) => r.priority === 'high')).toBe(true);

    const course = await request(app).get(`/api/v1/recommendations/student/${studentId}?type=course`).set('Authorization', `Bearer ${studentToken}`);
    expect(course.body.data.total).toBe(1);
  });

  test('analisis ulang tidak menduplikasi rekomendasi aktif', async () => {
    await request(app).get(`/api/v1/gap-analysis/${studentId}/${projectId}`).set('Authorization', `Bearer ${studentToken}`);
    const res = await request(app).get(`/api/v1/recommendations/student/${studentId}`).set('Authorization', `Bearer ${studentToken}`);
    expect(res.body.data.total).toBe(4);
  });

  test('mahasiswa lain → 403; student tak ada → 404', async () => {
    const other = await registerAndLogin('Rec Other', 'recother@kampus.ac.id', 'mahasiswa');
    const forbidden = await request(app).get(`/api/v1/recommendations/student/${studentId}`).set('Authorization', `Bearer ${other}`);
    expect(forbidden.status).toBe(403);

    const compLogin = await request(app).post('/api/v1/auth/login').send({ email: 'ptrec@corp.id', password: VALID_PASSWORD });
    const missing = await request(app).get('/api/v1/recommendations/student/99999').set('Authorization', `Bearer ${compLogin.body.data.token}`);
    expect(missing.status).toBe(404);
  });
});

describe('POST /recommendations/:id/action (TASK-081)', () => {
  test('alur pending → in-progress → completed (+consumed_at)', async () => {
    const list = await request(app).get(`/api/v1/recommendations/student/${studentId}?type=course`).set('Authorization', `Bearer ${studentToken}`);
    const recId = list.body.data.recommendations[0].id;

    const start = await request(app).post(`/api/v1/recommendations/${recId}/action`).set('Authorization', `Bearer ${studentToken}`).send({ action: 'start' });
    expect(start.status).toBe(200);
    expect(start.body.data.recommendation.status).toBe('in-progress');
    expect(start.body.message).toBe('Status diupdate');

    const startAgain = await request(app).post(`/api/v1/recommendations/${recId}/action`).set('Authorization', `Bearer ${studentToken}`).send({ action: 'start' });
    expect(startAgain.status).toBe(400);

    const done = await request(app).post(`/api/v1/recommendations/${recId}/action`).set('Authorization', `Bearer ${studentToken}`).send({ action: 'completed' });
    expect(done.status).toBe(200);
    expect(done.body.data.recommendation.status).toBe('completed');
    expect(done.body.data.recommendation.consumed_at).toBeTruthy();

    const progress = await request(app).get(`/api/v1/recommendations/student/${studentId}`).set('Authorization', `Bearer ${studentToken}`);
    expect(progress.body.data.progress).toMatchObject({ pending: 3, 'in-progress': 0, completed: 1, consumed: 0 });
  });

  test('completed langsung dari pending → 400; action invalid → 422; milik orang lain → 404', async () => {
    const list = await request(app).get(`/api/v1/recommendations/student/${studentId}?type=workshop`).set('Authorization', `Bearer ${studentToken}`);
    const recId = list.body.data.recommendations[0].id;

    const skip = await request(app).post(`/api/v1/recommendations/${recId}/action`).set('Authorization', `Bearer ${studentToken}`).send({ action: 'completed' });
    expect(skip.status).toBe(400);

    const invalid = await request(app).post(`/api/v1/recommendations/${recId}/action`).set('Authorization', `Bearer ${studentToken}`).send({ action: 'fly' });
    expect(invalid.status).toBe(422);

    const other = await registerAndLogin('Rec Stranger', 'recstranger@kampus.ac.id', 'mahasiswa');
    const cross = await request(app).post(`/api/v1/recommendations/${recId}/action`).set('Authorization', `Bearer ${other}`).send({ action: 'start' });
    expect(cross.status).toBe(404);
  });

  test("notifikasi 'rec' terkirim saat generate", async () => {
    const notifs = await request(app).get('/api/v1/notifications?type=rec').set('Authorization', `Bearer ${studentToken}`);
    expect(notifs.status).toBe(200);
    expect(notifs.body.data.pagination.total).toBeGreaterThanOrEqual(1);
  });
});
