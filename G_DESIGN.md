---
title: "G_DESIGN.md — Global / System Design"
version: "1.0.0"
date: "2026-09-05"
status: "Approved"
---

# G_DESIGN.md — Global / System Design

## System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Web)                         │
│  - Student Dashboard                                       │
│  - Company Dashboard                                       │
│  - Campus Admin Dashboard                                  │
│  - Talent Matching UI                                      │
│  - Project Marketplace UI                                  │
│  - Profile & Skill Management                              │
│  - Notification Center                                     │
│  - Analytics Visualization                                 │
└─────────────────────▲─────────────────────▲───────────────┘
                      │                     │
                      │                     │
                      ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    API LAYER (REST JSON)                     │
│  - Auth Service (JWT, session management)                  │
│  - User Service (CRUD profile, role management)            │
│  - Skill Service (skill taxonomy, proficience, gap calc)   │
│  - Project Service (create, edit, view, filter)            │
│  - Matching Engine (talent match score calculation)         │
│  - Recommendation Engine (course/workshop/sertifikasi)     │
│  - Assessment Service (form, evaluasi, result)             │
│  - Notification Service (push, email, in-app)              │
│  - Analytics Service (data aggregation, visual data)       │
└─────────────────────▲─────────────────────▲───────────────┘
                      │                     │
                      │                     │
                      ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 APPLICATION LAYER                            │
│  - Business Logic                                          │
│  - Validation Rules                                        │
│  - Workflow Orchestration (matching, gap, recommendation)  │
│  - Inter-service Communication                             │
└─────────────────────▲─────────────────────▲───────────────┘
                      │                     │
                      │                     │
                      ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE (Relational)                     │
│  - Users                                                   │
│  - StudentProfiles                                         │
│  - Companies                                               │
│  - Projects                                                │
│  - Skills                                                  │
│  - StudentSkills                                           │
│  - Portfolios                                              │
│  - Certifications                                          │
│  - Applications                                            │
│  - Assessments                                             │
│  - ProjectEvaluations                                      │
│  - SkillGaps                                               │
│  - Recommendations                                         │
│  - Notifications                                           │
│  - AuditLogs                                               │
└─────────────────────────────────────────────────────────────┘
```

**Catatan:** Arsitektur di atas bersifat generik. Saat stack teknologi `[NEEDS DECISION]` diputuskan, akan divergensi ke microservices atau monolith sesuai keputusan.

---

## Architecture Principles

1. **Simple first** — Mulai dengan solusi terkompleks minimal yang memenuhi requirement MVP. Kompleksitas ditambahkan seiring dengan pengguna.
2. **Modular** — Setiap modul (Auth, Skill, Project, Matching) dapat dikembang-biakkan/digantikan tanpa merusak sistem keseluruhan.
3. **Maintainable** — Codebase dan dokumentasi harus mudah dipahami oleh pengembang baru. Convensi naming, folder structure, dan dokumentasi wajib disusun.
4. **Secure** — Data sensitif terproteksi, authentication/authorization implemented secara dalam-depth, audit log aktif.
5. **Scalable** — Arsitektur harus mampu menangani peningkatan user (baik horizontal maupun vertical).
6. **API-first** — Semua fitur diakses melalui API terstruktur; konsumen (frontend, mobile) tidak pernah langsung mengakses database.
7. **Role-based access** — Izin diakses berdasarkan role yang terkait (Mahasiswa/Perusahaan/Kampus/Dosen). Tiap role memiliki scope permission yang jelas.
8. **Data-driven** — Keputusan product dan teknis didasarkan pada data yang terstruktur, bukan asumsi semata.

---

## Main Modules

| Modul | Tanggung Jawab | Interaksi Utama |
|-------|----------------|-----------------|
| **Authentication** | Sistem login/register, manajemen session, password reset, RBAC initialization | Semua modul (entry point) |
| **User Management** | CRUD user, update profil, verifikasi email, status aktif/non-aktif | User Profile, Skill, Project |
| **Student Talent** | Data mahasiswa, profil kampus, status aktif, data kontak | Skill, Project Application, Matching |
| **Skill Management** | Taxonomy skill, daftar skill dasar, kategori, level, update | StudentProfile, ProjectSkill, Gap Analysis |
| **Project Marketplace** | CRUD project perusahaan, filter cari, status project, verifikasi | Company, Student (browse/apply) |
| **Matching Engine** | Menghitung match score, meranking kandidat, detail per-fit | Student (lihat match), Company (review candidate) |
| **Skill Gap Engine** | Hitung gap required vs current, klasifikasi, prioritasi | Student (lihat gap), Recommendation |
| **Recommendation Engine** | Generate rekomendasi course/workshop/certification | Student (lihat rekomendasi), Dosen (follow-up) |
| **Assessment** | Form evaluasi project, skor numerik, catatan, arsip | Company (memberi eval), Mahasiswa (terima eval) |
| **Evaluation** | Review project & mahasiswa, rating, feedback terstruktur | Company & Mahasiswa berdua |
| **Notification** | Push/email/notifikasi in-app, alarm deadline, rekomendasi | Semua modul (trigger) |
| **Analytics** | Visualisasi data, dashboard per role, industri trend, skill gap agregat | Kampus/Admin (laporan), Semua (insight) |

---

## Data Flow

### Student Flow

```text
Register
    ↓
