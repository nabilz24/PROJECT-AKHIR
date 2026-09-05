---
title: "database.md — Desain Database & Schema"
version: "1.7.0"
date: "2026-09-05"
status: "Approved"
changelog: "2026-09-05 v1.7.0 — TASK-070: catat migrasi 012 skill_gaps (student_skill_id/source nullable)"
---

# database.md — Desain Database & Schema

Lanjutan dari G_DESIGN.md (system architecture). File ini berisi **skema tabel lengkap** + relasi + index + data seed untuk kebutuhan MVP. Semua entiti dirancang agar **traceable** ke requirement di PRD.md dan module di G_DESIGN.md.

---

## 1. Entity & Skema Tabel

| Tabel | Field | Tipe | Kunci | Constraint | Relasi |
|-------|-------|------|-------|------------|--------|
| **users** | id | BIGINT UNSIGNED | PK | auto-increment | — |
| | name | VARCHAR(100) | NOT NULL | — | — |
| | email | VARCHAR(191) | UNIQUE | — | — |
| | password_hash | VARCHAR(255) | NOT NULL | — | — |
| | role | ENUM('mahasiswa','perusahaan','kampus','dosen') | NOT NULL | — | — |
| | email_verified_at | TIMESTAMP | NULL | — | — |
| | created_at | TIMESTAMP | — | — | — |
| | updated_at | TIMESTAMP | — | — | — |
| | deleted_at | TIMESTAMP | NULL | soft-delete | — |
| **student_profiles** | id | BIGINT UNSIGNED | PK | auto-increment | 1:1 users (user_id FK) |
| | user_id | BIGINT UNSIGNED | UK | UNIQUE, FK → users.id | — |
| | npm | CHAR(8) | UNIQUE | — | — |
| | program_studi | VARCHAR(50) | — | — | — |
| | angkatan | YEAR | — | — | — |
| | bio | TEXT | NULL | — | — |
| | foto_profile | VARCHAR(255) | NULL | URL file | — |
| | created_at | TIMESTAMP | — | — | — |
| **companies** | id | BIGINT UNSIGNED | PK | auto-increment | 1:1 users (user_id FK) |
| | user_id | BIGINT UNSIGNED | UK | UNIQUE, FK → users.id | — |
| | nama_perusahaan | VARCHAR(100) | NOT NULL | — | — |
| | industri | VARCHAR(50) | — | — | — |
| | size | ENUM('startup','medium','large','corporate') | — | — | — |
| | deskripsi | TEXT | NULL | — | — |
| | verified_status | TINYINT(1) | DEFAULT 0 | 0=belum, 1=sudah | — |
| | created_at | TIMESTAMP | — | — | — |
| **projects** | id | BIGINT UNSIGNED | PK | auto-increment | 1:N companies (company_id FK) |
| | company_id | BIGINT UNSIGNED | FK | FK → companies.id | — |
| | judul | VARCHAR(150) | NOT NULL | — | — |
| | deskripsi | TEXT | — | — | — |
| | sektor_industri | VARCHAR(50) | — | — | — |
| | deadline | DATE | — | — | — |
| | status | ENUM('draft','active','closed') | DEFAULT 'draft' | — | — |
| | match_score_threshold | TINYINT(3) | DEFAULT 70 | batas minimum score untuk kandidat | — |
| | created_at | TIMESTAMP | — | — | — |
| | updated_at | TIMESTAMP | — | — | — |
| **skills** | id | BIGINT UNSIGNED | PK | auto-increment | — |
| | name | VARCHAR(50) | UNIQUE | — | — |
| | category | ENUM('technical','soft-skill','certification','tool') | — | — | — |
| | description | TEXT | NULL | — | — |
| | level_scale_default | TINYINT(3) | DEFAULT 100 | skala maksimum proficience | — |
| | created_at | TIMESTAMP | — | — | — |
| **student_skills** | id | BIGINT UNSIGNED | PK | auto-increment | Many: students (student_id FK) |
| | student_id | BIGINT UNSIGNED | FK | FK → users.id (dengan role mahasiswa) | — |
| | skill_id | BIGINT UNSIGNED | FK | FK → skills.id | — |
| | proficiency_level | TINYINT(3) | — | 0–100, default 0 | — |
| | source | ENUM('course','certification','experience') | — | sumber data skill | — |
| | created_at | TIMESTAMP | — | — | — |
| | UNIQUE KEY (student_id, skill_id) | — | — | satu skill hanya sekali per mahasiswa | — |
| **project_skills** | id | BIGINT UNSIGNED | PK | auto-increment | Many: projects (project_id FK) |
| | project_id | BIGINT UNSIGNED | FK | FK → projects.id | — |
| | skill_id | BIGINT UNSIGNED | FK | FK → skills.id | — |
| | level_required | TINYINT(3) | — | 0–100, wajib diisi | — |
| | created_at | TIMESTAMP | — | — | — |
| | UNIQUE KEY (project_id, skill_id) | — | — | satu skill hanya sekali per project | — |
| **portfolios** | id | BIGINT UNSIGNED | PK | auto-increment | Many: students (student_id FK) |
| | student_id | BIGINT UNSIGNED | FK | FK → users.id (role mahasiswa) | — |
| | title | VARCHAR(100) | — | — | — |
| | description | TEXT | NULL | — | — |
| | file_url | VARCHAR(255) | — | URL file (portfolio) | — |
| | media_type | ENUM('code','design','writing','other') | — | — | — |
| | created_at | TIMESTAMP | — | — | — |
| **certifications** | id | BIGINT UNSIGNED | PK | auto-increment | Many: students (student_id FK) |
| | student_id | BIGINT UNSIGNED | FK | FK → users.id (role mahasiswa) | — |
| | name | VARCHAR(100) | — | nama sertifikat | — |
| | issuing_organization | VARCHAR(100) | — | lembaga yang mengeluarkan | — |
| | credential_id | VARCHAR(50) | UNIQUE | nomor credential (opsional) | — |
| | expiry_date | DATE | NULL | tanggal kadaluarsa (opsional) | — |
| | url_verifikasi | VARCHAR(255) | NULL | link verifikasi online (opsional) | — |
| | created_at | TIMESTAMP | — | — | — |
| **applications** | id | BIGINT UNSIGNED | PK | auto-increment | Many: students (student_id FK) |
| | student_id | BIGINT UNSIGNED | FK | FK → users.id (role mahasiswa) | — |
| | project_id | BIGINT UNSIGNED | FK | FK → projects.id | — |
| | status | ENUM('pending','accepted','rejected') | DEFAULT 'pending' | — | — |
| | match_score | TINYINT(3) | NULL | 0–100, hasil kalkulasi matching | — |
| | cover_letter | TEXT | NULL | — | — |
| | applied_at | TIMESTAMP | DEFAULT NOW() | — | — |
| | updated_at | TIMESTAMP | — | — | — |
| **assessments** | id | BIGINT UNSIGNED | PK | auto-increment | Many: projects (project_id FK) |
| | project_id | BIGINT UNSIGNED | FK | FK → projects.id | — |
| | student_id | BIGINT UNSIGNED | FK | FK → users.id (role mahasiswa) | — |
| | evaluator_role | ENUM('company','dosen') | — | siapa yang menilai | — |
| | rating_skill | TINYINT(1) | 1–5 | — | — |
| | rating_communication | TINYINT(1) | 1–5 | — | — |
| | rating_punctuality | TINYINT(1) | 1–5 | — | — |
| | rating_overall | TINYINT(1) | 1–5 | — | — |
| | comments | TEXT | NULL | — | — |
| | assessed_at | TIMESTAMP | DEFAULT NOW() | — | — |
| **project_evaluations** | id | BIGINT UNSIGNED | PK | auto-increment | 1:1 assessments (assessment_id FK) |
| | assessment_id | BIGINT UNSIGNED | UK | UNIQUE, FK → assessments.id | — |
| | overall_rating | TINYINT(1) | 1–5 | — | — |
| | category_ratings JSON | JSON | — | rating per kategori | — |
| | feedback_text | TEXT | NULL | — | — |
| | published_status | ENUM('draft','published') | DEFAULT 'draft' | — | — |
| **skill_gaps** | id | BIGINT UNSIGNED | PK | auto-increment | Many: students (student_id FK) |
| | student_id | BIGINT UNSIGNED | FK | FK → users.id (role mahasiswa) | — |
| | project_id | BIGINT UNSIGNED | FK | FK → projects.id (opsional) | — |
| | required_skill_id | BIGINT UNSIGNED | FK | FK → skills.id (skill yang dibutuhkan) | — |
| | student_skill_id | BIGINT UNSIGNED | FK | FK → student_skills.id (skill milik mahasiswa) | — |
| | gap_value | TINYINT(3) | — | 0–100 (perbedaan level) | — |
| | classification | ENUM('no-gap','small','medium','large','critical') | — | — | — |
| | recommendation_type | ENUM('course','workshop','certification','practice-project','mentor') | — | jenis rekomendasi | — |
| | recommendation_title | VARCHAR(150) | — | judul rekomendasi | — |
| | recommendation_source | VARCHAR(255) | — | link sumber rekomendasi | — |
| | created_at | TIMESTAMP | DEFAULT NOW() | — | — |
| | resolved_at | TIMESTAMP | NULL | kalau gap sudah ditanganani | — |
| **recommendations** | id | BIGINT UNSIGNED | PK | auto-increment | Many: students (student_id FK) |
| | student_id | BIGINT UNSIGNED | FK | FK → users.id (role mahasiswa) | — |
| | type | ENUM('course','workshop','certification','practice-project','mentor') | — | jenis rekomendasi | — |
| | title | VARCHAR(150) | — | judul rekomendasi | — |
| | description | TEXT | — | deskripsi singkat | — |
| | priority | ENUM('high','medium','low') | DEFAULT 'medium' | — | — |
| | status | ENUM('pending','in-progress','completed','consumed') | DEFAULT 'pending' | — | — |
| | source | VARCHAR(255) | — | platform/link sumber | — |
| | consumed_at | TIMESTAMP | NULL | kalau user menandai sudah dikonsumsi | — |
| | created_at | TIMESTAMP | DEFAULT NOW() | — | — |
| **notifications** | id | BIGINT UNSIGNED | PK | auto-increment | Many: users (recipient) |
| | recipient_type | ENUM('student','company','campus') | — | tipe penerima | — |
| | recipient_id | BIGINT UNSIGNED | FK | FK → users.id (dari tipe tadi) | — |
| | type | ENUM('apply','match','gap','rec','eval','system') | — | jenis notifikasi | — |
| | content | TEXT | — | pesan notifikasi | — |
| | is_read | TINYINT(1) | DEFAULT 0 | 0=belum, 1=sudah | — |
| | created_at | TIMESTAMP | DEFAULT NOW() | — | — |
| **audit_logs** | id | BIGINT UNSIGNED | PK | auto-increment | — |
| | user_id | BIGINT UNSIGNED | FK | FK → users.id (yang melakukan action) | — |
| | action | ENUM('login','register','create_project','update_skill','apply_project','evaluate','etc') | — | jenis aksi | — |
| | entity_type | ENUM('user','student','company','project','skill','application','assessment','etc') | — | entitas yang diaffekta | — |
| | entity_id | BIGINT UNSIGNED | FK | ID entitas yang diubah | — |
| | old_value JSON | JSON | — | nilai sebelum perubahan (opsional) | — |
| | new_value JSON | JSON | — | nilai setelah perubahan (opsional) | — |
| | ip_address | VARCHAR(45) | — | IP client | — |
| | user_agent TEXT | — | User agent browser | — |
| | logged_at | TIMESTAMP | DEFAULT NOW() | — | — |

