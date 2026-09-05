---
title: "api.md — Spesifikasi API REST"
version: "1.10.0"
date: "2026-09-05"
status: "Approved"
changelog: "2026-09-05 v1.10.0 — TASK-100..103: dashboard kampus, analytics final, halaman EJS"
---

# api.md — Spesifikasi API REST

Spesifikasi endpoint RESTful JSON untuk seluruh modul Campus Industry Talent Hub. Setiap endpoint mencakup: method HTTP, path, role auth yang minimal, request body/params, respons structure, dan traceability ke requirement PRD.md & module G_DESIGN.md.

---

## 1. Konvensi Umum

| Konsep | Spesifikasi |
|--------|-------------|
| **Base URL** | `https://api.campus-talent-hub.dev/v1` (atau `http://localhost:3000/api/v1` development) |
| **Format Response** | JSON standar: `{ success: boolean, data: {}, message: string, errors: [...] }` |
| **Format Error** | `{ success: false, message: "Keterangan error", errors: [{ field: "nama_field", message: "detail error" }] }` |
| **Status Code** | 200 = OK, 201 = Created, 400 = Bad Request (validasi gagal), 401 = Unauthorized (token hilang/salah), 403 = Forbidden (role tidak izin), 404 = Not Found, 422 = Validation Unprocessable, 429 = Too Many Requests, 500 = Internal Server Error |
| **API Versioning** | URL-based: `/v1/`, `/v2/` untuk major update. Minor fix tidak mempengaruhi version. |
| **Rate Limiting** | Default 60 request/menit per IP; 30 request/menit per authenticated user. Melebihinya → 429 with message "Too Many Requests". |
| **Pagination** | Default 15 items per halaman. Parameter: `page` (awal 1), `limit` (opsional). Link pagination di response header: `Link: <url>; rel="next", <url>; rel="prev"`. |
| **Filtering** | Parameter query string: `?filter[field]=value`. Contoh: `?filter[status]=active&filter[skill_name]=React`. |
| **Sorting** | Parameter: `sort[field]=desc/asc`. Contoh: `sort[created_at]=desc`. |
| **Fields** | Parameter: `fields=field1,field2` untuk memilih field yang dikirim (mengurangi payload). |

---

## 2. Auth API

| Method | Endpoint | Auth | Request | Respons | Keterangan |
|--------|----------|------|---------|---------|------------|
| POST | `/auth/register` | Public | `name`, `email`, `password`, `role` (mahasiswa/perusahaan/kampus) | `{ success: true, data: { user, token }, message: "Daftar berhasil" }` | Buat user baru & kirim verifikasi email |
| POST | `/auth/login` | Public | `email`, `password` | `{ success: true, data: { user, token }, message: "Login berhasil" }` | Terima token JWT |
| POST | `/auth/logout` | Bearer token | — | `{ success: true, message: "Logout berhasil" }` | Buang token, invalidate sesi |
| GET | `/auth/me` | Bearer token | — | `{ success: true, data: { user } }` | Ambil profil user yang sedang login |
| POST | `/auth/password-reset` | Public | `email` | `{ success: true, message: "Link reset dikirim ke email" }` | Kirim link reset password via email |
| GET | `/auth/password-reset/confirm/{token}` | Public | `token` | `{ success: true, data: { canReset: true } }` | Validasi token reset password |
| POST | `/auth/password-reset/confirm/{token}` | Public | `token`, `password` (baru, ikut policy) | `{ success: true, message: "Password berhasil direset" }` | Set password baru (tambahan 2026-09-05 TASK-010; spek awal hanya punya GET confirm) |

---

## 3. User API

| Method | Endpoint | Auth | Request | Respons | Keterangan |
|--------|----------|------|---------|---------|------------|
| GET | `/users/profile` | Bearer token | — | `{ success: true, data: { profile } }` | Ambil profil sesuai role user |
| PUT | `/users/profile` | Bearer token | `name`, `bio`, `foto_profile` (url) | `{ success: true, data: { profile }, message: "Profile updated" }` | Update profil personal |
| POST | `/users/profile/photo-upload` | Bearer token | `file` (multipart) | `{ success: true, data: { photo_url }, message: "Foto berhasil diunggah" }` | Upload foto profil (validasi tipe/ukuran) |
| GET | `/users/redirect` | Bearer token | — | `{ success: true, data: { role, redirect_url } }` | Redirect dashboard sesuai role (tambahan 2026-09-05 TASK-021) |

---

## 4. Student API

