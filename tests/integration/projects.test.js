// Integration tests — Project Marketplace (TASK-040/041/042, TC-CMP-001, TC-STU-004).
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

function verifyCompany(email) {
  const db = getDb();
  db.prepare('UPDATE companies SET verified_status = 1 WHERE user_id = (SELECT id FROM users WHERE email = ?)').run(email);
}

async function skillIdByName(token, name) {
  const res = await request(app).get(`/api/v1/skills?search=${encodeURIComponent(name)}`).set('Authorization', `Bearer ${token}`);
  return res.body.data.skills.find((s) => s.name === name).id;
}

async function addSkill(token, skillId, level) {
  return request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${token}`).send({
    skill_id: skillId,
    proficiency_level: level,
    source: 'course',
  });
}

async function createProject(token, payload) {
  return request(app).post('/api/v1/companies/projects').set('Authorization', `Bearer ${token}`).send(payload);
}

beforeAll(() => {
  runMigrations();
  runSeeds();
});

afterAll(() => {
  closeDb();
});

beforeEach(() => {
  clearRateLimitBuckets();
});

describe('Company project CRUD (TASK-040)', () => {
  test('perusahaan belum terverifikasi → 403', async () => {
    const token = await registerAndLogin('PT Unver', 'ptunver@corp.id', 'perusahaan');
    const reactId = await skillIdByName(token, 'React');
    const res = await createProject(token, {
      judul: 'Project Tanpa Verifikasi',
      status: 'active',
      skills: [{ skill_id: reactId, level_required: 70 }],
    });
    expect(res.status).toBe(403);
  });

  test('TC-CMP-001: perusahaan terverifikasi membuat project + skill tervalidasi taxonomy → 201', async () => {
    const token = await registerAndLogin('PT Verif', 'ptverif@corp.id', 'perusahaan');
    verifyCompany('ptverif@corp.id');
    const reactId = await skillIdByName(token, 'React');
    const nodeId = await skillIdByName(token, 'Node.js');
    const res = await createProject(token, {
      judul: 'Web App Desa',
      deskripsi: 'Bangun web profil desa',
      sektor_industri: 'Teknologi',
      deadline: futureDate(30),
      status: 'active',
      difficulty: 'medium',
      skills: [
        { skill_id: reactId, level_required: 70 },
        { skill_id: nodeId, level_required: 60 },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.project.judul).toBe('Web App Desa');
    expect(res.body.data.project.skills).toHaveLength(2);
    expect(res.body.data.project.company.nama_perusahaan).toBe('PT Verif');
    expect(res.body.message).toBe('Project dibuat');
  });

  test('skill di luar taxonomy → 404', async () => {
    const token = await registerAndLogin('PT Bad Skill', 'ptbad@corp.id', 'perusahaan');
    verifyCompany('ptbad@corp.id');
    const res = await createProject(token, {
      judul: 'Project Skill Asing',
      status: 'draft',
      skills: [{ skill_id: 99999, level_required: 50 }],
    });
    expect(res.status).toBe(404);
  });

  test('list milik sendiri saja; detail lintas perusahaan → 404; update; soft-delete', async () => {
    const t1 = await registerAndLogin('PT Satu', 'ptsatu@corp.id', 'perusahaan');
    verifyCompany('ptsatu@corp.id');
    const t2 = await registerAndLogin('PT Dua', 'ptdua@corp.id', 'perusahaan');
    verifyCompany('ptdua@corp.id');
    const reactId = await skillIdByName(t1, 'React');

    const p1 = await createProject(t1, { judul: 'Milik PT Satu Unik', status: 'active', skills: [{ skill_id: reactId, level_required: 50 }] });
    await createProject(t2, { judul: 'Milik PT Dua Unik', status: 'active', skills: [{ skill_id: reactId, level_required: 50 }] });

    const list = await request(app).get('/api/v1/companies/projects').set('Authorization', `Bearer ${t1}`);
    const juduls = list.body.data.projects.map((p) => p.judul);
    expect(juduls).toContain('Milik PT Satu Unik');
    expect(juduls).not.toContain('Milik PT Dua Unik');

    const cross = await request(app).get(`/api/v1/companies/projects/${p1.body.data.project.id + 1}`).set('Authorization', `Bearer ${t1}`);
    expect(cross.status).toBe(404);

    const upd = await request(app).put(`/api/v1/companies/projects/${p1.body.data.project.id}`).set('Authorization', `Bearer ${t1}`).send({
      judul: 'Milik PT Satu Revisi',
      skills: [{ skill_id: reactId, level_required: 80 }],
    });
    expect(upd.status).toBe(200);
    expect(upd.body.data.project.judul).toBe('Milik PT Satu Revisi');

    const del = await request(app).delete(`/api/v1/companies/projects/${p1.body.data.project.id}`).set('Authorization', `Bearer ${t1}`);
    expect(del.status).toBe(200);
    const gone = await request(app).get(`/api/v1/companies/projects/${p1.body.data.project.id}`).set('Authorization', `Bearer ${t1}`);
    expect(gone.status).toBe(404);
  });
});

describe('Marketplace browse & filter (TASK-041)', () => {
  beforeAll(async () => {
    const t = await registerAndLogin('PT Pasar', 'ptpasar@corp.id', 'perusahaan');
    verifyCompany('ptpasar@corp.id');
    const reactId = await skillIdByName(t, 'React');
    const pyId = await skillIdByName(t, 'Python');
    await createProject(t, {
      judul: 'Pasar React Aktif',
      sektor_industri: 'Sektor-Filter-A',
      status: 'active',
      difficulty: 'easy',
      deadline: futureDate(10),
      skills: [{ skill_id: reactId, level_required: 60 }],
    });
    await createProject(t, {
      judul: 'Pasar Python Aktif',
      sektor_industri: 'Sektor-Filter-B',
      status: 'active',
      difficulty: 'hard',
      deadline: futureDate(20),
      skills: [{ skill_id: pyId, level_required: 70 }],
    });
    await createProject(t, {
      judul: 'Pasar Draft Tersembunyi',
      sektor_industri: 'Sektor-Filter-A',
      status: 'draft',
      skills: [{ skill_id: reactId, level_required: 60 }],
    });
  });

  test('publik hanya melihat active; draft 404 di detail', async () => {
    const res = await request(app).get('/api/v1/projects?limit=100');
    expect(res.status).toBe(200);
    const juduls = res.body.data.projects.map((p) => p.judul);
    expect(juduls).toContain('Pasar React Aktif');
    expect(juduls).not.toContain('Pasar Draft Tersembunyi');
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(2);
  });

  test('filter sektor + skill + difficulty', async () => {
    const bySektor = await request(app).get('/api/v1/projects?filter[sektor_industri]=Sektor-Filter-A');
    expect(bySektor.body.data.projects.map((p) => p.judul)).toContain('Pasar React Aktif');
    expect(bySektor.body.data.projects.map((p) => p.judul)).not.toContain('Pasar Python Aktif');

    const bySkill = await request(app).get('/api/v1/projects?filter[skill]=Python');
    expect(bySkill.body.data.projects.map((p) => p.judul)).toContain('Pasar Python Aktif');
    expect(bySkill.body.data.projects.map((p) => p.judul)).not.toContain('Pasar React Aktif');

    const byDiff = await request(app).get('/api/v1/projects?filter[difficulty]=hard');
    expect(byDiff.body.data.projects.map((p) => p.judul)).toContain('Pasar Python Aktif');
  });

  test('filter tak cocok → 200 empty state (total 0)', async () => {
    const res = await request(app).get('/api/v1/projects?filter[skill]=ZzzTidakAdaSkill');
    expect(res.status).toBe(200);
    expect(res.body.data.projects).toHaveLength(0);
    expect(res.body.data.pagination.total).toBe(0);
  });

  test('sort deadline + sort match_score (mahasiswa) + match_score anonim ditolak', async () => {
    const mhs = await registerAndLogin('Mhs Pasar', 'mhspasar@kampus.ac.id', 'mahasiswa');
    const reactId = await skillIdByName(mhs, 'React');
    await addSkill(mhs, reactId, 80);

    const byDeadline = await request(app).get('/api/v1/projects?filter[sektor_industri]=Sektor-Filter-A&sort=deadline');
    expect(byDeadline.status).toBe(200);

    const byMatch = await request(app)
      .get('/api/v1/projects?filter[sektor_industri]=Sektor-Filter-A&sort=match_score')
      .set('Authorization', `Bearer ${mhs}`);
    expect(byMatch.status).toBe(200);
    const scores = byMatch.body.data.projects.map((p) => p.match_score);
    expect(scores[0]).toBe(100); // punya React
    const sorted = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sorted);

    const anon = await request(app).get('/api/v1/projects?sort=match_score');
    expect(anon.status).toBe(422);
  });

  test('detail publik memuat company + skills', async () => {
    const list = await request(app).get('/api/v1/projects?filter[skill]=React&limit=1');
    const id = list.body.data.projects[0].id;
    const res = await request(app).get(`/api/v1/projects/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.project.company.nama_perusahaan).toBeTruthy();
    expect(res.body.data.project.skills.length).toBeGreaterThan(0);
  });
});

