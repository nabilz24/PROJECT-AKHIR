// Integration tests — Talent Matching (TASK-060/061/062, TC-CMP-002, QA Talent Matching).
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

let compToken;
let projectId;
const studentIds = {};

beforeAll(async () => {
  runMigrations();
  runSeeds();
  compToken = await registerAndLogin('PT Match', 'ptmatch@corp.id', 'perusahaan');
  getDb().prepare('UPDATE companies SET verified_status = 1 WHERE user_id = (SELECT id FROM users WHERE email = ?)').run('ptmatch@corp.id');
  const reactId = await skillIdByName(compToken, 'React');
  const nodeId = await skillIdByName(compToken, 'Node.js');
  const created = await request(app).post('/api/v1/companies/projects').set('Authorization', `Bearer ${compToken}`).send({
    judul: 'Match Target',
    sektor_industri: 'Sektor-Match',
    status: 'active',
    deadline: futureDate(25),
    skills: [
      { skill_id: reactId, level_required: 80 },
      { skill_id: nodeId, level_required: 60 },
    ],
  });
  projectId = created.body.data.project.id;

  // S-strong: React 90 course + Node 70 experience + portfolio → ekspektasi 80.
  const tStrong = await registerAndLogin('Strong Cand', 'strong@kampus.ac.id', 'mahasiswa');
  studentIds.strong = userIdByEmail('strong@kampus.ac.id');
  await addSkill(tStrong, reactId, 90, 'course');
  await addSkill(tStrong, nodeId, 70, 'experience');
  await request(app).post(`/api/v1/projects/${projectId}/apply`).set('Authorization', `Bearer ${tStrong}`).send({
    portfolio_url: 'https://github.com/strong/demo',
  });

  // S-mid: React 60 + Node 60 course + portfolio → ekspektasi 64.
  const tMid = await registerAndLogin('Mid Cand', 'mid@kampus.ac.id', 'mahasiswa');
  studentIds.mid = userIdByEmail('mid@kampus.ac.id');
  await addSkill(tMid, reactId, 60, 'course');
  await addSkill(tMid, nodeId, 60, 'course');
  await request(app).post(`/api/v1/projects/${projectId}/apply`).set('Authorization', `Bearer ${tMid}`).send({
    portfolio_url: 'https://github.com/mid/demo',
  });

  // S-weak: React 30 saja (tanpa Node) → ekspektasi 19. Aplikasi disisipkan
  // langsung karena gate apply Phase 4 menolak requirement tak lengkap.
  await registerAndLogin('Weak Cand', 'weak@kampus.ac.id', 'mahasiswa');
  studentIds.weak = userIdByEmail('weak@kampus.ac.id');
  const tWeakLogin = await request(app).post('/api/v1/auth/login').send({ email: 'weak@kampus.ac.id', password: VALID_PASSWORD });
  const weakToken = tWeakLogin.body.data.token;
  await addSkill(weakToken, reactId, 30, 'course');
  getDb().prepare("INSERT INTO applications (student_id, project_id, status) VALUES (?, ?, 'pending')").run(studentIds.weak, projectId);
});

afterAll(() => {
  closeDb();
});

beforeEach(() => {
  clearRateLimitBuckets();
});