Profile creation (bio, foto, kontak)
    ↓
Skill Assessment (input skill + level, atau import dari course)
    ↓
Skill Profile (daftar skill beserta proficiency)
    ↓
Browse Project (filter by skill, kategori, difficulty)
    ↓
Talent Matching (system hitung match score per project)
    ↓
Apply Project (kirim application + portfolio link)
    ↓
Project (jalankan project sesuai agreement)
    ↓
Evaluation (company memberi skor + catatan)
    ↓
Skill Update (system update skill level berdasarkan evaluasi)
    ↓
Recommendation (system beri rekomendasi kursus berdasarkan gap terdeteksi)
```

### Company Flow

```text
Register
    ↓
Company Profile (deskripsi, industri, size, kontakt)
    ↓
Create Project (judul, deskripsi, skill requirement, level, deadline)
    ↓
Define Skill Requirement (daftar skill + level minimum yang dibutuhkan)
    ↓
Receive Candidates (system tampilkan kandidat terurut match score)
    ↓
Review Talent Match (lihat detail skill overlap, portfolio)
    ↓
Select Student (pilih mahasiswa untuk project)
    ↓
Evaluate Project (form evaluasi setelah project selesai)
```

### Campus Flow

```text
Manage Talent (CRUD mahasiswa, filter berdasarkan skill, status)
    ↓
Monitor Skills (visualisasi skill distribution mahasiswa seluruh kampus)
    ↓
Analyze Skill Gap (identifikasi gap antara skill yang ada vs butuh industri)
    ↓
Analyze Industry Demand (trend skill apa yang dicari perusahaan)
    ↓
