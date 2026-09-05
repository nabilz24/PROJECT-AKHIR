// Integration tests — GET /mentor/awaiting (TASK-109, halaman Assess dosen).
process.env.DB_PATH = ':memory:';

const request = require('supertest');
const { createApp } = require('../../server/src/app');
const { runMigrations } = require('../../server/src/db/migrate');
const { runSeeds } = require('../../server/src/db/seed');
const { getDb, closeDb } = require('../../server/src/db/connection');
const { hashPassword } = require('../../server/src/utils/password');
const { clearRateLimitBuckets } = require('../../server/src/middlewares/rateLimit');

const app = createApp();
const VALID_PASSWORD = 'S3cret!pass';

function futureDate(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

async function registerAndLogin(name, email, role) {
  await request(app).post('/api/v1/auth/register').send({ name, email, password: VALID_PASSWORD, role });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: VALID_PASSWORD });
  return login.body.data.token;
}

let compToken;
let dosenToken;
let mhsToken;
let projectId;
let studentId;

beforeAll(async () => {
  runMigrations();
  runSeeds();
  compToken = await registerAndLogin('PT Mentor', 'ptmentor@corp.id', 'perusahaan');
  getDb().prepare('UPDATE companies SET verified_status = 1 WHERE user_id = (SELECT id FROM users WHERE email = ?)').run('ptmentor@corp.id');
  const reactId = (await request(app).get('/api/v1/skills?search=React').set('Authorization', `Bearer ${compToken}`)).body.data.skills[0].id;
  const created = await request(app).post('/api/v1/companies/projects').set('Authorization', `Bearer ${compToken}`).send({
    judul: 'Mentor Target', status: 'active', deadline: futureDate(20),
    skills: [{ skill_id: reactId, level_required: 10 }],
  });
  projectId = created.body.data.project.id;

  mhsToken = await registerAndLogin('Mhs Mentor', 'mhsmentor@kampus.ac.id', 'mahasiswa');
  studentId = getDb().prepare('SELECT id FROM users WHERE email = ?').get('mhsmentor@kampus.ac.id').id;
  await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${mhsToken}`).send({ skill_id: reactId, proficiency_level: 50, source: 'course' });
  const apply = await request(app).post(`/api/v1/projects/${projectId}/apply`).set('Authorization', `Bearer ${mhsToken}`).send({});
  await request(app).patch(`/api/v1/companies/applications/${apply.body.data.application.id}`).set('Authorization', `Bearer ${compToken}`).send({ status: 'accepted' });

  const hash = await hashPassword(VALID_PASSWORD);
  getDb().prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Dosen Mentor', 'dosenmentor@kampus.ac.id', ?, 'dosen')").run(hash);
  dosenToken = (await request(app).post('/api/v1/auth/login').send({ email: 'dosenmentor@kampus.ac.id', password: VALID_PASSWORD })).body.data.token;
});

afterAll(() => {
  closeDb();
});

beforeEach(() => {
  clearRateLimitBuckets();
});

describe('GET /mentor/awaiting', () => {
  test('dosen: accepted belum dinilai → assessed 0 + ID lengkap', async () => {
    const res = await request(app).get('/api/v1/mentor/awaiting').set('Authorization', `Bearer ${dosenToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.awaiting.length).toBe(1);
    expect(res.body.data.awaiting[0]).toMatchObject({ project_id: projectId, student_id: studentId, assessed: 0 });
    expect(res.body.data.awaiting[0].student_name).toBe('Mhs Mentor');
  });

  test('setelah dosen menilai → assessed 1', async () => {
    await request(app).put(`/api/v1/companies/projects/${projectId}`).set('Authorization', `Bearer ${compToken}`).send({ status: 'closed' });
    await request(app).post('/api/v1/assessments').set('Authorization', `Bearer ${dosenToken}`).send({
      project_id: projectId, student_id: studentId,
      rating_skill: 4, rating_communication: 4, rating_punctuality: 4, rating_overall: 4,
    });
    const res = await request(app).get('/api/v1/mentor/awaiting').set('Authorization', `Bearer ${dosenToken}`);
    expect(res.body.data.awaiting[0].assessed).toBe(1);
  });

  test('mahasiswa → 403; tanpa token → 401', async () => {
    expect((await request(app).get('/api/v1/mentor/awaiting').set('Authorization', `Bearer ${mhsToken}`)).status).toBe(403);
    expect((await request(app).get('/api/v1/mentor/awaiting')).status).toBe(401);
  });
});