| Method | Endpoint | Auth | Request | Respons | Keterangan |
|--------|----------|------|---------|---------|------------|
| GET | `/students/skills` | Bearer token | — | `{ success: true, data: { skills } }` | Ambil daftar skill mahasiswa + proficency |
| POST | `/students/skills` | Bearer token | `skill_id`, `proficiency_level`, `source` | `{ success: true, data: { student_skill }, message: "Skill ditambahkan" }` | Tambah skill ke profil mahasiswa |
| PUT | `/students/skills/{skill_id}` | Bearer token | `proficiency_level` | `{ success: true, data: { student_skill }, message: "Skill diupdate" }` | Update level skill |
| DELETE | `/students/skills/{skill_id}` | Bearer token | — | `{ success: true, message: "Skill dihapus" }` | Hapus skill mahasiswa (jika tidak dipakai project) |
| GET | `/students/gaps` | Bearer token | — | `{ success: true, data: { gaps } }` | Hitung skill gap vs project yang minggulkan |
| GET | `/students/recommendations` | Bearer token | — | `{ success: true, data: { recommendations } }` | Ambil rekomendasi kursus/workshop berdasarkan gap |
| GET | `/students/dashboard` | Bearer token | — | `{ success: true, data: { dashboard } }` | Ringkasan dashboard: project baru, notifikasi, rekomendasi |

---

## 4a. Skills Taxonomy API (tambahan 2026-09-05 TASK-030)

| Method | Endpoint | Auth | Request | Respons | Keterangan |
|--------|----------|------|---------|---------|------------|
| GET | `/skills` | Bearer token | `?category=technical` `?search=react` | `{ success: true, data: { skills, total } }` | Daftar taxonomy skill (dropdown frontend, filter kategori/search) |

---

## 5. Company API

| Method | Endpoint | Auth | Request | Respons | Keterangan |
|--------|----------|------|---------|---------|------------|
| POST | `/companies/projects` | Bearer token (perusahaan terverifikasi) | `judul`, `deskripsi`, `sektor_industri`, `deadline`, `status` (draft/active), `difficulty` (easy/medium/hard), `match_score_threshold`, `skills[]` (`skill_id`, `level_required`) | `{ success: true, data: { project }, message: "Project dibuat" }` | Buat project baru (validasi skill ada di taxonomy). Format `skills[]` objek menggantikan `skill_ids[]`+`level_required[]` paralel (2026-09-05 TASK-040) |
| GET | `/companies/projects` | Bearer token | `?filter[status]=active`, `?filter[skill_name]=React`, `?sort[created_at]=desc` | `{ success: true, data: { projects, pagination } }` | Ambil project dengan filter/sort |
| GET | `/companies/projects/{id}` | Bearer token | — | `{ success: true, data: { project } }` | Detail project beserta skill requirement |
| PUT | `/companies/projects/{id}` | Bearer token | same as POST | `{ success: true, data: { project }, message: "Project diupdate" }` | Edit project (hanya pemilik perusahaan) |
| DELETE | `/companies/projects/{id}` | Bearer token | — | `{ success: true, message: "Project dihapus" }` | Hapus project (soft-delete) |
| GET | `/companies/projects/{id}/applications` | Bearer token (perusahaan pemilik) | `?filter[status]=pending` | `{ success: true, data: { applications, total } }` | Daftar pelamar + skill masing-masing (tambahan 2026-09-05 TASK-050) |
| PATCH | `/companies/applications/{id}` | Bearer token (perusahaan pemilik) | `status` (accepted/rejected, hanya dari pending) | `{ success: true, data: { application } }` | Terima/tolak pelamar + notifikasi ke mahasiswa (tambahan 2026-09-05 TASK-050) |
| GET | `/companies/candidates` | Bearer token | `?min_match_score=70`, `?skill=React`, `?sort=match_score` | `{ success: true, data: { candidates, pagination } }` | Daftar kandidat terurut match score |
| POST | `/companies/applications/{app_id}/evaluate` | Bearer token | `rating_skill`, `rating_communication`, `rating_punctuality`, `rating_overall`, `comments` | `{ success: true, data: { assessment }, message: "Evaluasi disimpan" }` | Perusahaan evaluasi mahasiswa |
| GET | `/companies/dashboard` | Bearer token | — | `{ success: true, data: { dashboard } }` | Ringkasan: project aktif, kandidat, evaluasi menunggu |

---

## 6. Project API (Mahasiswa/Tampilan Umum)