---

## 2. Relasi Utama (Diagram Ringkasan)

```text
users ───── student_profiles (1:1, FK user_id)
users ───── companies (1:1, FK user_id)
users ───── portfolios (1:N, FK student_id where role=mahasiswa)
users ───── certifications (1:N, FK student_id where role=mahasiswa)
users ───── applications (1:N, FK student_id)
users ───── assessments (1:N, FK student_id evaluated)
users ───── notifications (1:N, FK recipient_id)
users ───── audit_logs (1:N, FK user_id)

student_profiles ───── student_skills (1:N, FK student_id)
student_profiles ───── skill_gaps (1:N, FK student_id)
student_profiles ───── recommendations (1:N, FK student_id)

companies ───── projects (1:N, FK company_id)
companies ───── applications (1:N, FK company_id—via project)

projects ───── project_skills (1:N, FK project_id)
projects ───── applications (1:N, FK project_id)
projects ───── assessments (1:N, FK project_id)
projects ───── skill_gaps (1:N, FK project_id optional)

skills ───── student_skills (1:N, FK skill_id)
skills ───── project_skills (1:N, FK skill_id)
skills ───── skill_gaps (FK required_skill_id)
skills ───── recommendations (via skill target)

applications ───── assessments (1:1, FK project_id + student_id combo)
applications ───── skill_gaps (via project_id optional)

skill_gaps ───── recommendations (1:N, FK student_id + classification)

notifications ───── user role filter (recipient_type + recipient_id)
```

