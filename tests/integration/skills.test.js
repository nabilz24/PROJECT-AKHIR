// Integration tests — Skill System (TASK-030/031/032, QA TC-STU-002).
process.env.DB_PATH = ':memory:';

const request = require('supertest');
const { createApp } = require('../../server/src/app');
const { runMigrations } = require('../../server/src/db/migrate');
const { runSeeds } = require('../../server/src/db/seed');
const { getDb, closeDb } = require('../../server/src/db/connection');

const app = createApp();
const VALID_PASSWORD = 'S3cret!pass';

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

beforeAll(() => {
  runMigrations();
  runSeeds();
});

afterAll(() => {
  closeDb();
});

describe('GET /api/v1/skills (TASK-030)', () => {
  test('taxonomy ter-seed minimal 20 teknis + 10 soft skill', async () => {
    const token = await registerAndLogin('Seed Check', 'seedcheck@kampus.ac.id', 'mahasiswa');
    const res = await request(app).get('/api/v1/skills').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const cats = res.body.data.skills.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {});
    expect(cats.technical).toBeGreaterThanOrEqual(20);
    expect(cats['soft-skill']).toBeGreaterThanOrEqual(10);
    expect(res.body.data.skills.find((s) => s.name === 'React')).toBeTruthy();
  });

  test('filter ?category=technical', async () => {
    const token = await registerAndLogin('Cat Filter', 'catfilter@kampus.ac.id', 'mahasiswa');
    const res = await request(app).get('/api/v1/skills?category=technical').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.skills.length).toBeGreaterThan(0);
    expect(res.body.data.skills.every((s) => s.category === 'technical')).toBe(true);
  });

  test('filter ?search=react menemukan React', async () => {
    const token = await registerAndLogin('Search Skill', 'searchskill@kampus.ac.id', 'mahasiswa');
    const res = await request(app).get('/api/v1/skills?search=react').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.skills.map((s) => s.name)).toContain('React');
  });

  test('tanpa token → 401', async () => {
    const res = await request(app).get('/api/v1/skills');
    expect(res.status).toBe(401);
  });
});