| Method | Endpoint | Auth | Request | Respons | Keterangan |
|--------|----------|------|---------|---------|------------|
| GET | `/projects` | Public/Token | `?filter[sektor_industri]=X`, `?filter[skill]=React`, `?filter[difficulty]=easy`, `?sort=terbaru|deadline|match_score`, `?page`, `?limit` | `{ success: true, data: { projects, pagination } }` | Browse project industry (hanya status active). `sort=match_score` butuh login mahasiswa; perhitungannya preliminary overlap skill hingga formula otoritatif Phase 6 (TASK-060) |
| GET | `/projects/{id}` | Public/Token | — | `{ success: true, data: { project } }` | Detail project lengkap beserta info perusahaan |
| POST | `/projects/{id}/apply` | Bearer token | `cover_letter`, `portfolio_url`, `skills_showcase[]` (skill_id yang dipakai) | `{ success: true, data: { application }, message: "Aplikasi terkirim" }` | Mahasiswa mendaftar project |
| GET | `/projects/{id}/match` | Bearer token | — | `{ success: true, data: { match_score, breakdown } }` | Hitung match score mahasiswa vs project (untuk kandidat) |

---

## 7. Matching Engine API

| Method | Endpoint | Auth | Request | Respons | Keterangan |
|--------|----------|------|---------|---------|------------|
| POST | `/matching/calculate` | Bearer token | `student_id`, `project_id` (mode DB; mahasiswa hanya diri sendiri) | `{ success: true, data: { score, components, breakdown, weights } }` | Kalkulasi formula otoritatif 50/20/10/10/10 (2026-09-05 TASK-060; bobot `[NEEDS DECISION]`, respons sertakan weights). Menggantikan mode array usulan awal |
| GET | `/matching/ranking` | Bearer token | `project_id`, `min_score` (opsional) | `{ success: true, data: { candidates ranked } }` | Ranking kandidat untuk project tertentu |

---

## 8. Skill Gap API

| Method | Endpoint | Auth | Request | Respons | Keterangan |
|--------|----------|------|---------|---------|------------|
| GET | `/gap-analysis/{student_id}/{project_id?}` | Bearer token (mahasiswa self-only) | — | `{ success: true, data: { gaps: [{skill_name, required, current, gap_value, classification, recommendation}], summary } }` | Hitung & klasifikasi skill gap + persist ke skill_gaps (snapshot per hitung). Tanpa project_id = vs requirement terberat pasar aktif (`[ASSUMPTION]` 2026-09-05 TASK-070). Rekomendasi = aksi teks per klasifikasi; katalog penuh Phase 8 |
| GET | `/gap-analysis/student/{student_id}` | Bearer token | — | `{ success: true, data: { overall_gap_distribution } }` | Distribusi gap keseluruhan mahasiswa |

---

## 9. Recommendation API

| Method | Endpoint | Auth | Request | Respons | Keterangan |
|--------|----------|------|---------|---------|------------|
| GET | `/recommendations/student/{student_id}` | Bearer token (mahasiswa self-only) | `?priority=high` `?type=course` | `{ success: true, data: { recommendations: [{type, title, description, priority, source, status}], total, progress } }` | Ambil rekomendasi berdasarkan gap skill. Generate otomatis (idempotent) setiap analisis gap + notifikasi 'rec' (2026-09-05 TASK-080) |
| POST | `/recommendations/{rec_id}/action` | Bearer token (pemilik) | `action` (start/completed/consumed) | `{ success: true, data: { recommendation }, message: "Status diupdate" }` | Transisi: pending→in-progress→completed (+consumed_at); consumed dari status apa pun (2026-09-05 TASK-081) |

---

## 10. Assessment & Evaluation API

| Method | Endpoint | Auth | Request | Respons | Keterangan |
|--------|----------|------|---------|---------|------------|
| POST | `/assessments` | Bearer token (company/dosen) | `project_id`, `student_id`, `rating_skill`, `rating_communication`, `rating_punctuality`, `rating_overall`, `comments` | `{ success: true, data: { assessment }, message: "Evaluasi disimpan" }` | Buat evaluasi project. Syarat: aplikasi accepted + project closed + satu penilaian per peran (2026-09-05 TASK-090). Otomatis buat project_evaluations + bump skill (+10 bila rating_skill≥4, +5 bila =3, cap 100, sekali saat create) + notifikasi 'eval' (TASK-092) |
| GET | `/evaluations/{project_id}/{student_id}` | Bearer token | — | `{ success: true, data: { evaluation } }` | Ambil hasil evaluasi beserta rating |
| PUT | `/evaluations/{project_id}/{student_id}` | Bearer token | same as POST | `{ success: true, data: { assessment }, message: "Evaluasi diupdate" }` | Perusahaan/dosen update evaluasi |

---

## 11. Notification API

| Method | Endpoint | Auth | Request | Respons | Keterangan |
|--------|----------|------|---------|---------|------------|
| GET | `/notifications` | Bearer token | `?type=apply&is_read=0` | `{ success: true, data: { notifications, pagination } }` | Ambil notifikasi user yang login |
| PUT | `/notifications/{notif_id}/read` | Bearer token | — | `{ success: true, message: "Notifikasi ditandai sebagai baca" }` | Tandai notifikasi sudah dibaca |

