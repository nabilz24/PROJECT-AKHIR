// Integration tests — SPA landing di GET / (TASK-104, opsi 2 tampilan).
const request = require('supertest');
const { createApp } = require('../../server/src/app');

const app = createApp();

describe('SPA landing (TASK-104)', () => {
  test('GET / → 200 HTML berisi React root + CDN + form login', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toMatch(/Campus Industry Talent Hub/);
    expect(res.text).toMatch(/id="root"/);
    expect(res.text).toMatch(/react\.production\.min\.js/);
    expect(res.text).toMatch(/cdn\.tailwindcss\.com/);
    expect(res.text).toMatch(/text\/babel/);
    expect(res.text).toMatch(/\/api\/v1\/auth\/login/);
    expect(res.text).toMatch(/dashboard_url/);
  });

  test('GET /login tetap 200 (fallback offline tanpa CDN)', async () => {
    const res = await request(app).get('/login');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Campus Industry Talent Hub/);
  });

  test('route tak dikenal tetap 404 JSON (kontrak notFound)', async () => {
    const res = await request(app).get('/rute-tidak-ada');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Not Found: GET \/rute-tidak-ada/);
  });
});