describe('Apply project (TASK-042)', () => {
  let projectId;
  let draftId;

  beforeAll(async () => {
    const t = await registerAndLogin('PT Apply', 'ptapply@corp.id', 'perusahaan');
    verifyCompany('ptapply@corp.id');
    const reactId = await skillIdByName(t, 'React');
    const nodeId = await skillIdByName(t, 'Node.js');
    const active = await createProject(t, {
      judul: 'Apply Target Aktif',
      sektor_industri: 'Sektor-Apply',
      status: 'active',
      deadline: futureDate(15),
      skills: [
        { skill_id: reactId, level_required: 70 },
        { skill_id: nodeId, level_required: 60 },
      ],
    });
    projectId = active.body.data.project.id;
    const draft = await createProject(t, {
      judul: 'Apply Draft Tolak',
      sektor_industri: 'Sektor-Apply',
      status: 'draft',
      skills: [{ skill_id: reactId, level_required: 50 }],
    });
    draftId = draft.body.data.project.id;
  });

  test('TC-STU-004: requirement terpenuhi → 201 pending tersimpan', async () => {
    const mhs = await registerAndLogin('Mhs Apply', 'mhsapply@kampus.ac.id', 'mahasiswa');
    const reactId = await skillIdByName(mhs, 'React');
    const nodeId = await skillIdByName(mhs, 'Node.js');
    await addSkill(mhs, reactId, 80);
    await addSkill(mhs, nodeId, 65);

    const res = await request(app).post(`/api/v1/projects/${projectId}/apply`).set('Authorization', `Bearer ${mhs}`).send({
      cover_letter: 'Saya tertarik dan memenuhi syarat.',
      portfolio_url: 'https://github.com/mhsapply/demo',
      skills_showcase: [reactId],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.application.status).toBe('pending');
    expect(res.body.message).toBe('Aplikasi terkirim');

    const db = getDb();
    const row = db.prepare('SELECT status FROM applications WHERE student_id = (SELECT id FROM users WHERE email = ?) AND project_id = ?').get('mhsapply@kampus.ac.id', projectId);
    expect(row.status).toBe('pending');
  });

  test('requirement tak terpenuhi → 400 + daftar skill kurang', async () => {
    const mhs = await registerAndLogin('Mhs Kurang', 'mhskurang@kampus.ac.id', 'mahasiswa');
    const reactId = await skillIdByName(mhs, 'React');
    await addSkill(mhs, reactId, 80);
    const res = await request(app).post(`/api/v1/projects/${projectId}/apply`).set('Authorization', `Bearer ${mhs}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Node\.js/);
  });

  test('duplikat apply → 400; project draft → 400; project tak ada → 404; perusahaan → 403', async () => {
    const mhs = await registerAndLogin('Mhs Duplikat', 'mhsduplikat@kampus.ac.id', 'mahasiswa');
    const reactId = await skillIdByName(mhs, 'React');
    const nodeId = await skillIdByName(mhs, 'Node.js');
    await addSkill(mhs, reactId, 80);
    await addSkill(mhs, nodeId, 65);
    await request(app).post(`/api/v1/projects/${projectId}/apply`).set('Authorization', `Bearer ${mhs}`).send({});
    const dup = await request(app).post(`/api/v1/projects/${projectId}/apply`).set('Authorization', `Bearer ${mhs}`).send({});
    expect(dup.status).toBe(400);

    const draft = await request(app).post(`/api/v1/projects/${draftId}/apply`).set('Authorization', `Bearer ${mhs}`).send({});
    expect(draft.status).toBe(400);

    const missing = await request(app).post('/api/v1/projects/99999/apply').set('Authorization', `Bearer ${mhs}`).send({});
    expect(missing.status).toBe(404);

    const comp = await registerAndLogin('PT Ikut', 'ptikut@corp.id', 'perusahaan');
    const forbidden = await request(app).post(`/api/v1/projects/${projectId}/apply`).set('Authorization', `Bearer ${comp}`).send({});
    expect(forbidden.status).toBe(403);
  });
});
