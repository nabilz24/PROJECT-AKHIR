// Integration tests — pemisahan landing / login / dashboard (TASK-105).
const request = require('supertest');
const { createApp } = require('../../server/src/app');

const app = createApp();

describe('Pemisahan halaman (TASK-105)', () => {
  test('GET / → landing only: React root + CDN + CTA ke /login, tanpa form login', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toMatch(/Campus Industry Talent Hub/);
    expect(res.text).toMatch(/id="root"/);
    expect(res.text).toMatch(/react\.production\.min\.js/);
    expect(res.text).toMatch(/tailwindcss\/browser/);
    expect(res.text).toMatch(/href="\/login"/);
    expect(res.text).not.toMatch(/\/api\/v1\/auth\/login/);
    expect(res.text).not.toMatch(/type="password"/);
  });

  test('GET /login → halaman login khusus (form email+password)', async () => {
    const res = await request(app).get('/login');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Campus Industry Talent Hub/);
    expect(res.text).toMatch(/type="password"/);
    expect(res.text).toMatch(/\/api\/v1\/auth\/login/);
  });

  test('route tak dikenal tetap 404 JSON (kontrak notFound)', async () => {
    const res = await request(app).get('/rute-tidak-ada');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Not Found: GET \/rute-tidak-ada/);
  });
});
