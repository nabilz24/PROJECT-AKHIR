// Integration tests — Dashboard & Analytics + Halaman EJS (TASK-100..103, TC-CMP-005/006/007).
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

let mhsToken;
let compToken;
let kampusToken;
let dosenToken;
let projectId;

beforeAll(async () => {
  runMigrations();
  runSeeds();

  compToken = await registerAndLogin('PT Dash', 'ptdash@corp.id', 'perusahaan');
  getDb().prepare('UPDATE companies SET verified_status = 1 WHERE user_id = (SELECT id FROM users WHERE email = ?)').run('ptdash@corp.id');
  const reactId = await skillIdByName(compToken, 'React');
  const created = await request(app).post('/api/v1/companies/projects').set('Authorization', `Bearer ${compToken}`).send({
    judul: 'Dash Target',
    sektor_industri: 'Sektor-Dash',
    status: 'active',
    deadline: futureDate(20),
    skills: [{ skill_id: reactId, level_required: 60 }],
  });
  projectId = created.body.data.project.id;

  mhsToken = await registerAndLogin('Dash Kid', 'dashkid@kampus.ac.id', 'mahasiswa');
  getDb().prepare('UPDATE student_profiles SET program_studi = ?, angkatan = ? WHERE user_id = (SELECT id FROM users WHERE email = ?)').run('Informatika', 2023, 'dashkid@kampus.ac.id');
  await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${mhsToken}`).send({
    skill_id: reactId,
    proficiency_level: 40,
    source: 'course',
  });
  await request(app).post(`/api/v1/projects/${projectId}/apply`).set('Authorization', `Bearer ${mhsToken}`).send({});
  // Picu generate rekomendasi + match_score via analisis & ranking.
  const db = getDb();
  const sid = db.prepare('SELECT id FROM users WHERE email = ?').get('dashkid@kampus.ac.id').id;
  await request(app).get(`/api/v1/gap-analysis/${sid}/${projectId}`).set('Authorization', `Bearer ${mhsToken}`);
  await request(app).get(`/api/v1/matching/ranking?project_id=${projectId}`).set('Authorization', `Bearer ${compToken}`);

  kampusToken = await registerAndLogin('Admin Kampus', 'adminkampus@kampus.ac.id', 'kampus');

  const hash = await hashPassword(VALID_PASSWORD);
  db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Dosen Dash', 'dosendash@kampus.ac.id', ?, 'dosen')").run(hash);
  const login = await request(app).post('/api/v1/auth/login').send({ email: 'dosendash@kampus.ac.id', password: VALID_PASSWORD });
  dosenToken = login.body.data.token;
});

afterAll(() => {
  closeDb();
});

beforeEach(() => {
  clearRateLimitBuckets();
});

describe('Dashboard data API', () => {
  test('mahasiswa: kartu project baru + top-3 rekomendasi + pending + notif', async () => {
    const res = await request(app).get('/api/v1/students/dashboard').set('Authorization', `Bearer ${mhsToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.new_projects.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.new_projects[0].match_score).toBeDefined();
    expect(res.body.data.top_recommendations.length).toBeLessThanOrEqual(3);
    expect(res.body.data.pending_applications.length).toBe(1);
    expect(res.body.data.skills_count).toBe(1);
  });

  test('TC-CMP-005: perusahaan: project aktif + kandidat + evaluasi + rata-rata match', async () => {
    const res = await request(app).get('/api/v1/companies/dashboard').set('Authorization', `Bearer ${compToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.active_projects_count).toBe(1);
    expect(res.body.data.waiting_candidates_count).toBe(1);
    expect(res.body.data.waiting_candidates[0].student_name).toBe('Dash Kid');
    expect(res.body.data.pending_evaluations_count).toBe(0);
    expect(typeof res.body.data.avg_match_score).toBe('number');
  });

  test('TC-CMP-006: kampus: total + rata-rata gap + top skill', async () => {
    const res = await request(app).get('/api/v1/campus/dashboard').set('Authorization', `Bearer ${kampusToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total_students).toBeGreaterThanOrEqual(1);
    expect(res.body.data.total_companies).toBeGreaterThanOrEqual(1);
    expect(res.body.data.total_active_projects).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.data.avg_gap).toBe('number');
    expect(res.body.data.top_demanded_skills.length).toBeGreaterThanOrEqual(1);
  });

  test('RBAC: mahasiswa ke dashboard perusahaan → 403; perusahaan ke kampus → 403', async () => {
    const a = await request(app).get('/api/v1/companies/dashboard').set('Authorization', `Bearer ${mhsToken}`);
    expect(a.status).toBe(403);
    const b = await request(app).get('/api/v1/campus/dashboard').set('Authorization', `Bearer ${compToken}`);
    expect(b.status).toBe(403);
  });
});

