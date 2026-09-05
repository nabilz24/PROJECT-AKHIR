// Audit semua endpoint API — cek status respons (TASK-109).
// Usage: node scripts/audit-endpoints.js  (atau: npm run audit:api)
// DB temp terisolasi; aman dijalankan kapan pun. Exit 1 bila ada yang gagal.
const path = require('path');
const os = require('os');
const fs = require('fs');

process.env.DB_PATH = path.join(os.tmpdir(), `audit-${Date.now()}.db`);

const request = require('supertest');
const { createApp } = require('../server/src/app');
const { runMigrations } = require('../server/src/db/migrate');
const { runSeeds } = require('../server/src/db/seed');
const { getDb, closeDb } = require('../server/src/db/connection');
const { hashPassword } = require('../server/src/utils/password');
const { clearRateLimitBuckets } = require('../server/src/middlewares/rateLimit');
const { UPLOAD_DIR } = require('../server/src/middlewares/upload');

const app = createApp();
const results = [];
let n = 0;

function check(name, res, expected) {
  n += 1;
  const pass =
    expected === '2xx' ? res.status >= 200 && res.status < 300
    : expected === '4xx' ? res.status >= 400 && res.status < 500
    : res.status === expected;
  if (n % 12 === 0) clearRateLimitBuckets();
  results.push({ name, expected, actual: res.status, pass, msg: res.body && res.body.message });
  if (!pass) console.log(`FAIL ${name}: expected ${expected}, got ${res.status} — ${res.body && res.body.message}`);
  return res;
}

const get = (url, token) => {
  const r = request(app).get(url);
  if (token) r.set('Authorization', `Bearer ${token}`);
  return r;
};
const post = (url, token, body) => {
  const r = request(app).post(url);
  if (token) r.set('Authorization', `Bearer ${token}`);
  return r.send(body || {});
};
const put = (url, token, body) => {
  const r = request(app).put(url);
  if (token) r.set('Authorization', `Bearer ${token}`);
  return r.send(body || {});
};
const patch = (url, token, body) => {
  const r = request(app).patch(url);
  if (token) r.set('Authorization', `Bearer ${token}`);
  return r.send(body || {});
};
const del = (url, token) => {
  const r = request(app).delete(url);
  if (token) r.set('Authorization', `Bearer ${token}`);
  return r;
};

