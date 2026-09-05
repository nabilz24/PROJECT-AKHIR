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
    expect(res.text).toMatch(/tailwindcss\/browser/);
    expect(res.text).toMatch(/\/students\/dashboard/);
    expect(res.text).toMatch(/\/companies\/dashboard/);
    expect(res.text).toMatch(/\/campus\/dashboard/);
    expect(res.text).toMatch(/\/analytics\/skill-distribution/);
    expect(res.text).toMatch(/\/auth\/me/);
    expect(res.text).toMatch(/\/auth\/logout/);
    expect(res.text).toMatch(/My Skills/);
    expect(res.text).toMatch(/Gap Analysis/);
    expect(res.text).toMatch(/Recommendations/);
    expect(res.text).toMatch(/My Projects/);
    expect(res.text).toMatch(/Applications/);
    expect(res.text).toMatch(/Notifikasi/);
    expect(res.text).toMatch(/\/mentor\/awaiting/);
    expect(res.text).toMatch(/\/users\/profile/);
    expect(res.text).toMatch(/\/students\/skills/);
    expect(res.text).toMatch(/\/companies\/projects/);
    expect(res.text).toMatch(/\/assessments/);
    expect(res.text).toMatch(/#\/projects/);
    expect(res.text).toMatch(/#\/notifications/);
    expect(res.text).toMatch(/Akun demo/);
    expect(res.text).toMatch(/Talent Hub App/);
  });

  test('GET / tetap landing (tidak berubah oleh /app)', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/id="root"/);
  });
});
