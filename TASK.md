---
title: "TASK.md — Roadmap Development"
version: "1.0.0"
date: "2026-09-05"
status: "Active"
---

# TASK.md — Roadmap Development

Tahapan development dibagi menjadi 13 fase (Phase 0–12). Setiap task memiliki field: ID, Title, Description, Priority, Dependencies, Acceptance Criteria, Status. Semua task harus **traceable** kembali ke requirement di PRD.md.

---

## Phase 0 — Foundation

| ID     | Title                              | Description                                                                      | Priority | Dependencies | Acceptance Criteria                                                                                                                                     | Status |
|--------|------------------------------------|----------------------------------------------------------------------------------|----------|--------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|--------|
| TASK-001 | Setup Project Repository           | Inisialisasi repo, branch structure, CI/CD pipeline dasar                        | High     | None         | - Repo ter-host (git lokal atau remote)\n- Branch main + develop terbuat\n- GitHub Actions / basic pipeline aktif (lint, test run minimal)\n- README proyek dibuat dengan struktur yang sesuai dokumentasi                                                                     | DONE   |
| TASK-002 | Tambah Dokumentasi Dasar ke Repo   | Memastikan 8 file PRD.md, G_DESIGN.md, DESIGN.md, TASK.md, QA.md, AGENTS.md, database.md, api.md tersimpan di repo root | High     | TASK-001     | - Semua 8 file ada di folder root\n- File memiliki frontmatter tanggal/versi\n- Setiap file bisa dibaca tanpa error                                                                                     | DONE   |

---

## Phase 1 — Authentication

| ID     | Title       | Description                          | Priority | Dependencies | Acceptance Criteria                                                                                                                                     | Status |
|--------|-------------|--------------------------------------|----------|--------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|--------|
| TASK-010 | Implement Auth System | Sistem login/register beserta RBAC sederhana | High     | TASK-001     | - Halaman login bekerja dengan email+password\n- Registrasi membuat user dengan role terdefinisi (Mahasiswa/Perusahaan)\n- JWT token diterima setelah login\n- RBAC: tiap role dapat mengakses endpoint sesuai scope\n- Logout menghapus token\n- Validasi input email & password\n- Error handling: kredensial salah, akun kunci | DONE   |

---

## Phase 2 — User & Profile

| ID     | Title                   | Description                                                                 | Priority | Dependencies | Acceptance Criteria                                                                                                                                     | Status |
|--------|-------------------------|-----------------------------------------------------------------------------|----------|--------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|--------|
| TASK-020 | User Profile CRUD       | Create/Read/User Profile per role                                           | High     | TASK-010     | - Mahasiswa bisa lihat/edit profil (bio, foto)\n- Perusahaan bisa lihat/edit profil company\n- Setiap role memiliki field yang berbeda sesuai requirement PRD\n- Validasi field wajib\n- Foto profil upload dengan validasi tipe/ukuran | DONE   |
| TASK-021 | Role-Based Redirect     | Setelah login, diarahkan ke dashboard sesuai role                           | Medium   | TASK-010     | - Role Mahasiswa → Student Dashboard\n- Role Perusahaan → Company Dashboard\n- Role Kampus → Campus Dashboard\n- Dosen → Dashboard standar dengan opsi bimbingan | DONE   |

---

## Phase 3 — Skill System

| ID     | Title                | Description                                                              | Priority | Dependencies | Acceptance Criteria                                                                                                                                    | Status |
|--------|----------------------|--------------------------------------------------------------------------|----------|--------------|--------------------------------------------------------------------------------------------------------------------------------------------|--------|
| TASK-030 | Skill Entity & Taxonomy | Buat entity Skill beserta daftar seed skill dasar                        | High     | TASK-020     | - Entity Skill punya field: name, category, description, level_scale_default\n- Dada seed minimal 20 skill teknis & 10 soft skill\n- Skill dapat difilter di frontend\n- API endpoint GET /skills berdaftar skill | DONE   |
| TASK-031 | Student Skill Input   | Mahasiswa bisa menambah skill + proficiency level beserta sumber         | High     | TASK-030     | - Form input skill memilih dari dropdown taxonomy\n- Proficiency level input 0–100 atau kategori (Beginner/Intermediate/Advanced)\n- Source dipilih: course/certification/experience\n- Skill tersimpan ke tabel StudentSkill | DONE   |
| TASK-032 | Skill Update & Delete | Mahasiswa bisa update level skill atau hapus skill                        | Medium   | TASK-031     | - Tombol edit level skill muncul di profil\n- Hapus skill menghapus baris StudentSkill\n- Validasi tidak bisa menghapus skill yang masih digunakan project | DONE   |

---

## Phase 4 — Project Marketplace

