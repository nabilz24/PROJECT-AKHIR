// Integration tests — Assessment & Evaluation (TASK-090/091/092, TC-CMP-004, TC-STU-006).
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

function userIdByEmail(email) {
  return getDb().prepare('SELECT id FROM users WHERE email = ?').get(email).id;
}

let compToken;
let reactId;
const projects = {};
const students = {};

async function makeProject(judul) {
  const res = await request(app).post('/api/v1/companies/projects').set('Authorization', `Bearer ${compToken}`).send({
    judul,
    sektor_industri: 'Sektor-Eval',
    status: 'active',
    deadline: futureDate(20),
    skills: [{ skill_id: reactId, level_required: 60 }],
  });
  return res.body.data.project.id;
}

async function closeProject(projectId) {
  await request(app).put(`/api/v1/companies/projects/${projectId}`).set('Authorization', `Bearer ${compToken}`).send({ status: 'closed' });
}

async function applyAndAccept(email, projectId) {
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: VALID_PASSWORD });
  const token = login.body.data.token;
  const apply = await request(app).post(`/api/v1/projects/${projectId}/apply`).set('Authorization', `Bearer ${token}`).send({});
  await request(app).patch(`/api/v1/companies/applications/${apply.body.data.application.id}`).set('Authorization', `Bearer ${compToken}`).send({ status: 'accepted' });
  return token;
}