Create Development Program (buat track kursus/workshop untuk menutup gap)
```

---

## Database Design

Entitas utama beserta atribut inti (tidak termasuk schema SQL DDL penuh, melainkan definisi entitas & relasi):

| Entitas | Atribut Kunci | Relasi |
|---------|---------------|--------|
| **User** | id PK, name, email, password_hash, role, created_at, updated_at | 1:1 StudentProfile; 1:many Applications; 1:many Assessments |
| **StudentProfile** | id PK, user_id FK, npm, program_studi,angkatan, foto_portfolio, bio | Many:User; Many:Skill (via StudentSkill) |
| **Company** | id PK, user_id FK, nama_perusahaan, industri, size, deskripsi, verified_status | Many:User; Many:Project |
| **Project** | id PK, company_id FK, judul, deskripsi, deadline, status, created_at | Many:Company; Many:Application; Many:StudentSkill (via ProjectSkill) |
| **Skill** | id PK, name, category, description, level_scale_default | Many:StudentSkill; Many:ProjectSkill |
| **StudentSkill** | id PK, student_id FK, skill_id FK, proficiency_level, source (course/cert/experience), updated_at | Many:Student; Many:Skill; Composite PK (student+skill) |
| **ProjectSkill** | id PK, project_id FK, skill_id FK, level_required | Many:Project; Many:Skill; Composite PK (project+skill) |
| **Portfolio** | id PK, student_id FK, title, description, file_url, media_type, created_at | Many:Student |
| **Certification** | id PK, student_id FK, name, issuing_organization, credential_id, expiry_date, url_verifikasi | Many:Student |
| **Application** | id PK, student_id FK, project_id FK, status (pending/accepted/rejected), applied_at, cover_letter | Many:Student; Many:Project |
| **Assessment** | id PK, project_id FK, student_id FK, evaluator_role (company/dosen), form_data, score_numeric, comments, assessed_at | Many:Project; Many:Student |
| **ProjectEvaluation** | id PK, assessment_id FK, overall_rating (1-5), category_rating (skill, communication, punctuality), feedback_text, published_status | 1:Assessment |
| **SkillGap** | id PK, student_id FK, project_id FK (opsional), required_skill_id FK, student_skill_id FK, gap_value, classification, recommendation, created_at, resolved_at | Many:Student; Many:Project; Many:Skill |
| **Recommendation** | id PK, student_id FK, type (course/workshop/certification/practice/mentor), title, description, source, priority, status (pending/delivered/completed), created_at, consumed_at | Many:Student |
| **Notification** | id PK, recipient_type (student/company/campus), recipient_id, type (apply, match, gap, rec, eval), content, is_read, created_at | Many:User |
| **AuditLog** | id PK, user_id FK, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent, logged_at | Many:User |

**Relasi utama (Ringkasan):**

- **User 1:1 StudentProfile** — Setiap user yang terdaftar memiliki satu profil mahasiswa (jika role mahasiswa).
- **Student 1:N StudentSkill** — Satu mahasiswa memiliki banyak skill dengan proficiency level.
- **Skill 1:N StudentSkill / 1:N ProjectSkill** — Satu skill bisa dimiliki banyak mahasiswa atau digunakan banyak project.
- **Project 1:N Application** — Satu project menerima banyak aplikasi mahasiswa.
- **Project 1:N ProjectSkill** — Satu project memerlukan banyak skill.
- **Project 1:N Assessment / ProjectEvaluation** — Satu project memiliki evaluasi assess.
- **Student 1:N Portfolio / Certification** — Mahasiswa bisa memiliki multiple portfolio item & sertifikat.
- **Skill -> Skill Gap / Recommendation** — Skill menjadi titik referensi untuk analisis gap dan rekomendasi pembelajaran.

**Catatan database:**
- Gunakan timestamp `created_at` dan `updated_at` di setiap tabel.
- Implementasi `soft-delete` (field `is_deleted` atau `deleted_at`) untuk data yang pernah aktif.
- Indeks (`index`) pada field yang sering difilter/search: `skill.name`, `student.program_studi`, `project.company_id`, `application.status`, `skillgap.gap_value`.
- Unique constraint pada `User.email`, `StudentProfile.npm`, `Certification.credential_id`.
- Relasi M:N antara Student-Skill (via StudentSkill) dan Project-Skill (via ProjectSkill) memungkinkan fleksibilitas taxonomy skill.

---

## Security

| Area | Implementasi Minimal |
|------|----------------------|
| **Authentication** | Email + password (hash bcrypt minimal 10 rounds). Opsi sosial (Google/GitHub) sebagai tambahan. JWT token untuk API session. |
| **Authorization** | RBAC dengan role: Mahasiswa, Perusahaan, Kampus/Admin, Dosen. Permisi per-modul dicek di setiap endpoint. |
| **Password Security** | Minimal 8 karakter, kombinasi huruf/angka/special, policy reset password via email link, account lockout setelah 3x gagal login. |
| **Input Validation** | Server-side validation untuk semua input form. Whitelist field, sanitize HTML output, reject payload tidak sesuai schema. |
| **API Security** | Rate limiting per IP/user, CORS konfigurasiredefined per environment, endpoint publik hanya untuk registrasi & login, endpoint lain membutuhkan token valid. |
| **Data Privacy** | Data sensitif (email, NPM) tidak ter-exposed di UI publik. Anonymisasi data pada analytics raport. |
| **File Upload Security** | Validasi tipe file (hanya image/pdf), ukuran max 5MB, scan virus otomatis, simpan ke bucket dengan nama random, path tidak ter-expose di URL langsung. |
| **Audit Log** | Setiap tindakan kritis (login, create/project, update skill, delete record) dicatat dengan user_id, action, timestamp, dan alasan perubahan. Log disimpan minimal 90 hari. |
| **Session Management** | Token expiry 24 jam (refreshable), logout dari semua perangkat, invalidasi token saat role berubah. |

---