| ID     | Title                | Description                                                               | Priority | Dependencies | Acceptance Criteria                                                                                                                                    | Status |
|--------|----------------------|---------------------------------------------------------------------------|----------|--------------|--------------------------------------------------------------------------------------------------------------------------------------------|--------|
| TASK-040 | Project Entity & API  | Entity Project + endpoint CRUD basic                                      | High     | TASK-020     | - endpoint POST /projects (perusahaan membuat project)\n- endpoint GET /projects (filter by kategori, skill, level)\n- endpoint GET /projects/:id (detail)\n- Validasi perusahaan wajib terverifikasi sebelum membuat project | DONE   |
| TASK-041 | Project Search & Filter | Filter project berdasarkan skill, level, kategori, deadline               | Medium   | TASK-040     | - Filter dropdown skill muncul dari taxonomy\n- Filter level kesulitan (Easy/Medium/Hard)\n- Sort by: terbaru, rating match score\n- Empty state kalau filter tidak cocok | DONE   |
| TASK-042 | Project Apply Feature | Mahasiswa mendaftar project dengan aplikasi                               | High     | TASK-040,TASK-021 | - Tombol "Daftar Project" muncul di detail project\n- Form: cover letter (opsional), unggah portfolio, daftar skill yang dimiliki\n- Validasi: minimal skill requirement terpenuhi (cek StudentSkill)\n- Aplikasi disimpan ke tabel Application | DONE   |

---

## Phase 5 — Application

| ID     | Title                | Description                                                               | Priority | Dependencies | Acceptance Criteria                                                                                                                                    | Status |
|--------|----------------------|---------------------------------------------------------------------------|----------|--------------|--------------------------------------------------------------------------------------------------------------------------------------------|--------|
| TASK-050 | Application Entity    | Entity Application + status workflow (pending/accepted/rejected)           | High     | TASK-042     | - Setiap aplikasi memiliki status awal "pending"\n- Bisa diubah status oleh perusahaan (accepted/rejected)\n- Waktu applied_catat\n- Relasi ke Student & Project | DONE   |
| TASK-051 | Notification on Apply | Notifikasi terkirim ke perusahaan & mahasiswa saat application dikirim/terverifikasi | Medium   | TASK-050     | - Email notifikasi terkirim ke keduanya\n- In-app notification muncul di dashboard\n- Konten notifikasi mencakup: nama project, nama applicant, status baru | DONE   |

---

## Phase 6 — Talent Matching

| ID     | Title                | Description                                                              | Priority | Dependencies | Acceptance Criteria                                                                                                                                    | Status |
|--------|----------------------|--------------------------------------------------------------------------|----------|--------------|--------------------------------------------------------------------------------------------------------------------------------------------|--------|
| TASK-060 | Match Score Calculation | Implement formula rule-based match score (proposal 50/20/10/10/10)      | High     | TASK-030,TASK-031,TASK-040 | - Fungsi menghitung skor berdasarkan: skill match (50%), experience (20%), portfolio (10%), certification (10%), availability (10%)\n- Setiap kandidat mendapat score numerik 0–100\n- Score dihitung saat daftar kandidat diminta perusahaan\n- Result disimpan ke tabel Applications (field match_score) | DONE   |
| TASK-061 | Candidate Ranking     | Kandidat terurut turun berdasarkan match score di halaman company        | Medium   | TASK-060     | - Daftar kandidat di halaman Candidate Matching diurutkan dari score tertinggi ke terendah\n- Tombol "Lihat Profil" muncul untuk tiap kandidat\n- Filter: hanya tampilkan kandidat di atas skor minimum (configurable admin) | DONE   |
| TASK-062 | Per-Skill Breakdown   | Tampilkan breakdown per-fitur skill di detail match                        | Medium   | TASK-060     | - Tabel tampilkan setiap skill project vs skill kandidat\n- Warna hijau/kuning/merah menandai kuat/close/lemah\n- Catatan: score bukan satu-satunya faktor keputusan | DONE   |

---

## Phase 7 — Skill Gap