beforeAll(async () => {
  runMigrations();
  runSeeds();
  compToken = await registerAndLogin('PT Eval', 'pteval@corp.id', 'perusahaan');
  getDb().prepare('UPDATE companies SET verified_status = 1 WHERE user_id = (SELECT id FROM users WHERE email = ?)').run('pteval@corp.id');
  reactId = await skillIdByName(compToken, 'React');

  projects.closed = await makeProject('Eval Closed Target');
  projects.open = await makeProject('Eval Open Target');
  projects.pending = await makeProject('Eval Pending Target');

  // Student utama: React 70.
  await registerAndLogin('Eval Kid', 'evalkid@kampus.ac.id', 'mahasiswa');
  students.main = userIdByEmail('evalkid@kampus.ac.id');
  const tMain = await request(app).post('/api/v1/auth/login').send({ email: 'evalkid@kampus.ac.id', password: VALID_PASSWORD });
  students.mainToken = tMain.body.data.token;
  await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${students.mainToken}`).send({
    skill_id: reactId,
    proficiency_level: 70,
    source: 'course',
  });
  await applyAndAccept('evalkid@kampus.ac.id', projects.closed);

  // Student pending-only di project pending.
  await registerAndLogin('Eval Pending', 'evalpending@kampus.ac.id', 'mahasiswa');
  students.pending = userIdByEmail('evalpending@kampus.ac.id');
  const tPend = await request(app).post('/api/v1/auth/login').send({ email: 'evalpending@kampus.ac.id', password: VALID_PASSWORD });
  await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${tPend.body.data.token}`).send({
    skill_id: reactId,
    proficiency_level: 70,
    source: 'course',
  });
  await request(app).post(`/api/v1/projects/${projects.pending}/apply`).set('Authorization', `Bearer ${tPend.body.data.token}`).send({});

  // Student accepted di project open (belum closed).
  await registerAndLogin('Eval Open', 'evalopen@kampus.ac.id', 'mahasiswa');
  students.open = userIdByEmail('evalopen@kampus.ac.id');
  const tOpen = await request(app).post('/api/v1/auth/login').send({ email: 'evalopen@kampus.ac.id', password: VALID_PASSWORD });
  await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${tOpen.body.data.token}`).send({
    skill_id: reactId,
    proficiency_level: 70,
    source: 'course',
  });
  await applyAndAccept('evalopen@kampus.ac.id', projects.open);

  // Project closed ditutup SETELAH apply+accept (apply ke closed ditolak).
  await closeProject(projects.closed);
});

afterAll(() => {
  closeDb();
});

beforeEach(() => {
  clearRateLimitBuckets();
});

describe('POST /api/v1/assessments (TASK-090)', () => {
  test('TC-CMP-004: nilai lengkap → 201 + evaluasi otomatis + skill +10 + notif eval', async () => {
    const res = await request(app).post('/api/v1/assessments').set('Authorization', `Bearer ${compToken}`).send({
      project_id: projects.closed,
      student_id: students.main,
      rating_skill: 5,
      rating_communication: 4,
      rating_punctuality: 5,
      rating_overall: 5,
      comments: 'Kerja sangat baik dan tepat waktu.',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.assessment.rating_skill).toBe(5);
    expect(res.body.data.evaluation.overall_rating).toBe(5);
    expect(JSON.parse(res.body.data.evaluation.category_ratings)).toMatchObject({ skill: 5, communication: 4, punctuality: 5, overall: 5 });
    expect(res.body.data.skills_bumped).toEqual([{ skill_id: reactId, from: 70, to: 80 }]);
    expect(res.body.message).toBe('Evaluasi disimpan');

    // TC-STU-006: skill tertulis + riwayat audit old/new.
    const db = getDb();
    const skill = db.prepare('SELECT proficiency_level FROM student_skills WHERE student_id = ? AND skill_id = ?').get(students.main, reactId);
    expect(skill.proficiency_level).toBe(80);
    const audit = db.prepare("SELECT old_value, new_value FROM audit_logs WHERE action = 'update_skill' AND entity_id = ? ORDER BY id DESC LIMIT 1").get(reactId);
    expect(JSON.parse(audit.old_value).proficiency_level).toBe(70);
    expect(JSON.parse(audit.new_value).proficiency_level).toBe(80);

    const notifs = await request(app).get('/api/v1/notifications?type=eval').set('Authorization', `Bearer ${students.mainToken}`);
    expect(notifs.body.data.pagination.total).toBeGreaterThanOrEqual(1);
    expect(notifs.body.data.notifications[0].content).toMatch(/Eval Closed Target/);
  });

  test('duplikat → 400; pending → 400; belum closed → 400', async () => {
    const dup = await request(app).post('/api/v1/assessments').set('Authorization', `Bearer ${compToken}`).send({
      project_id: projects.closed,
      student_id: students.main,
      rating_skill: 4,
      rating_communication: 4,
      rating_punctuality: 4,
      rating_overall: 4,
    });
    expect(dup.status).toBe(400);

    const pending = await request(app).post('/api/v1/assessments').set('Authorization', `Bearer ${compToken}`).send({
      project_id: projects.pending,
      student_id: students.pending,
      rating_skill: 4,
      rating_communication: 4,
      rating_punctuality: 4,
      rating_overall: 4,
    });
    expect(pending.status).toBe(400);

    const open = await request(app).post('/api/v1/assessments').set('Authorization', `Bearer ${compToken}`).send({
      project_id: projects.open,
      student_id: students.open,
      rating_skill: 4,
      rating_communication: 4,
      rating_punctuality: 4,
      rating_overall: 4,
    });
    expect(open.status).toBe(400);
  });

  test('perusahaan lain → 404; mahasiswa → 403; rating 6 → 422', async () => {
    const other = await registerAndLogin('PT Asing Eval', 'ptasingeval@corp.id', 'perusahaan');
    const cross = await request(app).post('/api/v1/assessments').set('Authorization', `Bearer ${other}`).send({
      project_id: projects.closed,
      student_id: students.main,
      rating_skill: 4,
      rating_communication: 4,
      rating_punctuality: 4,
      rating_overall: 4,
    });
    expect(cross.status).toBe(404);

    const forbidden = await request(app).post('/api/v1/assessments').set('Authorization', `Bearer ${students.mainToken}`).send({
      project_id: projects.closed,
      student_id: students.main,
      rating_skill: 4,
      rating_communication: 4,
      rating_punctuality: 4,
      rating_overall: 4,
    });
    expect(forbidden.status).toBe(403);

    const bad = await request(app).post('/api/v1/assessments').set('Authorization', `Bearer ${compToken}`).send({
      project_id: projects.closed,
      student_id: students.main,
      rating_skill: 6,
      rating_communication: 4,
      rating_punctuality: 4,
      rating_overall: 4,
    });
    expect(bad.status).toBe(422);
  });

  test('dosen menilai (rating 3 → +5) + cap 100', async () => {
    const db = getDb();
    const hash = await hashPassword(VALID_PASSWORD);
    db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Dosen Eval', 'doseneval@kampus.ac.id', ?, 'dosen')").run(hash);
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'doseneval@kampus.ac.id', password: VALID_PASSWORD });

    await registerAndLogin('Eval Cap', 'evalcap@kampus.ac.id', 'mahasiswa');
    const capId = userIdByEmail('evalcap@kampus.ac.id');
    const tCap = await request(app).post('/api/v1/auth/login').send({ email: 'evalcap@kampus.ac.id', password: VALID_PASSWORD });
    await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${tCap.body.data.token}`).send({
      skill_id: reactId,
      proficiency_level: 95,
      source: 'course',
    });
    // Project khusus dosen: apply+accept saat active, lalu closed.
    const dosenProj = await request(app).post('/api/v1/companies/projects').set('Authorization', `Bearer ${compToken}`).send({
      judul: 'Eval Dosen Target',
      sektor_industri: 'Sektor-Eval',
      status: 'active',
      deadline: futureDate(20),
      skills: [{ skill_id: reactId, level_required: 60 }],
    });
    const dosenProjId = dosenProj.body.data.project.id;
    await applyAndAccept('evalcap@kampus.ac.id', dosenProjId);
    await closeProject(dosenProjId);

    const res = await request(app).post('/api/v1/assessments').set('Authorization', `Bearer ${login.body.data.token}`).send({
      project_id: dosenProjId,
      student_id: capId,
      rating_skill: 3,
      rating_communication: 3,
      rating_punctuality: 3,
      rating_overall: 3,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.skills_bumped).toEqual([{ skill_id: reactId, from: 95, to: 100 }]);
  });
});

