// Integration tests — Application workflow + Notifications (TASK-050/051, TC-CMP-003, TC-STU-004).
process.env.DB_PATH = ':memory:';

const request = require('supertest');
const { createApp } = require('../../server/src/app');
const { runMigrations } = require('../../server/src/db/migrate');
const { runSeeds } = require('../../server/src/db/seed');
const { getDb, closeDb } = require('../../server/src/db/connection');
const { lastSentTo, clearOutbox } = require('../../server/src/utils/mailer');
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

let compToken;
let projectId;

beforeAll(async () => {
  runMigrations();
  runSeeds();
  compToken = await registerAndLogin('PT Workflow', 'ptworkflow@corp.id', 'perusahaan');
  const db = getDb();
  db.prepare('UPDATE companies SET verified_status = 1 WHERE user_id = (SELECT id FROM users WHERE email = ?)').run('ptworkflow@corp.id');
  const reactId = await skillIdByName(compToken, 'React');
  const created = await request(app).post('/api/v1/companies/projects').set('Authorization', `Bearer ${compToken}`).send({
    judul: 'Workflow Target',
    sektor_industri: 'Sektor-Workflow',
    status: 'active',
    deadline: futureDate(20),
    skills: [{ skill_id: reactId, level_required: 60 }],
  });
  projectId = created.body.data.project.id;
});

afterAll(() => {
  closeDb();
});

beforeEach(() => {
  clearRateLimitBuckets();
  clearOutbox();
});

describe('Application workflow (TASK-050)', () => {
  test('TC-STU-004 penuh: apply → pending + notifikasi in-app & email ke perusahaan', async () => {
    const mhs = await registerAndLogin('Mhs Flow', 'mhsflow@kampus.ac.id', 'mahasiswa');
    const reactId = await skillIdByName(mhs, 'React');
    await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${mhs}`).send({
      skill_id: reactId,
      proficiency_level: 75,
      source: 'course',
    });
    const apply = await request(app).post(`/api/v1/projects/${projectId}/apply`).set('Authorization', `Bearer ${mhs}`).send({
      cover_letter: 'Siap berkontribusi.',
    });
    expect(apply.status).toBe(201);
    expect(apply.body.data.application.status).toBe('pending');
    expect(apply.body.data.application.applied_at).toBeTruthy();

    // In-app ke perusahaan (TASK-051).
    const notifs = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${compToken}`);
    const applyNotif = notifs.body.data.notifications.find((n) => n.type === 'apply');
    expect(applyNotif).toBeTruthy();
    expect(applyNotif.content).toMatch(/Mhs Flow/);
    expect(applyNotif.content).toMatch(/Workflow Target/);

    // Email simulasi ke perusahaan.
    const mail = lastSentTo('ptworkflow@corp.id');
    expect(mail).toBeTruthy();
    expect(mail.subject).toMatch(/Workflow Target/);
  });

  test('perusahaan melihat daftar pelamar project miliknya', async () => {
    const res = await request(app)
      .get(`/api/v1/companies/projects/${projectId}/applications`)
      .set('Authorization', `Bearer ${compToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    const first = res.body.data.applications[0];
    expect(first.student.name).toBeTruthy();
    expect(Array.isArray(first.skills)).toBe(true);
  });

  test('daftar pelamar project perusahaan lain → 404', async () => {
    const other = await registerAndLogin('PT Lain', 'ptlain@corp.id', 'perusahaan');
    const res = await request(app)
      .get(`/api/v1/companies/projects/${projectId}/applications`)
      .set('Authorization', `Bearer ${other}`);
    expect(res.status).toBe(404);
  });

  test('TC-CMP-003: accept → status berubah + notifikasi ke mahasiswa', async () => {
    const mhs = await registerAndLogin('Mhs Accept', 'mhsaccept@kampus.ac.id', 'mahasiswa');
    const reactId = await skillIdByName(mhs, 'React');
    await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${mhs}`).send({
      skill_id: reactId,
      proficiency_level: 80,
      source: 'experience',
    });
    const apply = await request(app).post(`/api/v1/projects/${projectId}/apply`).set('Authorization', `Bearer ${mhs}`).send({});
    const appId = apply.body.data.application.id;

    const accept = await request(app).patch(`/api/v1/companies/applications/${appId}`).set('Authorization', `Bearer ${compToken}`).send({
      status: 'accepted',
    });
    expect(accept.status).toBe(200);
    expect(accept.body.data.application.status).toBe('accepted');

    const notifs = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${mhs}`);
    const statusNotif = notifs.body.data.notifications.find((n) => n.content.includes('diterima'));
    expect(statusNotif).toBeTruthy();
    expect(statusNotif.content).toMatch(/Workflow Target/);
    expect(statusNotif.content).toMatch(/Mhs Accept/);

    const mail = lastSentTo('mhsaccept@kampus.ac.id');
    expect(mail).toBeTruthy();
    expect(mail.subject).toMatch(/diterima/);
  });

  test('reject + transisi ganda ditolak + status invalid 422', async () => {
    const mhs = await registerAndLogin('Mhs Reject', 'mhsreject@kampus.ac.id', 'mahasiswa');
    const reactId = await skillIdByName(mhs, 'React');
    await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${mhs}`).send({
      skill_id: reactId,
      proficiency_level: 70,
      source: 'course',
    });
    const apply = await request(app).post(`/api/v1/projects/${projectId}/apply`).set('Authorization', `Bearer ${mhs}`).send({});
    const appId = apply.body.data.application.id;

    const reject = await request(app).patch(`/api/v1/companies/applications/${appId}`).set('Authorization', `Bearer ${compToken}`).send({
      status: 'rejected',
    });
    expect(reject.status).toBe(200);
    expect(reject.body.data.application.status).toBe('rejected');

    const again = await request(app).patch(`/api/v1/companies/applications/${appId}`).set('Authorization', `Bearer ${compToken}`).send({
      status: 'accepted',
    });
    expect(again.status).toBe(400);

    const invalid = await request(app).patch(`/api/v1/companies/applications/${appId}`).set('Authorization', `Bearer ${compToken}`).send({
      status: 'maybe',
    });
    expect(invalid.status).toBe(422);
  });

  test('aplikasi tak ada → 404; perusahaan lain → 404; mahasiswa → 403', async () => {
    const missing = await request(app).patch('/api/v1/companies/applications/99999').set('Authorization', `Bearer ${compToken}`).send({
      status: 'accepted',
    });
    expect(missing.status).toBe(404);

    const other = await registerAndLogin('PT Asing', 'ptasing@corp.id', 'perusahaan');
    const db = getDb();
    const anyApp = db.prepare('SELECT id FROM applications LIMIT 1').get();
    const cross = await request(app).patch(`/api/v1/companies/applications/${anyApp.id}`).set('Authorization', `Bearer ${other}`).send({
      status: 'accepted',
    });
    expect(cross.status).toBe(404);

    const mhs = await registerAndLogin('Mhs Forbidden', 'mhsforbid@kampus.ac.id', 'mahasiswa');
    const forbidden = await request(app).patch(`/api/v1/companies/applications/${anyApp.id}`).set('Authorization', `Bearer ${mhs}`).send({
      status: 'accepted',
    });
    expect(forbidden.status).toBe(403);
  });
});