---

## 3. Index & Strategi Query

Indeks dibuat untuk field yang sering difilter/search dalam fitur kunci:

| Tabel | Field | Alasan Index |
|-------|-------|--------------|
| **users** | email | Unique constraint + login lookup |
| **users** | role | Filter per-role query (auth middleware) |
| **student_profiles** | program_studi | Filter student berdasarkan program |
| **student_profiles** | angkatan | Filter berdasarkan angkatan |
| **skills** | name | Search skill di dropdown taxonomy |
| **skills** | category | Filter kelompok skill (technical/soft/cert) |
| **student_skills** | student_id | Ambil skill satu mahasiswa |
| **student_skills** | skill_id + student_id | UNIQUE constraint + gap lookup |
| **project_skills** | project_id + skill_id | UNIQUE constraint + requirement lookup |
| **projects** | company_id | Ambil project perusahaan tertentu |
| **projects** | status | Filter project active/draft/closed |
| **projects** | match_score_threshold | Filter kandidat berdasarkan skor minimum |
| **applications** | student_id + project_id | Cek aplikasi duplikat |
| **applications** | status | Filter pending/accepted/rejected |
| **assessments** | project_id + student_id | Ambil evaluasi per project+mahasiswa |
| **skill_gaps** | student_id | Lihat gap keseluruhan mahasiswa |
| **skill_gaps** | required_skill_id + student_id | Cari gap spesifik skill |
| **recommendations** | student_id + status | Ambil rekomendasi belum dikonsumsi |
| **notifications** | recipient_type + recipient_id | Kirim notifikasi ke role tertentu |
| **audit_logs** | user_id + logged_at | Track aktivitas user |

