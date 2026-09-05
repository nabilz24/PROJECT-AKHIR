// Users/Profile controller (TASK-020, TASK-021, api.md Bagian 3).
const { getDb } = require('../db/connection');
const { ok, fail } = require('../utils/response');
const { getDashboardUrl } = require('../utils/redirect');
const { logAudit } = require('../middlewares/audit');

function getProfile(req, res, next) {
  try {
    const db = getDb();
    const user = { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role };
    let profile = null;
    if (req.user.role === 'mahasiswa') {
      profile = db.prepare('SELECT npm, program_studi, angkatan, bio, foto_profile FROM student_profiles WHERE user_id = ?').get(req.user.id) || null;
    } else if (req.user.role === 'perusahaan') {
      profile = db.prepare('SELECT nama_perusahaan, industri, size, deskripsi, logo, verified_status FROM companies WHERE user_id = ?').get(req.user.id) || null;
    }
    return ok(res, { user, profile }, 'OK');
  } catch (err) {
    return next(err);
  }
}

function updateProfile(req, res, next) {
  try {
    const db = getDb();
    const { name, npm, program_studi, angkatan, bio, foto_profile, nama_perusahaan, industri, size, deskripsi } = req.body;

    db.prepare("UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?").run(name, req.user.id);

    let profile = null;
    if (req.user.role === 'mahasiswa') {
      const patch = { npm: npm ?? null, program_studi: program_studi ?? null, angkatan: angkatan ?? null, bio: bio ?? null, foto_profile: foto_profile ?? null };
      const existing = db.prepare('SELECT id FROM student_profiles WHERE user_id = ?').get(req.user.id);
      if (existing) {
        // Partial update: hanya field yang dikirim yang diubah.
        const sets = [];
        const vals = [];
        for (const [k, v] of Object.entries(patch)) {
          if (req.body[k] !== undefined) {
            sets.push(`${k} = ?`);
            vals.push(v);
          }
        }
        if (sets.length > 0) {
          db.prepare(`UPDATE student_profiles SET ${sets.join(', ')}, updated_at = datetime('now') WHERE user_id = ?`).run(...vals, req.user.id);
        }
      } else {
        db.prepare('INSERT INTO student_profiles (user_id, npm, program_studi, angkatan, bio, foto_profile) VALUES (?, ?, ?, ?, ?, ?)').run(
          req.user.id, patch.npm, patch.program_studi, patch.angkatan, patch.bio, patch.foto_profile
        );
      }
      profile = db.prepare('SELECT npm, program_studi, angkatan, bio, foto_profile FROM student_profiles WHERE user_id = ?').get(req.user.id);
    } else if (req.user.role === 'perusahaan') {
      const patch = { nama_perusahaan, industri: industri ?? null, size: size ?? null, deskripsi: deskripsi ?? null };
      const sets = [];
      const vals = [];
      // verified_status SENGAJA tidak bisa diubah via endpoint ini (hanya admin kampus).
      for (const [k, v] of Object.entries(patch)) {
        if (req.body[k] !== undefined) {
          sets.push(`${k} = ?`);
          vals.push(v);
        }
      }
      if (sets.length > 0) {
        db.prepare(`UPDATE companies SET ${sets.join(', ')}, updated_at = datetime('now') WHERE user_id = ?`).run(...vals, req.user.id);
      }
      profile = db.prepare('SELECT nama_perusahaan, industri, size, deskripsi, logo, verified_status FROM companies WHERE user_id = ?').get(req.user.id);
    }

    logAudit({ userId: req.user.id, action: 'etc', entityType: 'user', entityId: req.user.id, req });
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(req.user.id);
    return ok(res, { user, profile }, 'Profile updated');
  } catch (err) {
    // UNIQUE violation (npm duplikat) -> 400 user-friendly (database.md integritas).
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return fail(res, 'NPM sudah digunakan user lain', [{ field: 'npm', message: 'NPM sudah digunakan user lain' }], 400);
    }
    return next(err);
  }
}

function uploadPhoto(req, res, next) {
  try {
    const db = getDb();
    const photoUrl = `/uploads/profiles/${req.file.filename}`;
    let profile = null;
    if (req.user.role === 'mahasiswa') {
      const existing = db.prepare('SELECT id FROM student_profiles WHERE user_id = ?').get(req.user.id);
      if (existing) {
        db.prepare("UPDATE student_profiles SET foto_profile = ?, updated_at = datetime('now') WHERE user_id = ?").run(photoUrl, req.user.id);
      } else {
        db.prepare('INSERT INTO student_profiles (user_id, foto_profile) VALUES (?, ?)').run(req.user.id, photoUrl);
      }
      profile = db.prepare('SELECT npm, program_studi, angkatan, bio, foto_profile FROM student_profiles WHERE user_id = ?').get(req.user.id);
    } else if (req.user.role === 'perusahaan') {
      db.prepare("UPDATE companies SET logo = ?, updated_at = datetime('now') WHERE user_id = ?").run(photoUrl, req.user.id);
      profile = db.prepare('SELECT nama_perusahaan, industri, size, deskripsi, logo, verified_status FROM companies WHERE user_id = ?').get(req.user.id);
    }
    logAudit({ userId: req.user.id, action: 'etc', entityType: 'user', entityId: req.user.id, req });
    return ok(res, { photo_url: photoUrl, profile }, 'Foto berhasil diunggah');
  } catch (err) {
    return next(err);
  }
}

// GET /users/redirect (TASK-021: diarahkan ke dashboard sesuai role).
function redirect(req, res, next) {
  try {
    return ok(res, { role: req.user.role, redirect_url: getDashboardUrl(req.user.role) }, 'OK');
  } catch (err) {
    return next(err);
  }
}

module.exports = { getProfile, updateProfile, uploadPhoto, redirect };