describe('Notifications API (TASK-051)', () => {
  test('filter is_read + tandai baca + notifikasi orang lain 404', async () => {
    const mhs = await registerAndLogin('Mhs Notif', 'mhsnotif@kampus.ac.id', 'mahasiswa');
    const reactId = await skillIdByName(mhs, 'React');
    await request(app).post('/api/v1/students/skills').set('Authorization', `Bearer ${mhs}`).send({
      skill_id: reactId,
      proficiency_level: 70,
      source: 'course',
    });
    const apply = await request(app).post(`/api/v1/projects/${projectId}/apply`).set('Authorization', `Bearer ${mhs}`).send({});
    await request(app).patch(`/api/v1/companies/applications/${apply.body.data.application.id}`).set('Authorization', `Bearer ${compToken}`).send({
      status: 'accepted',
    });

    const unread = await request(app).get('/api/v1/notifications?is_read=0').set('Authorization', `Bearer ${mhs}`);
    expect(unread.status).toBe(200);
    expect(unread.body.data.pagination.total).toBeGreaterThanOrEqual(1);

    const notifId = unread.body.data.notifications[0].id;
    const read = await request(app).put(`/api/v1/notifications/${notifId}/read`).set('Authorization', `Bearer ${mhs}`);
    expect(read.status).toBe(200);

    const unreadAfter = await request(app).get('/api/v1/notifications?is_read=0').set('Authorization', `Bearer ${mhs}`);
    expect(unreadAfter.body.data.pagination.total).toBe(unread.body.data.pagination.total - 1);

    const otherRead = await request(app).put(`/api/v1/notifications/${notifId}/read`).set('Authorization', `Bearer ${compToken}`);
    expect(otherRead.status).toBe(404);
  });

  test('tanpa token → 401', async () => {
    const res = await request(app).get('/api/v1/notifications');
    expect(res.status).toBe(401);
  });
});