**Catatan Index:**
- Gunakan `BTREE` index untuk range query (range filter level_required, gap_value).
- Gunakan `HASH` index untuk equality unique (email, npm, credential_id).
- Gabungan index (composite index) untuk query sering gabung: `project_skills (project_id, skill_id)`, `student_skills (student_id, skill_id)`.

---

## 4. Data Seed (Skill Taxonomy Awal)

Daftar skill dasar yang di-impor saat `npm run db:seed` atau `php artisan db:seed`. Daftar ini bisa diperbarui admin kampus melalui admin panel.

**Technical Skill (20 entry, TASK-030):**

| ID | Nama Skill | Kategori | Level Scale Default |
|---|------------|----------|---|
| 1 | React | technical | 100 |
| 2 | JavaScript | technical | 100 |
| 3 | TypeScript | technical | 100 |
| 4 | Node.js | technical | 100 |
| 5 | HTML/CSS | technical | 100 |
| 6 | Python | technical | 100 |
| 7 | Java | technical | 100 |
| 8 | PHP | technical | 100 |
| 9 | SQL | technical | 100 |
| 10 | Git | technical | 100 |
| 11 | Docker | technical | 100 |
| 12 | CI/CD | technical | 100 |
| 13 | API Development | technical | 100 |
| 14 | Software Testing | technical | 100 |
| 15 | Data Analysis | technical | 100 |
| 16 | Machine Learning | technical | 100 |
| 17 | Cybersecurity Basics | technical | 100 |
| 18 | UI/UX Design | technical | 100 |
| 19 | Figma | technical | 100 |
| 20 | Mobile Development | technical | 100 |