describe('GET/PUT /evaluations (TASK-091)', () => {
  test('mahasiswa lihat rating & komentar; other → 403; perusahaan bisa lihat', async () => {
    const me = await request(app)
      .get(`/api/v1/evaluations/${projects.closed}/${students.main}`)
      .set('Authorization', `Bearer ${students.mainToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.assessment.comments).toMatch(/tepat waktu/);
    expect(me.body.data.evaluation.overall_rating).toBe(5);

    const other = await registerAndLogin('Eval Stranger', 'evalstranger@kampus.ac.id', 'mahasiswa');
    const cross = await request(app)
      .get(`/api/v1/evaluations/${projects.closed}/${students.main}`)
      .set('Authorization', `Bearer ${other}`);
    expect(cross.status).toBe(403);

    const comp = await request(app)
      .get(`/api/v1/evaluations/${projects.closed}/${students.main}`)
      .set('Authorization', `Bearer ${compToken}`);
    expect(comp.status).toBe(200);
  });

  test('PUT update evaluasi tanpa re-bump skill', async () => {
    const upd = await request(app)
      .put(`/api/v1/evaluations/${projects.closed}/${students.main}`)
      .set('Authorization', `Bearer ${compToken}`)
      .send({ comments: 'Revisi: konsisten sepanjang project.', rating_communication: 5 });
    expect(upd.status).toBe(200);
    expect(upd.body.data.assessment.comments).toMatch(/Revisi/);
    expect(upd.body.data.evaluation.overall_rating).toBe(5);
    expect(upd.body.message).toBe('Evaluasi diupdate');

    const db = getDb();
    const skill = db.prepare('SELECT proficiency_level FROM student_skills WHERE student_id = ? AND skill_id = ?').get(students.main, reactId);
    expect(skill.proficiency_level).toBe(80);
  });
});