| ID     | Title                | Description                                                              | Priority | Dependencies | Acceptance Criteria                                                                                                                                    | Status |
|--------|----------------------|--------------------------------------------------------------------------|----------|--------------|--------------------------------------------------------------------------------------------------------------------------------------------|--------|
| TASK-070 | Gap Calculation Engine | Hitung nilai gap = required_level – student_level per skill              | High     | TASK-030,TASK-031,TASK-040 | - Fungsi menerima: required skill dari project, current skill dari student\n- Output: nilai gap (positive number), klasifikasi (Small/Medium/Large/Critical)\n- Hasil disimpan ke tabel SkillGap\n- Validasi: kalau student skill > required, gap = 0, klasifikasi "No Gap" | DONE   |
| TASK-071 | Gap Classification UI  | UI menampilkan gap value + klasifikasi + rekomendasi action               | Medium   | TASK-070     | - Setiap skill diSkill Gap punya: angka gap, label klasifikasi, tombol "Lihat rekomendasi"\n- Klasifikasi: 0 = No Gap, 1–20 = Small, 21–40 = Medium, 41–60 = Large, >60 = Critical\n- Rekomendasi tampilkan kursus/workshop yang sesuai | DONE   |
| TASK-072 | Student Skill Gap Dashboard | Mahasiswa lihat gap keseluruhan vs project yang mereka minggulkan        | Medium   | TASK-071     | - Dashboard menampilkan daftar skill yang berperan gap\n- Grafik distribusi gap (pie/bar)\n- Tombol "Lihat rekomendasi kursus" mengarah ke halaman Recommendations | DONE   |

---

## Phase 8 — Recommendation

| ID     | Title                | Description                                                              | Priority | Dependencies | Acceptance Criteria                                                                                                                                    | Status |
|--------|----------------------|--------------------------------------------------------------------------|----------|--------------|--------------------------------------------------------------------------------------------------------------------------------------------|--------|
| TASK-080 | Recommendation Engine | Generate rekomendasi berdasarkan skill gap terdeteksi                     | High     | TASK-070,TASK-030 | - Sistem menampilkan rekomendasi: course, workshop, certification, practice project, mentor\n- Setiap rekomendasi punya: judul, deskripsi, durasi estimasi, prioritas (High/Medium/Low), link sumber\n- Rekomendasi muncul di halaman Student Recommendations\n- Filter berdasarkan priority dan tipe rekomendasi | DONE   |
| TASK-081 | Student Action on Rec | Mahasiswa bisa menandai rekomendasi sudah dikonsumsi (progress tracking) | Medium   | TASK-080     | - Tombol "Mulai" / "Selesai" di setiap rekomendasi\n- Status rekomendasi berubah: pending → in-progress → completed\n- Dashboard menampilkan progress rekomendasi per student | DONE   |

---

## Phase 9 — Assessment & Evaluation

| ID     | Title                | Description                                                              | Priority | Dependencies | Acceptance Criteria                                                                                                                                    | Status |
|--------|----------------------|--------------------------------------------------------------------------|----------|--------------|--------------------------------------------------------------------------------------------------------------------------------------------|--------|
| TASK-090 | Assessment Form      | Form evaluasi project dari pihak perusahaan                              | High     | TASK-050     | - Formisi: rating 1–5 per kategori (skill, komunikasi, punctuality, overall)\n- Field komentar bebas\n- Terkait ke AssessmentResult\n- Bisa diisi kapan saja sesudah project selesai | DONE   |
| TASK-091 | Evaluation Result     | Menampilkan hasil evaluasi ke mahasiswa & perusahaan                       | Medium   | TASK-090     | - Hasil evaluasi muncul di halaman Project Evaluation\n- Mahasiswa bisa lihat rating & komentar dari perusahaan\n- Perusahaan bisa lihat aplikasi & evaluasi mahasiswa mereka | DONE   |
| TASK-092 | Skill Update from Assessment | System update skill level mahasiswa berdasarkan evaluasi project            | Medium   | TASK-091     | - Jika evaluator memberi rating skill tinggi, level skill mahasiswa naik sebesar 5–10 poin\n- Update tertulis ke tabel StudentSkill\n- Riwayat perubahan skill tercatat | DONE   |

---

## Phase 10 — Dashboard & Analytics

| ID     | Title                | Description                                                              | Priority | Dependencies | Acceptance Criteria                                                                                                                                    | Status |
|--------|----------------------|--------------------------------------------------------------------------|----------|--------------|--------------------------------------------------------------------------------------------------------------------------------------------|--------|
| TASK-100 | Student Dashboard UI  | Halaman dashboard mahasiswa dengan ringkasan                              | High     | TASK-020,TASK-031,TASK-071,TASK-080 | - Kartu: project baru, rekomendasi skill top 3, aplikasi pending, notifikasi\n- Navigasi sidebar ke Projects/Skills/Gap/Recommendations\n- Ringkasan data refresh otomatis setiap 5 menit | DONE   |
| TASK-101 | Company Dashboard UI  | Halaman dashboard perusahaan dengan ringkasan                             | High     | TASK-040,TASK-050,TASK-061 | - Kartu: project aktif, kandidat menunggu, evaluasi menunggu, match score rata-rata\n- Navigasi ke Projects/Candidates/Talent Matching\n- Tombol aksi cepat: "Lihat Kandidat", "Buat Project" | DONE   |
| TASK-102 | Campus Dashboard UI   | Halaman dashboard admin kampus dengan ringkasan strategis                 | High     | TASK-100,TASK-101,TASK-072,TASK-102 | - Kartu: total mahasiswa, total perusahaan, total project, rata-rata gap skill\n- Alert: sektor skill naik/turun\n- Navigasi ke modul Skills/Analytics/Students/Companies | DONE   |
| TASK-103 | Analytics Visualization | Grafik distribusi skill, tren industri, heatmap gap                       | Medium   | TASK-102,TASK-070 | - Pie chart: distribusi skill mahasiswa\n- Line chart: tren skill yang dicari perusahaan\n- Heatmap: intensity skill gap per program studi\n- Export ke PNG/PDF | DONE   |