describe('POST /api/v1/matching/calculate (TASK-060)', () => {
  test('skor kandidat kuat = 80 + breakdown + weights', async () => {
    const res = await request(app).post('/api/v1/matching/calculate').set('Authorization', `Bearer ${compToken}`).send({
      student_id: studentIds.strong,
      project_id: projectId,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.score).toBe(80);
    expect(res.body.data.components).toEqual({ skill: 100, experience: 50, portfolio: 100, certification: 0, availability: 100 });
    expect(res.body.data.breakdown).toHaveLength(2);
    expect(res.body.data.weights.skill).toBe(0.5);
  });

  test('mahasiswa hanya bisa menghitung skor sendiri (403); id tak ada (404)', async () => {
    const tMid = await registerAndLogin('Mid Calc', 'midcalc@kampus.ac.id', 'mahasiswa');
    const forbidden = await request(app).post('/api/v1/matching/calculate').set('Authorization', `Bearer ${tMid}`).send({
      student_id: studentIds.strong,
      project_id: projectId,
    });
    expect(forbidden.status).toBe(403);

    const noStudent = await request(app).post('/api/v1/matching/calculate').set('Authorization', `Bearer ${compToken}`).send({
      student_id: 99999,
      project_id: projectId,
    });
    expect(noStudent.status).toBe(404);

    const noProject = await request(app).post('/api/v1/matching/calculate').set('Authorization', `Bearer ${compToken}`).send({
      student_id: studentIds.strong,
      project_id: 99999,
    });
    expect(noProject.status).toBe(404);
  });

  test('QA anti-diskriminasi: kembaran data identik → skor identik', async () => {
    const t1 = await registerAndLogin('Twin Satu', 'twin1@kampus.ac.id', 'mahasiswa');
    const t2 = await registerAndLogin('Twin Dua Berbeda Nama', 'twin2@kampus.ac.id', 'mahasiswa');
    const reactId = await skillIdByName(t1, 'React');
    const nodeId = await skillIdByName(t1, 'Node.js');
    for (const [t] of [[t1], [t2]]) {
      // eslint-disable-next-line no-await-in-loop
      await addSkill(t, reactId, 90, 'course');
      // eslint-disable-next-line no-await-in-loop
      await addSkill(t, nodeId, 70, 'experience');
    }
    const id1 = userIdByEmail('twin1@kampus.ac.id');
    const id2 = userIdByEmail('twin2@kampus.ac.id');
    const r1 = await request(app).post('/api/v1/matching/calculate').set('Authorization', `Bearer ${compToken}`).send({
      student_id: id1,
      project_id: projectId,
    });
    const r2 = await request(app).post('/api/v1/matching/calculate').set('Authorization', `Bearer ${compToken}`).send({
      student_id: id2,
      project_id: projectId,
    });
    expect(r1.body.data.score).toBe(r2.body.data.score);
    expect(r1.body.data.score).toBe(70); // tanpa portfolio (belum apply): 50+10+0+0+10
  });
});

describe('GET /api/v1/matching/ranking (TASK-060/061)', () => {
  test('TC-CMP-002: terurut desc + threshold default project + persist match_score', async () => {
    const res = await request(app).get(`/api/v1/matching/ranking?project_id=${projectId}`).set('Authorization', `Bearer ${compToken}`);
    expect(res.status).toBe(200);
    // Threshold default 70: hanya strong (80) lolos; mid (64) & weak (19) tersaring.
    expect(res.body.data.min_score).toBe(70);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.candidates[0].student.name).toBe('Strong Cand');
    expect(res.body.data.candidates[0].match_score).toBe(80);
    expect(res.body.data.note).toMatch(/rekomendasi awal/);

    const db = getDb();
    const persisted = db.prepare('SELECT match_score FROM applications WHERE student_id = ? AND project_id = ?').get(studentIds.strong, projectId);
    expect(persisted.match_score).toBe(80);
  });

  test('min_score=0: semua kandidat terurut 80 > 64 > 19 + breakdown status', async () => {
    const res = await request(app).get(`/api/v1/matching/ranking?project_id=${projectId}&min_score=0`).set('Authorization', `Bearer ${compToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
    const scores = res.body.data.candidates.map((c) => c.match_score);
    expect(scores).toEqual([80, 64, 19]);
    const weak = res.body.data.candidates.find((c) => c.student.name === 'Weak Cand');
    const nodeRow = weak.breakdown.find((b) => b.name === 'Node.js');
    expect(nodeRow.current).toBe(0);
    expect(nodeRow.gap).toBe(60);
    expect(nodeRow.status).toBe('lemah');
    const strongReact = res.body.data.candidates[0].breakdown.find((b) => b.name === 'React');
    expect(strongReact.status).toBe('kuat');
  });

  test('project perusahaan lain → 404; mahasiswa → 403; tanpa project_id → 422', async () => {
    const other = await registerAndLogin('PT Asing Match', 'ptasingmatch@corp.id', 'perusahaan');
    const cross = await request(app).get(`/api/v1/matching/ranking?project_id=${projectId}`).set('Authorization', `Bearer ${other}`);
    expect(cross.status).toBe(404);

    const mhs = await registerAndLogin('Mhs Rank', 'mhsrank@kampus.ac.id', 'mahasiswa');
    const forbidden = await request(app).get(`/api/v1/matching/ranking?project_id=${projectId}`).set('Authorization', `Bearer ${mhs}`);
    expect(forbidden.status).toBe(403);

    const missing = await request(app).get('/api/v1/matching/ranking').set('Authorization', `Bearer ${compToken}`);
    expect(missing.status).toBe(422);
  });
});

describe('GET /api/v1/companies/candidates (TASK-061)', () => {
  test('filter ?skill=Node menyisakan pemilik Node + threshold default', async () => {
    const res = await request(app)
      .get(`/api/v1/companies/candidates?project_id=${projectId}&min_score=0&skill=Node`)
      .set('Authorization', `Bearer ${compToken}`);
    expect(res.status).toBe(200);
    const names = res.body.data.candidates.map((c) => c.student.name);
    expect(names).toContain('Strong Cand');
    expect(names).not.toContain('Weak Cand');
  });
});

describe('GET /api/v1/projects/:id/match (TASK-062)', () => {
  test('mahasiswa melihat skor + breakdown diri sendiri', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'mid@kampus.ac.id', password: VALID_PASSWORD });
    const res = await request(app).get(`/api/v1/projects/${projectId}/match`).set('Authorization', `Bearer ${login.body.data.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.match_score).toBe(64);
    expect(res.body.data.breakdown).toHaveLength(2);
    expect(res.body.data.note).toMatch(/rekomendasi awal/);
  });
});
