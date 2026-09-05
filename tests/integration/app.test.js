// Integration tests — SPA dashboard di GET /app (TASK-106).
const request = require('supertest');
const { createApp } = require('../../server/src/app');

const app = createApp();

describe('SPA dashboard (TASK-106)', () => {
  test('GET /app → 200 HTML berisi React root + CDN + endpoint dashboard', async () => {
    const res = await request(app).get('/app');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toMatch(/Dashboard/);
    expect(res.text).toMatch(/id="app"/);
    expect(res.text).toMatch(/react\.production\.min\.js/);
    expect(res.text).toMatch(/cdn\.tailwindcss\.com/);
    expect(res.text).toMatch(/\/students\/dashboard/);
    expect(res.text).toMatch(/\/companies\/dashboard/);
    expect(res.text).toMatch(/\/campus\/dashboard/);
    expect(res.text).toMatch(/\/analytics\/skill-distribution/);
    expect(res.text).toMatch(/\/auth\/me/);
    expect(res.text).toMatch(/\/auth\/logout/);
  });

  test('GET / tetap landing (tidak berubah oleh /app)', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/id="root"/);
  });
});
