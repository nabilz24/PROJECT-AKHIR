// Integration tests — Skill Gap (TASK-070/071/072, QA SKILL-001..004, TC-STU-003).
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

async function addSkill(token, skillId, level, source = 'course') {
  return request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${token}`).send({
    skill_id: skillId,
    proficiency_level: level,
    source,
  });
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
  const compToken = await registerAndLogin('PT Gap', 'ptgap@corp.id', 'perusahaan');
  getDb().prepare('UPDATE companies SET verified_status = 1 WHERE user_id = (SELECT id FROM users WHERE email = ?)').run('ptgap@corp.id');
  const reactId = await skillIdByName(compToken, 'React');
  const nodeId = await skillIdByName(compToken, 'Node.js');
  const sqlId = await skillIdByName(compToken, 'SQL');
  const pyId = await skillIdByName(compToken, 'Python');
  const created = await request(app).post('/api/v1/companies/projects').set('Authorization', `Bearer ${compToken}`).send({
    judul: 'Gap Target',
    sektor_industri: 'Sektor-Gap',
    status: 'active',
    deadline: futureDate(20),
    skills: [
      { skill_id: reactId, level_required: 80 },
      { skill_id: nodeId, level_required: 50 },
      { skill_id: sqlId, level_required: 60 },
      { skill_id: pyId, level_required: 90 },
    ],
  });
  projectId = created.body.data.project.id;

  studentToken = await registerAndLogin('Gap Kid', 'gapkid@kampus.ac.id', 'mahasiswa');
  studentId = userIdByEmail('gapkid@kampus.ac.id');
  await addSkill(studentToken, reactId, 55); // gap 25 medium (SKILL-001)
  await addSkill(studentToken, nodeId, 70); // surplus → no-gap (SKILL-003)
  await addSkill(studentToken, sqlId, 60); // equal → no-gap (SKILL-002)
  // Python tidak dimiliki → gap 90 critical (SKILL-004)
});

afterAll(() => {
  closeDb();
});

beforeEach(() => {
  clearRateLimitBuckets();
});

describe('GET /gap-analysis/:studentId/:projectId (TASK-070/071)', () => {
  test('TC-STU-003: gap per skill + klasifikasi + rekomendasi + summary', async () => {
    const res = await request(app)
      .get(`/api/v1/gap-analysis/${studentId}/${projectId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.gaps).toHaveLength(4);

    const byName = Object.fromEntries(res.body.data.gaps.map((g) => [g.name, g]));
    expect(byName.React).toMatchObject({ required: 80, current: 55, gap_value: 25, classification: 'medium' });
    expect(byName.React.recommendation.type).toBe('course');
    expect(byName.SQL).toMatchObject({ gap_value: 0, classification: 'no-gap' });
    expect(byName['Node.js']).toMatchObject({ gap_value: 0, classification: 'no-gap' });
    expect(byName.Python).toMatchObject({ required: 90, current: 0, gap_value: 90, classification: 'critical' });

    expect(res.body.data.summary.counts).toEqual({ 'no-gap': 2, small: 0, medium: 1, large: 0, critical: 1 });
  });

  test('hasil persist ke skill_gaps tanpa duplikat saat dihitung ulang', async () => {
    const db = getDb();
    const count1 = db.prepare('SELECT COUNT(*) AS c FROM skill_gaps WHERE student_id = ? AND project_id = ?').get(studentId, projectId).c;
    expect(count1).toBe(4);
    await request(app).get(`/api/v1/gap-analysis/${studentId}/${projectId}`).set('Authorization', `Bearer ${studentToken}`);
    const count2 = db.prepare('SELECT COUNT(*) AS c FROM skill_gaps WHERE student_id = ? AND project_id = ?').get(studentId, projectId).c;
    expect(count2).toBe(4);
    const row = db.prepare("SELECT classification, recommendation_type FROM skill_gaps WHERE student_id = ? AND required_skill_id = (SELECT id FROM skills WHERE name = 'Python')").get(studentId);
    expect(row.classification).toBe('critical');
    expect(row.recommendation_type).toBe('workshop');
  });

  test('mahasiswa lain → 403; student tak ada → 404; project tak ada → 404', async () => {
    const other = await registerAndLogin('Gap Other', 'gapother@kampus.ac.id', 'mahasiswa');
    const forbidden = await request(app).get(`/api/v1/gap-analysis/${studentId}/${projectId}`).set('Authorization', `Bearer ${other}`);
    expect(forbidden.status).toBe(403);

    const compLogin = await request(app).post('/api/v1/auth/login').send({ email: 'ptgap@corp.id', password: VALID_PASSWORD });
    const noStudent = await request(app).get(`/api/v1/gap-analysis/99999/${projectId}`).set('Authorization', `Bearer ${compLogin.body.data.token}`);
    expect(noStudent.status).toBe(404);

    const noProject = await request(app).get(`/api/v1/gap-analysis/${studentId}/99999`).set('Authorization', `Bearer ${studentToken}`);
    expect(noProject.status).toBe(404);
  });
});

describe('GET /gap-analysis/student/:studentId (TASK-072)', () => {
  test('distribusi keseluruhan + worst untuk data grafik', async () => {
    const res = await request(app)
      .get(`/api/v1/gap-analysis/student/${studentId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.overall_gap_distribution).toEqual({ 'no-gap': 2, small: 0, medium: 1, large: 0, critical: 1 });
    expect(res.body.data.total).toBe(4);
    expect(res.body.data.worst[0].name).toBe('Python');
  });
});