function futureDate(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

(async () => {
  runMigrations();
  runSeeds();
  const db = getDb();
  const ts = Date.now();
  const PW = 'Aud1t!pass';

  // --- Setup akun ---
  let r = await post('/api/v1/auth/register', null, { name: 'Audit Mhs', email: `amhs${ts}@t.id`, password: PW, role: 'mahasiswa' });
  check('POST register mahasiswa', r, 201);
  r = await post('/api/v1/auth/register', null, { name: 'Audit Comp', email: `acomp${ts}@t.id`, password: PW, role: 'perusahaan' });
  check('POST register perusahaan', r, 201);
  r = await post('/api/v1/auth/register', null, { name: 'Audit Kampus', email: `akampus${ts}@t.id`, password: PW, role: 'kampus' });
  check('POST register kampus', r, 201);
  r = await post('/api/v1/auth/register', null, { name: 'Audit Mhs', email: `amhs${ts}@t.id`, password: PW, role: 'mahasiswa' });
  check('POST register duplikat → 400', r, 400);

  const dosenHash = await hashPassword(PW);
  db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Audit Dosen', ?, ?, 'dosen')").run(`adosen${ts}@t.id`, dosenHash);

  const login = async (email) => (await post('/api/v1/auth/login', null, { email, password: PW })).body.data.token;
  const T = {
    mhs: await login(`amhs${ts}@t.id`),
    comp: await login(`acomp${ts}@t.id`),
    kampus: await login(`akampus${ts}@t.id`),
    dosen: await login(`adosen${ts}@t.id`),
  };
  db.prepare('UPDATE companies SET verified_status = 1 WHERE user_id = (SELECT id FROM users WHERE email = ?)').run(`acomp${ts}@t.id`);
  const mhsId = db.prepare('SELECT id FROM users WHERE email = ?').get(`amhs${ts}@t.id`).id;
  const skillId = (nm) => db.prepare('SELECT id FROM skills WHERE name = ?').get(nm).id;

  r = await post('/api/v1/auth/login', null, { email: `amhs${ts}@t.id`, password: 'salah123!' });
  check('POST login salah → 401', r, 401);
  r = await get('/api/v1/health');
  check('GET health (publik)', r, 200);
  r = await get('/api/v1/auth/me', T.mhs);
  check('GET auth/me', r, 200);

  // --- Users & profile ---
  r = await get('/api/v1/users/profile', T.mhs);
  check('GET users/profile', r, 200);
  r = await put('/api/v1/users/profile', T.mhs, { name: 'Audit Mhs', bio: 'Bio audit.' });
  check('PUT users/profile', r, '2xx');
  r = await get('/api/v1/users/redirect', T.comp);
  check('GET users/redirect', r, 200);
  const beforeUploads = new Set(fs.readdirSync(UPLOAD_DIR));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  r = await request(app).post('/api/v1/users/profile/photo-upload').set('Authorization', `Bearer ${T.mhs}`).attach('file', png, { filename: 't.png', contentType: 'image/png' });
  check('POST photo-upload PNG', r, '2xx');
  for (const f of fs.readdirSync(UPLOAD_DIR)) if (!beforeUploads.has(f)) fs.unlinkSync(path.join(UPLOAD_DIR, f));

  // --- Skills ---
  r = await get('/api/v1/skills', T.mhs);
  check('GET skills', r, 200);
  r = await get('/api/v1/skills?category=technical', T.mhs);
  check('GET skills?category', r, 200);
  r = await get('/api/v1/students/skills', T.mhs);
  check('GET students/skills', r, 200);
  r = await post('/api/v1/students/skills', T.mhs, { skill_id: skillId('React'), proficiency_level: 40, source: 'course' });
  check('POST students/skills', r, '2xx');
  r = await post('/api/v1/students/skills', T.mhs, { skill_id: skillId('Git'), proficiency_level: 30, source: 'experience' });
  check('POST students/skills (Git)', r, '2xx');
  r = await put(`/api/v1/students/skills/${skillId('React')}`, T.mhs, { proficiency_level: 45 });
  check('PUT students/skills/:id', r, '2xx');

  // --- Projects: company buat, student lamar ---
  r = await post('/api/v1/companies/projects', T.comp, { judul: 'Audit Project Alpha', sektor_industri: 'Teknologi', status: 'active', deadline: futureDate(20), difficulty: 'medium', skills: [{ skill_id: skillId('React'), level_required: 60 }] });
  check('POST companies/projects', r, '2xx');
  const projectId = r.body.data.project.id;
  r = await post('/api/v1/companies/projects', T.comp, { judul: 'Audit Draft Beta', status: 'draft', skills: [{ skill_id: skillId('Git'), level_required: 10 }] });
  check('POST companies/projects (draft)', r, '2xx');
  const draftId = r.body.data.project.id;
  r = await get('/api/v1/companies/projects', T.comp);
  check('GET companies/projects', r, 200);
  r = await get(`/api/v1/companies/projects/${projectId}`, T.comp);
  check('GET companies/projects/:id', r, 200);
  r = await put(`/api/v1/companies/projects/${projectId}`, T.comp, { deskripsi: 'Update audit.' });
  check('PUT companies/projects/:id', r, '2xx');

  r = await get('/api/v1/projects', T.mhs);
  check('GET projects browse', r, 200);
  r = await get('/api/v1/projects?sort=terbaru', T.mhs);
  check('GET projects?sort', r, 200);
  r = await get('/api/v1/projects?filter[difficulty]=medium', T.mhs);
  check('GET projects?filter', r, 200);
  r = await get(`/api/v1/projects/${projectId}`, T.mhs);
  check('GET projects/:id', r, 200);
  r = await get(`/api/v1/projects/${projectId}/match`, T.mhs);
  check('GET projects/:id/match', r, 200);
  r = await post(`/api/v1/projects/${projectId}/apply`, T.mhs, { cover_letter: 'Saya tertarik (audit).' });
  check('POST projects/:id/apply', r, '2xx');
  r = await post(`/api/v1/projects/${projectId}/apply`, T.mhs, {});
  check('POST apply duplikat → 4xx', r, '4xx');

  // --- Matching ---
  r = await post('/api/v1/matching/calculate', T.comp, { student_id: mhsId, project_id: projectId });
  check('POST matching/calculate', r, 200);
  r = await get(`/api/v1/matching/ranking?project_id=${projectId}`, T.comp);
  check('GET matching/ranking', r, 200);
  r = await get(`/api/v1/companies/candidates?project_id=${projectId}`, T.comp);
  check('GET companies/candidates', r, 200);

  // --- Gap + recommendations ---
  r = await get(`/api/v1/gap-analysis/${mhsId}/${projectId}`, T.mhs);
  check('GET gap-analysis/:sid/:pid', r, 200);
  r = await get(`/api/v1/gap-analysis/student/${mhsId}`, T.mhs);
  check('GET gap-analysis/student/:sid', r, 200);
  r = await get(`/api/v1/recommendations/student/${mhsId}`, T.mhs);
  check('GET recommendations/student/:id', r, 200);
  const recId = r.body.data.recommendations[0].id;
  r = await post(`/api/v1/recommendations/${recId}/action`, T.mhs, { action: 'start' });
  check('POST recommendations/:id/action start', r, '2xx');
  r = await post(`/api/v1/recommendations/${recId}/action`, T.mhs, { action: 'completed' });
  check('POST recommendations/:id/action completed', r, '2xx');

  // --- Applications workflow ---
  r = await get(`/api/v1/companies/projects/${projectId}/applications`, T.comp);
  check('GET project applications', r, 200);
  const appId = r.body.data.applications[0].id;
  r = await patch(`/api/v1/companies/applications/${appId}`, T.comp, { status: 'accepted' });
  check('PATCH applications accept', r, '2xx');

  // --- Notifications ---
  r = await get('/api/v1/notifications', T.mhs);
  check('GET notifications', r, 200);
  r = await put(`/api/v1/notifications/${r.body.data.notifications[0].id}/read`, T.mhs, {});
  check('PUT notifications/:id/read', r, '2xx');

  // --- Dashboards ---
  r = await get('/api/v1/students/dashboard', T.mhs);
  check('GET students/dashboard', r, 200);
  r = await get('/api/v1/companies/dashboard', T.comp);
  check('GET companies/dashboard', r, 200);
  r = await get('/api/v1/campus/dashboard', T.kampus);
  check('GET campus/dashboard', r, 200);
  r = await get('/api/v1/mentor/awaiting', T.dosen);
  check('GET mentor/awaiting (dosen)', r, 200);
  r = await get('/api/v1/mentor/awaiting', T.mhs);
  check('mahasiswa → mentor → 403', r, 403);

  // --- Analytics ---
  r = await get('/api/v1/analytics/skill-distribution', T.kampus);
  check('GET analytics/skill-distribution', r, 200);
  r = await get('/api/v1/analytics/industry-demand', T.kampus);
  check('GET analytics/industry-demand', r, 200);
  r = await get('/api/v1/analytics/gap-heatmap', T.kampus);
  check('GET analytics/gap-heatmap', r, 200);
  r = await get('/api/v1/analytics/export?format=csv', T.kampus);
  check('GET analytics/export csv', r, 200);
  if (!String(r.headers['content-type']).includes('text/csv')) {
    results.push({ name: 'CSV content-type', expected: 'text/csv', actual: r.headers['content-type'], pass: false });
  }
  r = await get('/api/v1/analytics/export?format=pdf', T.kampus);
  check('GET analytics/export pdf → 422', r, 422);

  // --- Assessment (butuh project closed) ---
  r = await put(`/api/v1/companies/projects/${projectId}`, T.comp, { status: 'closed' });
  check('PUT close project', r, '2xx');
  r = await post('/api/v1/assessments', T.comp, { project_id: projectId, student_id: mhsId, rating_skill: 5, rating_communication: 4, rating_punctuality: 5, rating_overall: 5, comments: 'Bagus (audit).' });
  check('POST assessments (company)', r, '2xx');
  r = await post('/api/v1/assessments', T.dosen, { project_id: projectId, student_id: mhsId, rating_skill: 4, rating_communication: 4, rating_punctuality: 4, rating_overall: 4 });
  check('POST assessments (dosen)', r, '2xx');
  r = await get(`/api/v1/evaluations/${projectId}/${mhsId}`, T.mhs);
  check('GET evaluations/:pid/:sid', r, 200);
  r = await put(`/api/v1/evaluations/${projectId}/${mhsId}`, T.comp, { rating_overall: 4 });
  check('PUT evaluations/:pid/:sid', r, '2xx');

  // --- Password reset ---
  r = await post('/api/v1/auth/password-reset', null, { email: `amhs${ts}@t.id` });
  check('POST password-reset request', r, 200);
  r = await get('/api/v1/auth/password-reset/confirm/bogus-token');
  check('GET reset confirm bogus → 400', r, 400);

  // --- RBAC negatif ---
  r = await get('/api/v1/students/dashboard');
  check('tanpa token → 401', r, 401);
  r = await get('/api/v1/companies/dashboard', T.mhs);
  check('mahasiswa → company → 403', r, 403);
  r = await get('/api/v1/campus/dashboard', T.comp);
  check('perusahaan → campus → 403', r, 403);
  r = await get('/api/v1/analytics/skill-distribution', T.mhs);
  check('mahasiswa → analytics → 403', r, 403);

  // --- Delete flows (terakhir) ---
  r = await del(`/api/v1/students/skills/${skillId('Git')}`, T.mhs);
  check('DELETE students/skills/:id', r, '2xx');
  r = await del(`/api/v1/companies/projects/${draftId}`, T.comp);
  check('DELETE companies/projects/:id', r, '2xx');
  r = await get(`/api/v1/companies/projects/${draftId}`, T.comp);
  check('GET project terhapus → 404', r, 404);

  // --- Halaman ---
  for (const p of ['/', '/login', '/app']) {
    r = await get(p);
    check(`GET ${p} page`, r, 200);
  }
  r = await get(`/dashboard/student?token=${T.mhs}`);
  check('GET /dashboard/student', r, 200);
  r = await get(`/dashboard/company?token=${T.comp}`);
  check('GET /dashboard/company', r, 200);
  r = await get(`/dashboard/campus?token=${T.kampus}`);
  check('GET /dashboard/campus', r, 200);
  r = await get(`/dashboard/mentor?token=${T.dosen}`);
  check('GET /dashboard/mentor', r, 200);
  r = await get(`/dashboard/analytics?token=${T.kampus}`);
  check('GET /dashboard/analytics', r, 200);

  // --- Logout (paling akhir) ---
  r = await post('/api/v1/auth/logout', T.dosen, {});
  check('POST auth/logout', r, 200);

  const failed = results.filter((x) => !x.pass);
  console.log(`\nAPI AUDIT: ${results.length - failed.length}/${results.length} lolos`);
  if (failed.length > 0) {
    console.log('GAGAL:');
    for (const f of failed) console.log(` - ${f.name}: expected ${f.expected}, got ${f.actual} (${f.msg || ''})`);
    process.exitCode = 1;
  }
  try { fs.unlinkSync(process.env.DB_PATH); } catch (e) { /* abaikan */ }
  closeDb();
})().catch((e) => { console.error('AUDIT ERROR:', e); process.exitCode = 1; });
