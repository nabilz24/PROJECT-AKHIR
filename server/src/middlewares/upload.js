// Multer upload middleware (TASK-020, G_DESIGN file upload security).
// Foto profil: hanya image (JPG/PNG/WebP), maks 5MB, nama file acak agar
// path asli tidak ter-expose. Disimpan di server/uploads/profiles/.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { fail } = require('../utils/response');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'profiles');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (G_DESIGN)
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_MESSAGE = 'Tipe file tidak diizinkan (hanya JPG, PNG, WebP)';

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user.id}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(ALLOWED_MESSAGE));
  }
}

const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('file');

// Wrapper: ubah error multer menjadi respons format api.md.
function uploadPhoto(req, res, next) {
  uploadSingle(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return fail(res, 'File terlalu besar (maksimal 5MB)', [{ field: 'file', message: 'File terlalu besar (maksimal 5MB)' }], 400);
      }
      return fail(res, err.message || 'Upload gagal', [{ field: 'file', message: err.message || 'Upload gagal' }], 400);
    }
    if (!req.file) {
      return fail(res, 'File wajib diunggah (field: file)', [{ field: 'file', message: 'File wajib diunggah' }], 400);
    }
    return next();
  });
}

module.exports = { uploadPhoto, UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_MIME };
