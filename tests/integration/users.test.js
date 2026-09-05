// Integration tests — Users/Profile API (TASK-020, TASK-021, QA TC-STU-001).
process.env.DB_PATH = ':memory:';

const request = require('supertest');
const { createApp } = require('../../server/src/app');
const { runMigrations } = require('../../server/src/db/migrate');
const { getDb, closeDb } = require('../../server/src/db/connection');
const { hashPassword } = require('../../server/src/utils/password');

const app = createApp();
const VALID_PASSWORD = 'S3cret!pass';
// PNG 1x1 valid untuk uji upload.
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

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

beforeAll(() => {
  runMigrations();
});

afterAll(() => {
  closeDb();
});

describe('GET /api/v1/users/profile', () => {
  test('mahasiswa: profil + student_profile otomatis tersedia', async () => {
    const token = await registerAndLogin('Mhs Profil', 'mhsprof@kampus.ac.id', 'mahasiswa');
    const res = await request(app).get('/api/v1/users/profile').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('mahasiswa');
    expect(res.body.data.profile).toBeTruthy();
  });

  test('perusahaan: profil company (nama default, belum verifikasi)', async () => {
    const token = await registerAndLogin('PT Maju', 'ptmaju@corp.id', 'perusahaan');
    const res = await request(app).get('/api/v1/users/profile').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.profile.nama_perusahaan).toBe('PT Maju');
    expect(res.body.data.profile.verified_status).toBe(0);
  });

  test('tanpa token → 401', async () => {
    const res = await request(app).get('/api/v1/users/profile');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/v1/users/profile', () => {
  test('TC-STU-001: mahasiswa isi profil → tersimpan ke StudentProfile', async () => {
    const token = await registerAndLogin('Mhs Edit', 'mhsedit@kampus.ac.id', 'mahasiswa');
    const put = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Mhs Edit Baru',
        npm: '12345678',
        program_studi: 'Informatika',
        angkatan: 2023,
        bio: 'Mahasiswa TI semester 5',
      });
    expect(put.status).toBe(200);
    expect(put.body.message).toBe('Profile updated');
    expect(put.body.data.profile.npm).toBe('12345678');

    const get = await request(app).get('/api/v1/users/profile').set('Authorization', `Bearer ${token}`);
    expect(get.body.data.user.name).toBe('Mhs Edit Baru');
    expect(get.body.data.profile.program_studi).toBe('Informatika');
    expect(get.body.data.profile.angkatan).toBe(2023);
  });

  test('validasi: NPM bukan 8 karakter → 422', async () => {
    const token = await registerAndLogin('Mhs Npm', 'mhsnpm@kampus.ac.id', 'mahasiswa');
    const res = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mhs Npm', npm: '123' });
    expect(res.status).toBe(422);
  });

  test('NPM duplikat milik user lain → 400', async () => {
    const t1 = await registerAndLogin('Mhs A', 'mhsa@kampus.ac.id', 'mahasiswa');
    await request(app).put('/api/v1/users/profile').set('Authorization', `Bearer ${t1}`).send({
      name: 'Mhs A',
      npm: '87654321',
    });
    const t2 = await registerAndLogin('Mhs B', 'mhsb@kampus.ac.id', 'mahasiswa');
    const res = await request(app).put('/api/v1/users/profile').set('Authorization', `Bearer ${t2}`).send({
      name: 'Mhs B',
      npm: '87654321',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/NPM sudah digunakan/);
  });

  test('perusahaan: edit profil company; verified_status tidak bisa diubah sendiri', async () => {
    const token = await registerAndLogin('PT Ubah', 'ptubah@corp.id', 'perusahaan');
    const put = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'PT Ubah',
        nama_perusahaan: 'PT Ubah Jaya',
        industri: 'Teknologi',
        size: 'startup',
        deskripsi: 'Startup edutech',
        verified_status: 1,
      });
    expect(put.status).toBe(200);
    expect(put.body.data.profile.nama_perusahaan).toBe('PT Ubah Jaya');
    expect(put.body.data.profile.size).toBe('startup');
    expect(put.body.data.profile.verified_status).toBe(0);
  });
});

describe('POST /api/v1/users/profile/photo-upload', () => {
  test('mahasiswa upload PNG valid → 200 + foto tersimpan di profil', async () => {
    const token = await registerAndLogin('Mhs Foto', 'mhsfoto@kampus.ac.id', 'mahasiswa');
    const up = await request(app)
      .post('/api/v1/users/profile/photo-upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PNG_1PX, { filename: 'foto.png', contentType: 'image/png' });
    expect(up.status).toBe(200);
    expect(up.body.data.photo_url).toMatch(/^\/uploads\/profiles\//);
    expect(up.body.data.profile.foto_profile).toBe(up.body.data.photo_url);

    // File tersaji via static route.
    const served = await request(app).get(up.body.data.photo_url);
    expect(served.status).toBe(200);
  });

  test('perusahaan upload foto → tersimpan sebagai logo', async () => {
    const token = await registerAndLogin('PT Foto', 'ptfoto@corp.id', 'perusahaan');
    const up = await request(app)
      .post('/api/v1/users/profile/photo-upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PNG_1PX, { filename: 'logo.png', contentType: 'image/png' });
    expect(up.status).toBe(200);
    expect(up.body.data.profile.logo).toBe(up.body.data.photo_url);
  });

  test('tipe file txt ditolak → 400', async () => {
    const token = await registerAndLogin('Mhs Txt', 'mhstxt@kampus.ac.id', 'mahasiswa');
    const res = await request(app)
      .post('/api/v1/users/profile/photo-upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('bukan gambar'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  test('file > 5MB ditolak → 400', async () => {
    const token = await registerAndLogin('Mhs Big', 'mhsbig@kampus.ac.id', 'mahasiswa');
    const res = await request(app)
      .post('/api/v1/users/profile/photo-upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.alloc(6 * 1024 * 1024, 0), { filename: 'big.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/5MB/);
  });
});

describe('Role-based redirect (TASK-021)', () => {
  test('login menyertakan dashboard_url sesuai role', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Mhs Dash',
      email: 'mhsdash@kampus.ac.id',
      password: VALID_PASSWORD,
      role: 'mahasiswa',
    });
    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'mhsdash@kampus.ac.id',
      password: VALID_PASSWORD,
    });
    expect(login.body.data.dashboard_url).toBe('/dashboard/student');
  });

  test.each([
    ['mahasiswa', 'mhsred@kampus.ac.id', '/dashboard/student'],
    ['perusahaan', 'ptred@corp.id', '/dashboard/company'],
    ['kampus', 'admred@kampus.ac.id', '/dashboard/campus'],
  ])('GET /users/redirect role %s → %s', async (role, email, expected) => {
    const token = await registerAndLogin(`Red ${role}`, email, role);
    const res = await request(app).get('/api/v1/users/redirect').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.redirect_url).toBe(expected);
  });

  test('dosen → dashboard mentor dengan opsi bimbingan', async () => {
    const db = getDb();
    const hash = await hashPassword(VALID_PASSWORD);
    db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Dosen Guy', 'dosen@kampus.ac.id', ?, 'dosen')").run(hash);
    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'dosen@kampus.ac.id',
      password: VALID_PASSWORD,
    });
    expect(login.status).toBe(200);
    expect(login.body.data.dashboard_url).toBe('/dashboard/mentor');

    const profile = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${login.body.data.token}`);
    expect(profile.status).toBe(200);
    expect(profile.body.data.profile).toBeNull();
  });
});