describe('Student skills CRUD (TASK-031/032)', () => {
  test('TC-STU-002: tambah skill level numerik → tersimpan di StudentSkill', async () => {
    const token = await registerAndLogin('Skill Add', 'skilladd@kampus.ac.id', 'mahasiswa');
    const reactId = await skillIdByName(token, 'React');
    const add = await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${token}`).send({
      skill_id: reactId,
      proficiency_level: 80,
      source: 'course',
    });
    expect(add.status).toBe(201);
    expect(add.body.data.student_skill.name).toBe('React');
    expect(add.body.data.student_skill.proficiency_level).toBe(80);
    expect(add.body.message).toBe('Skill ditambahkan');

    const list = await request(app).get('/api/v1/students/skills').set('Authorization', `Bearer ${token}`);
    expect(list.body.data.skills.find((s) => s.name === 'React').proficiency_level).toBe(80);
  });

  test('tambah skill via kategori (advanced) → level terpetakan', async () => {
    const token = await registerAndLogin('Skill Cat', 'skillcat@kampus.ac.id', 'mahasiswa');
    const jsId = await skillIdByName(token, 'JavaScript');
    const add = await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${token}`).send({
      skill_id: jsId,
      proficiency_category: 'advanced',
      source: 'experience',
    });
    expect(add.status).toBe(201);
    expect(add.body.data.student_skill.proficiency_level).toBe(85);
    expect(add.body.data.student_skill.proficiency_category).toBe('advanced');
  });

  test('duplikat skill → 400; skill taxonomy tak ada → 404', async () => {
    const token = await registerAndLogin('Skill Dup', 'skilldup@kampus.ac.id', 'mahasiswa');
    const pyId = await skillIdByName(token, 'Python');
    await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${token}`).send({
      skill_id: pyId,
      proficiency_level: 50,
      source: 'course',
    });
    const dup = await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${token}`).send({
      skill_id: pyId,
      proficiency_level: 60,
      source: 'course',
    });
    expect(dup.status).toBe(400);

    const missing = await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${token}`).send({
      skill_id: 99999,
      proficiency_level: 50,
      source: 'course',
    });
    expect(missing.status).toBe(404);
  });

  test('validasi: level 150 / source salah / tanpa level → 422', async () => {
    const token = await registerAndLogin('Skill Val', 'skillval@kampus.ac.id', 'mahasiswa');
    const sqlId = await skillIdByName(token, 'SQL');
    const badLevel = await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${token}`).send({
      skill_id: sqlId,
      proficiency_level: 150,
      source: 'course',
    });
    expect(badLevel.status).toBe(422);
    const badSource = await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${token}`).send({
      skill_id: sqlId,
      proficiency_level: 50,
      source: 'youtube',
    });
    expect(badSource.status).toBe(422);
    const noLevel = await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${token}`).send({
      skill_id: sqlId,
      source: 'course',
    });
    expect(noLevel.status).toBe(422);
  });

  test('role perusahaan ditolak (403); tanpa token 401', async () => {
    const mhs = await registerAndLogin('Mhs Guard', 'mhsguard@kampus.ac.id', 'mahasiswa');
    const reactId = await skillIdByName(mhs, 'React');
    const comp = await registerAndLogin('PT Guard', 'ptguard@corp.id', 'perusahaan');
    const forbidden = await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${comp}`).send({
      skill_id: reactId,
      proficiency_level: 70,
      source: 'course',
    });
    expect(forbidden.status).toBe(403);
    const anon = await request(app).get('/api/v1/students/skills');
    expect(anon.status).toBe(401);
  });

  test('TASK-032: update level skill → 200; skill tak ada → 404', async () => {
    const token = await registerAndLogin('Skill Upd', 'skillupd@kampus.ac.id', 'mahasiswa');
    const gitId = await skillIdByName(token, 'Git');
    await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${token}`).send({
      skill_id: gitId,
      proficiency_level: 40,
      source: 'course',
    });
    const upd = await request(app).put(`/api/v1/students/skills/${gitId}`).set('Authorization', `Bearer ${token}`).send({
      proficiency_level: 75,
    });
    expect(upd.status).toBe(200);
    expect(upd.body.data.student_skill.proficiency_level).toBe(75);
    expect(upd.body.message).toBe('Skill diupdate');

    const missing = await request(app).put('/api/v1/students/skills/99999').set('Authorization', `Bearer ${token}`).send({
      proficiency_level: 75,
    });
    expect(missing.status).toBe(404);
  });

  test('TASK-032: hapus skill → hilang dari profil; hapus yang tak ada → 404', async () => {
    const token = await registerAndLogin('Skill Del', 'skilldel@kampus.ac.id', 'mahasiswa');
    const dockId = await skillIdByName(token, 'Docker');
    await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${token}`).send({
      skill_id: dockId,
      proficiency_level: 30,
      source: 'course',
    });
    const del = await request(app).delete(`/api/v1/students/skills/${dockId}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    expect(del.body.message).toBe('Skill dihapus');
    const list = await request(app).get('/api/v1/students/skills').set('Authorization', `Bearer ${token}`);
    expect(list.body.data.skills.find((s) => s.name === 'Docker')).toBeUndefined();

    const missing = await request(app).delete('/api/v1/students/skills/99999').set('Authorization', `Bearer ${token}`);
    expect(missing.status).toBe(404);
  });

  test('TASK-032: hapus skill yang dipakai aplikasi aktif → 400', async () => {
    // Guard memakai baris company/project sungguhan agar lolos FK; dibersihkan di akhir test.
    const db = getDb();
    const token = await registerAndLogin('Skill Used', 'skillused@kampus.ac.id', 'mahasiswa');
    const me = db.prepare('SELECT id FROM users WHERE email = ?').get('skillused@kampus.ac.id');
    const nodeId = await skillIdByName(token, 'Node.js');
    await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${token}`).send({
      skill_id: nodeId,
      proficiency_level: 60,
      source: 'experience',
    });
    db.prepare('INSERT INTO companies (user_id, nama_perusahaan) VALUES (?, ?)').run(me.id, 'Stub Co');
    const coId = db.prepare('SELECT id FROM companies WHERE user_id = ?').get(me.id).id;
    db.prepare("INSERT INTO projects (company_id, judul, status) VALUES (?, 'Stub Project', 'active')").run(coId);
    const projId = db.prepare("SELECT id FROM projects WHERE judul = 'Stub Project'").get().id;
    db.prepare('INSERT INTO project_skills (project_id, skill_id, level_required) VALUES (?, ?, 60)').run(projId, nodeId);
    db.prepare("INSERT INTO applications (student_id, project_id, status) VALUES (?, ?, 'pending')").run(me.id, projId);

    const blocked = await request(app).delete(`/api/v1/students/skills/${nodeId}`).set('Authorization', `Bearer ${token}`);
    expect(blocked.status).toBe(400);
    expect(blocked.body.message).toMatch(/masih digunakan project/);

    db.prepare('DELETE FROM applications WHERE student_id = ?').run(me.id);
    const allowed = await request(app).delete(`/api/v1/students/skills/${nodeId}`).set('Authorization', `Bearer ${token}`);
    expect(allowed.status).toBe(200);
    db.prepare('DELETE FROM project_skills WHERE project_id = ?').run(projId);
    db.prepare('DELETE FROM projects WHERE id = ?').run(projId);
    db.prepare('DELETE FROM companies WHERE id = ?').run(coId);
  });
});