---

## 12. Analytics API (Kampus/Admin)

| Method | Endpoint | Auth | Request | Respons | Keterangan |
|--------|----------|------|---------|---------|------------|
| GET | `/analytics/skill-distribution` | Bearer token (kampus/dosen) | `?program_studi=X` | `{ success: true, data: { total_students, distribution } }` | Distribusi skill mahasiswa (pie-data) |
| GET | `/analytics/industry-demand` | Bearer token (kampus/dosen) | `?period=last_6_months|last_30_days|all` | `{ success: true, data: { period, trend, top_skills } }` | Tren skill yang dicari perusahaan (line-data) |
| GET | `/analytics/gap-heatmap` | Bearer token (kampus/dosen) | `?program_studi=X` | `{ success: true, data: { skills, matrix } }` | Heatmap skill gap per program studi (maks 12 skill) |
| GET | `/analytics/export` | Bearer token (kampus/dosen) | `?format=csv` | File CSV `gap-export.csv` | Export gap per mahasiswa (PNG/PDF via cetak browser) |
| GET | `/campus/dashboard` | Bearer token (kampus/dosen) | — | `{ success: true, data: { total_*, avg_gap, top_demanded_skills, ... } }` | Ringkasan strategis kampus (tambahan 2026-09-05 TASK-102) |

> **Catatan 2026-09-05 (TASK-100..103):** halaman EJS (`/login`, `/dashboard/student|company|campus|mentor|analytics`) memakai data endpoint di atas; autentikasi halaman via header Bearer atau `?token=` (`[NEEDS DECISION]` cookie session untuk produksi).
>
> **Catatan 2026-09-05 (TASK-104):** `GET /` menyajikan SPA landing React + Tailwind via CDN (butuh internet): sambutan + CTA ke `/login`.
>
> **Catatan 2026-09-05 (TASK-105):** pemisahan tegas — `/` landing only (tanpa form login), `/login` halaman login khusus (EJS, offline-ready), `/dashboard/*` dashboard per role.

---

## 13. Traceability Mapping (Endpoint ↔ PRD & G_DESIGN)

| Endpoint | Modul G_DESinden | Requirement PRD | Fitur Utama |
|----------|------------------|-----------------|-------------|
| POST /auth/register | Auth Service | Fitur 1: Authentication | Login/register semua user |
| GET /students/skills | Skill Management | Fitur 3: Skill Profile | Lihat/edit skill mahasiswa |
| POST /students/skills | Skill Management | Fitur 3: Skill Profile | Tambah skill + level |
| GET /skills | Skill Management | Fitur 3: Skill Profile | Dropdown taxonomy + filter |
| GET /students/gaps | Skill Gap Engine | Fitur 10: Skill Gap Analysis | Hitung gap required vs current |
| GET /students/recommendations | Recommendation Engine | Fitur 11: Recommendation System | Rekomendasi berdasarkan gap |
| POST /companies/projects | Project Marketplace | Fitur 5: Project Management | Buat project perusahaan |
| GET /companies/candidates | Matching Engine | Fitur 8: Talent Matching | Lihat kandidat terurut score |
| POST /companies/applications/{app_id}/evaluate | Assessment | Fitur 12: Assessment | Evaluasi project dari perusahaan |
| GET /projects | Industry Project Marketplace | Fitur 5: Project Marketplace | Browse project mahasiswa |
| POST /projects/{id}/apply | Application | Fitur 6: Application | Mahasiswa daftar project |
| GET /companies/projects/{id}/applications | Application | Fitur 6: Application | Perusahaan lihat pelamar |
| PATCH /companies/applications/{id} | Application | Fitur 6: Application | Perusahaan terima/tolak pelamar |
| GET /notifications | Notification | Fitur 14: Notification | Notifikasi in-app per user |
| GET /recommendations/student | Recommendation Engine | Fitur 11: Recommendation System | Rekomendasi kursus/workshop |
| GET /gap-analysis | Skill Gap Engine | Fitur 10: Skill Gap Analysis | Analisis kesenjangan skill |
| GET /analytics/skill-distribution | Analytics | Fitur 16: Analytics | Visualisasi data skill |
| GET /notifications | Notification | Fitur 14: Notification | Notifikasi seluruh fitur |

**Catatan Traceability:**
- Setiap endpoint di atas harus memiliki unit test dan integration test sebelum DONE.
- Jika endpoint baru ditambahkan, harus dicantumkan di tabel ini beserta ID requirement PRD yang didukung.
- Versi API v1 wajib memenuhi semuanya; v2 hanya untuk fitur tambahan non-breaking.

---