describe('Analytics API (TASK-103, TC-CMP-007)', () => {
  test('skill-distribution: pie-data + filter prodi', async () => {
    const res = await request(app).get('/api/v1/analytics/skill-distribution').set('Authorization', `Bearer ${kampusToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.distribution.find((s) => s.name === 'React').students).toBeGreaterThanOrEqual(1);

    const filtered = await request(app).get('/api/v1/analytics/skill-distribution?program_studi=Informatika').set('Authorization', `Bearer ${kampusToken}`);
    expect(filtered.body.data.total_students).toBe(1);
  });

  test('industry-demand: tren per bulan + top skill', async () => {
    const res = await request(app).get('/api/v1/analytics/industry-demand').set('Authorization', `Bearer ${kampusToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.top_skills.find((s) => s.skill === 'React')).toBeTruthy();
  });

  test('gap-heatmap: matriks prodi x skill', async () => {
    const res = await request(app).get('/api/v1/analytics/gap-heatmap').set('Authorization', `Bearer ${kampusToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.skills).toContain('React');
    const info = res.body.data.matrix.find((r) => r.program_studi === 'Informatika');
    expect(info).toBeTruthy();
    expect(typeof info.gaps.React).toBe('number');
  });

  test('export CSV: header + baris gap; format pdf → 422', async () => {
    const res = await request(app).get('/api/v1/analytics/export?format=csv').set('Authorization', `Bearer ${kampusToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/gap-export\.csv/);
    expect(res.text.split('\n')[0]).toBe('student_name,email,program_studi,skill,required,current,gap,classification');
    expect(res.text).toMatch(/Dash Kid/);

    const bad = await request(app).get('/api/v1/analytics/export?format=pdf').set('Authorization', `Bearer ${kampusToken}`);
    expect(bad.status).toBe(422);
  });

  test('mahasiswa ke analytics → 403', async () => {
    const res = await request(app).get('/api/v1/analytics/skill-distribution').set('Authorization', `Bearer ${mhsToken}`);
    expect(res.status).toBe(403);
  });
});

describe('Halaman EJS', () => {
  test('login page publik 200 HTML', async () => {
    const res = await request(app).get('/login');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toMatch(/Campus Industry Talent Hub/);
  });

  test.each([
    ['/dashboard/student', 'mhsToken', 'Dashboard Mahasiswa'],
    ['/dashboard/company', 'compToken', 'Dashboard Perusahaan'],
    ['/dashboard/campus', 'kampusToken', 'Dashboard Kampus'],
    ['/dashboard/mentor', 'dosenToken', 'Dashboard Mentor'],
    ['/dashboard/analytics', 'kampusToken', 'Analytics'],
  ])('%s render 200 + judul', async (path, tokenName, heading) => {
    const tokens = { mhsToken, compToken, kampusToken, dosenToken };
    const res = await request(app).get(`${path}?token=${tokens[tokenName]}`);
    expect(res.status).toBe(200);
    expect(res.text).toMatch(heading);
  });

  test('tanpa token → 401; lintas role → 403', async () => {
    const anon = await request(app).get('/dashboard/student');
    expect(anon.status).toBe(401);
    const cross = await request(app).get(`/dashboard/company?token=${mhsToken}`);
    expect(cross.status).toBe(403);
  });
});