**Soft-skill (10 entry, TASK-030):**

| ID | Nama Skill | Kategori | Level Scale Default |
|---|------------|----------|---|
| 21 | Communication | soft-skill | 100 |
| 22 | Teamwork | soft-skill | 100 |
| 23 | Problem Solving | soft-skill | 100 |
| 24 | Time Management | soft-skill | 100 |
| 25 | Project Management | soft-skill | 100 |
| 26 | Design Thinking | soft-skill | 100 |
| 27 | Leadership | soft-skill | 100 |
| 28 | Critical Thinking | soft-skill | 100 |
| 29 | Creativity | soft-skill | 100 |
| 30 | Adaptability | soft-skill | 100 |

**Bonus:** Certification Management (`certification`, 100).

> **Catatan 2026-09-05 (TASK-030):** daftar di atas menggantikan daftar 20 entry campuran sebelumnya agar memenuhi acceptance criteria (minimal 20 teknis & 10 soft skill). Implementasi: `server/src/db/seed.js` (`INSERT OR IGNORE`, idempotent).

**Data seed cara kerja:**
- `npm run db:seed` akan INSERT INTO skills atas 31 entry (idempotent via `INSERT OR IGNORE`).
- Setiap skill memiliki `level_scale_default = 100` (batas maksimal proficience).
- Admin dapat menambah skill melalui UI admin panel jika butuh skill khusus industri.

---

## 5. Migrasi & Integritas Data

**Aturan Migrasi:**
1. Setiap perubahan schema harus melalui file migrasi terpisah (tidak langsung di-query production).
2. Migrasi harus backward-compatible: menambahkan field dengan `nullable` default NULL, bukan merusak data lama.
3. Migrasi Menambah tabel baru harus mencakup: field wajib, field opsional, index kunci, seed data minimal.
4. Pengurangan field hanya boleh jika fitur terkait sudah tidak digunakan dan sudah dihapus dari codebase.

**Integritas Data:**
- **Foreign Key Constraints:** Semua FK diimplementasikan dengan `ON DELETE RESTRICT` (tidak boleh hapus user yang masih punya data dependen) atau `ON DELETE CASCADE` untuk tabel child yang wajar (misal: hapus user → hapus profil mahasiswa & aplikasi & notifikasinya).
- **Unique Constraints:** Email, NPM, Credential ID harus UNIQUE. Aplikasi harus menangkap duplicate key error dan menampilkan pesan user-friendly.
- **Check Constraints:** Proficiency level 0–100, rating 1–5, status ENUM tetap sesuai daftar.
- **Soft Delete:** Semua tabel memiliki field `deleted_at`. Query utama selalu filter `WHERE deleted_at IS NULL` (melalui global scope atau view).
- **Audit Trail:** Setiap tindakan kritis (create/update/delete) harus mencatat ke tabel `audit_logs`. Middleware otomatis mencatat user_id, action, entity_type sebelum perubahan.

**Cara Migrasi dijalankan:**
1. `php artisan make:migration create_x_table --create=x` (atau seeder untuk seed data)
2. Edit file migrasi menambahkan field, index, FK sesuai sketch di atas.
3. `php artisan migrate` — apply ke database staging.
4. `php artisan db:seed` — populate seed data skill taxonomy.
5. Verifikasi di database dan API endpoint.

> **Catatan 2026-09-05 (TASK-002):** Proyek berjalan di stack Node.js + Express + SQLite. Perintah aktual: `npm run db:migrate` (`node server/db/migrate.js`) dan `npm run db:seed` (`node server/db/seed.js`).

---

## 6. [ASSUMPTION] Adaptasi SQLite (Stack Aktif Node/Express, 2026-09-05)

Sketsa tipe di Bagian 1 ditulis untuk PostgreSQL/MySQL. Implementasi SQLite (`better-sqlite3`) memetakan tipe sebagai berikut — relasi, unique constraint, index, dan semantik tidak berubah:

| Sketsa Dokumen | Implementasi SQLite |
|----------------|---------------------|
| `BIGINT UNSIGNED` (PK/FK) | `INTEGER` (PK autoincrement via `INTEGER PRIMARY KEY AUTOINCREMENT`) |
| `ENUM('a','b')` | `TEXT` + `CHECK (col IN ('a','b'))` |
| `JSON` | `TEXT` berisi JSON string (parse di application layer) |
| `YEAR` (angkatan) | `INTEGER` |
| `TINYINT(1)` boolean | `INTEGER` 0/1 + CHECK |
| `TIMESTAMP DEFAULT NOW()` | `TEXT DEFAULT (datetime('now'))` (ISO 8601 UTC) |
| `VARCHAR(n)` / `CHAR(8)` | `TEXT` + validasi panjang di application layer (`express-validator`) |

**Batasan yang diterima untuk MVP:** tanpa tipe ENUM native (diganti CHECK); tanpa `HASH`/`BTREE` index eksplisit (SQLite memakai B-tree untuk semua index); foreign key enforcement via `PRAGMA foreign_keys = ON` di connection. Migrasi ke PostgreSQL tetap dimungkinkan di masa depan tanpa mengubah kontrak API — keputusan migrasi adalah `[NEEDS DECISION]` pasca-MVP.

**Catatan 2026-09-05 (TASK-010, Phase 1 Auth):** implementasi menambah dua kolom di `users` di luar sketsa Bagian 1 — `failed_attempts INTEGER DEFAULT 0` dan `locked_until TEXT NULL` — untuk lockout login (QA TC-AUTH-005). Tabel baru `revoked_tokens (id, jti UNIQUE, user_id FK, expires_at, created_at)` mendukung invalidasi token saat logout (TASK-010). Lihat `server/src/db/migrations/001–003`.

**Catatan 2026-09-05 (TASK-020, Phase 2 Profile):** implementasi menambah kolom `logo TEXT NULL` di `companies` (di luar sketsa Bagian 1) agar upload foto profil perusahaan bisa disimpan, simetris dengan `student_profiles.foto_profile`. Registrasi otomatis membuat baris profil peran (`student_profiles` untuk mahasiswa, `companies` dengan `nama_perusahaan` = nama pendaftar untuk perusahaan). Lihat `server/src/db/migrations/004–005`.

**Catatan 2026-09-05 (TASK-030/031, Phase 3 Skill):** tabel `skills` + `student_skills` dibuat via `server/src/db/migrations/006–007` sesuai sketsa Bagian 1 (UNIQUE student+skill, CHECK level 0–100, CHECK source). Input level mendukung kategori (`beginner/intermediate/advanced` → 25/55/85, `[ASSUMPTION]` di `server/src/utils/proficiency.js`).

**Catatan 2026-09-05 (TASK-040/042, Phase 4 Marketplace):** tabel `projects` + `project_skills` + `applications` (minimal) dibuat via `server/src/db/migrations/008–010`. Tambahan dari sketsa: `projects.difficulty` (CHECK easy/medium/hard, NULL; untuk filter TASK-041) dan `projects.deleted_at` (soft-delete sesuai aturan Bagian 5). `applications` Phase 4 berisi kolom inti (status default pending, match_score NULL, cover_letter, portfolio_url); workflow ubah status + notifikasi menyusul Phase 5. Duplikat apply dicegah di application layer (blokir bila ada pending/accepted; re-apply setelah rejected diizinkan) — tanpa UNIQUE constraint.

**Catatan 2026-09-05 (TASK-051, Phase 5 Application):** tabel `notifications` dibuat via `server/src/db/migrations/011` persis sesuai sketsa Bagian 1 (tanpa tambahan kolom).

**Catatan 2026-09-05 (TASK-070, Phase 7 Skill Gap):** tabel `skill_gaps` dibuat via `server/src/db/migrations/012` sesuai sketsa; `student_skill_id` dan `recommendation_source` nullable (skill belum dimiliki / katalog Phase 8). Persist berupa snapshot: setiap analisis menghapus baris scope (student+project) lalu insert ulang dalam transaksi.

---