---

## Phase 11 — QA

| ID     | Title                | Description                                                              | Priority | Dependencies | Acceptance Criteria                                                                                                                                    | Status |
|--------|----------------------|--------------------------------------------------------------------------|----------|--------------|--------------------------------------------------------------------------------------------------------------------------------------------|--------|
| TASK-110 | Unit Test Setup      | Setup framework pengujian unit (Jest/Vitest)                              | High     | TASK-001     | - Config file pengujian terbuat\n- Contoh test case untuk fungsi hitung match score\n- Coverage minimal 80% di modul core (Auth, Skill, Matching)\n- Test bisa dijalankan via npm test | TODO   |
| TASK-111 | Functional Test Cases | Tulis test case untuk fitur kunci sesuai QA.md                            | High     | TASK-110     | - Test Auth: register, login, logout, invalid credentials\n- Test Student: profile, skill, apply project, gap calculation\n- Test Company: create project, view candidates, match scoring\n- Test Campus: student management, analytics view\n- Semua test case memiliki expected result yang jelas | TODO   |
| TASK-112 | Security Test        | Uji keamanan: validasi input, rate limiting, RBAC                         | Medium   | TASK-110     | - Test mencoba input XSS/SQL injection\n- Test rate limit melebihi batas\n- Test akses endpoint tanpa token dicegah\n- Test role bias tidak bisa mengakses fitur lain | TODO   |
| TASK-113 | Acceptance Criteria Validation | Setiap task harus lewat checklist Acceptance Criteria sebelum diklasifikasikan DONE | High     | TASK-111     | - Tiap task di TASK.md memiliki kolom Acceptance Criteria yang terpenuhi\n- QA.md checklist "Definition of Done" terlewati per task\n- Sign-off dokumentasi sebelum deploy | TODO   |

---

## Phase 12 — Deployment

| ID     | Title                | Description                                                              | Priority | Dependencies | Acceptance Criteria                                                                                                                                    | Status |
|--------|----------------------|--------------------------------------------------------------------------|----------|--------------|--------------------------------------------------------------------------------------------------------------------------------------------|--------|
| TASK-120 | Production Build     | Build aplikasi untuk production                                           | High     | TASK-113     | - Aplikasi dapat di-build tanpa error\n- Environment variables terkonfigurasi (DB URL, JWT secret, API URL)\n- Build output siap di-deploy ke server | TODO   |
| TASK-121 | Deployment to Hosting  | Deploy ke environment staging, lalu production                             | High     | TASK-120     | - Deploy ke staging berhasil dan bisa diakses\n- Semua fitur core (Auth, Skill, Project, Matching) bekerja\n- Database migration teraplikasi tanpa data loss\n- Log error monitoring aktif | TODO   |
| TASK-123 | Post-Launch Monitoring | Setup monitoring & error reporting pasca-luncurkan                         | Medium   | TASK-121     | - Sentry / ErrorTracking terintegrasi\n- Alert email jika error critical muncul\n- Dashboard monitoring uptime & response time\n- Backup strategy database terdefinisi | TODO   |

---

## Cross-Reference Matrix (Ringkasan)

Setiap task di TASK.md harus dapat dilintasi ke:

- **PRD.md** — Setiap requirement di PRD mengandalkan ID task ini untuk implementasi.
- **G_DESIGN.md** — Setiap modul arsitektur di G_DESIGN memiliki task-phase masing-masing.
- **DESIGN.md** — Setiap fitur UI di DESIGN harus memiliki task yang membuat halaman/interaksi tersebut.
- **QA.md** — Setiap task harus memiliki test case yang memenuhi acceptance criteria di QA.md.

---

## Status Workflow

Setiap task berjalan melalui siklus:

```text
TODO → IN PROGRESS → REVIEW → DONE
     ↓              ↓              ↓
BLOCKED       → CANCELLED   (jika tidak dapat dilakukan)
```

Catatan: Tidak ada task boleh dipindahkan ke IN PROGRESS sebelum Acceptance Criteria penuh terdefinisi dan direview.

---