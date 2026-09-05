---
title: "TECH_STACK.md — Technical Stack MVP Campus Industry Talent Hub"
version: "2.0.0"
date: "2026-09-05"
status: "Superseded (keputusan final: Node.js + Express + SQLite, lihat Bagian 17)"
changelog: "2026-09-05 v2.0.0 — TASK-002: keputusan stack final Node/Express/SQLite; rekomendasi Laravel ditandai superseded"
---

# TECH_STACK.md — Technical Stack MVP Campus Industry Talent Hub

> **KEPUTUSAN FINAL STACK (2026-09-05, TASK-002):** Proyek ini dibangun dengan **Node.js 24 + Express 5 + SQLite (better-sqlite3) + JWT + bcrypt**. Rekomendasi Laravel/PHP/PostgreSQL di bawah (Bagian 1–16) berstatus **SUPERSEDED** — dipertahankan sebagai arsip analisis alternatif. Lihat **Bagian 17** untuk stack aktif.

**Status:** Recommended for MVP deployment  
**Last reviewed:** Cross-document review dari PRD.md, G_DESIGN.md, QA.md, database.md, api.md, TASK.md  
**Decision authority:** Product owner + Tech lead review  

---

## 1. Overview

Stack teknologi dipilih berdasarkan kriteri:
- **Simplicity:** Minimal decision fatigue, fitur built-in menutup requirement mayor
- **Maintainability:** Codebase one language, konvensi standar, documentation kaya
- **Developer Experience:** Setup cepat, learning curve rendah, community support kuat
- **Scalability:** Bisa scale horizontal tetapi monolith MVP sufficient untuk launch
- **Security:** Built-in fitur dari framework, terintegrasi dengan requirement keamanan
- **Low Development Complexity:** MVP target 4-6 minggu development, bukan komponen dari nol

Semua komponen dipilih untuk bekerja secara seamless bersama, minimal konfigurasi tambahan.

---

## 2. Frontend

### Teknologi: **PHP 8.2 + Laravel Livewire 3 + Blade Templates**

**Alasan Pemilihan:**
- Full-stack dalam satu bahasa (PHP), tidak perlu berpindah antara bahasa frontend/backend
- Livewire memberikan reaktivitas (component state, AJAX) tanpa menulis JavaScript berat
- Blade templates SEO-friendly dan performa baik untuk dashboard/admin pages
- Komponen reusable: navbar, card, table, form sudah standar Laravel
- Belum perlu decision tentang state management library (Redux/context) untuk MVP

**Fitur yang Dikapitalkan:**
- Server-side rendering untuk halaman utama (dashboard, project list, profil)
- Live reaktivitas untuk: skill gap updates, notifikasi real-time, match score update
- Form validation live tanpa menulis JS validasi sendiri

**Alternatif (jika butuh interaksi kompleks):**
- **React 18 + Vite** + Laravel API → More interactive, better untuk complex UI/animations
- **Vue 3** + Inertia.js → Single-page app feel tanpa switch framework

**Trade-off:**
- **Pros:** 1 codebase, faster MVP development, team PHP familiarity (yang besar di industri)
- **Cons:** Kurang interaktif daripada SPA modern, fitur complex UI butuh additional JS

**MVP Need:** **Yes** — Semua fitur UI yang dibutuhkan (dashboard, form, table, card) bisa dikerjakan dengan Livewire tanpa menulis JS berat.

---

## 3. Backend

### Teknologi: **PHP 8.2 + Laravel 10.x**

**Alasan Pemilihan:**
- **Batteries-included framework:** Auth scaffolding (Breeze), ORM (Eloquent), RBAC (Spatie), Queue, Caching, Testing (Pest) semua bundled
- Eloquent ORM sangat produktif untuk relasional database 17 tabel dengan many-to-many relationships
- Spatie Laravel Permission langsung menerapkan RBAC 4 role: Mahasiswa/Perusahaan/Kampus/Admin
- Laravel conventions → decision fatigue minimal ("Convention over configuration")
- PHP 8.2 menambahkan fitur: named arguments, readonly properties, improved type system

**Fitur yang Dikapitalkan:**
- Authentication scaffolding dalam 5 menit via Laravel Breeze
- API resources konsisten sesuai api.md specification
- Queue processing untuk email notifikasi, background tasks
- Cache system untuk performance match score calculation
- Event system untuk skill gap notification trigger

**Alternatif:**
- **Node.js + Express** → Full JavaScript stack, tapi butuh konfigurasi auth RBAC dari nol, library tambahan
- **Python + FastAPI** → Modern, tapi butuh bibliotek tambahan untuk RBAC, auth scaffolding yang setara Laravel Breeze

**Trade-off:**
- **Pros:** Productivity terlama untuk MVP, fitur built-in menutup 80% requirement tanpa library ketiga
- **Cons:** Fleksibilitas kurang dari Node.js/Python asinkron untuk fitur real-time heavy

**MVP Need:** **Yes** — Kebutuhan utama (auth, skill, project, matching, gap, recommendation) langsung support oleh Laravel features.

---

## 4. Database

### Teknologi: **PostgreSQL 15**

**Alasan Pemilihan:**
- Relasional strength untuk many-to-many relationships yang krusial: Student↔Skill, Project↔Skill
- JSON column type fleksibilitas jika butuh field tambahan tanpa migration
- Advanced indexing untuk query performa: match score calculation, skill gap aggregation
- Migrasi terintegrasi dengan Laravel's migration system
- Open source, free hosting options (ElephantSQL, Supabase free tier, AWS RDS)
- Better than MySQL untuk complex analytics queries (skill distribution heatmap, industry demand tren)

**Fitur yang Dikapitalkan:**
- 17 tabel sudah desain di database.md
- Soft-delete di setiap tabel (global scope)
- Enum untuk classification (skill gap, status project, role)
- Index strategis: `student_skills (student_id, skill_id)`, `project_skills (project_id, skill_id)`, `skill_gaps (student_id, required_skill_id)`
- Foreign key constraints dengan ON DELETE RESTRICT/CASCADE sesuai kebutuhan

**Alternatif:**
- **MySQL 8.0** → Kompatible, tapi fitur JSON dan query performance kurang dari PostgreSQL untuk kasus ini
- **SQLite** → Untuk prototype sangat kecil, tapi tidak support concurrent user yang baik
- **MongoDB** → Document-store, loss relasional integrity untuk kasus skill gap calculation

**Trade-off:**
- **Pros:** Akurasi data untuk skill tracking, query performa untuk analytics, migrasi Laravel seamles
- **Cons:** Setup sedikit lebih kompleks dari SQLite

**MVP Need:** **Yes** — Database schema sudah desain total, PostgreSQL adalah pilihan terbaik untuk integritas data yang dibutuhkan.

---

## 5. ORM

### Teknologi: **Laravel Eloquent ORM** (bunda dengan Laravel)

**Alasan Pemilihan:**
- Active Record pattern yang familiar bagi pengembang PHP
- Relasi mudah didefinisikan: `belongsTo`, `hasMany`, `belongsToMany` (untuk M:N Student-Skill, Project-Skill)
- Mutator/Accessor untuk formatasi nilai proficiency level (0-100 → kategori)
- Soft-delete global scope dengan `deleteAt` filter otomatis di query
- Carbon integration untuk tanggal deadline, expiry_date
- Query builder fallback jika butuh query kompleks di luar Eloquent capability

**Fitur yang Dikapitalkan:**
- Model untuk semua 17 entity (User, StudentProfile, Company, Project, Skill, StudentSkill, ProjectSkill, dll)
- Relasi: `user->studentProfile`, `project->projectSkills`, `student->studentSkills`
- Accessor: `getProfitabilityAttribute()` mengubah 85 menjadi "Sangat Kuat"
- Scope: `ActiveScope`, `PendingScope` untuk filter query umum

**Alternatif:**
- **Prisma ORM** → Type-safe, auto-documentation, tapi butuh setup tambahan di Laravel (adapter)
- **SQLAlchemy** (Python) → Jika stack backend berubah ke Python

**Trade-off:**
- **Pros:** Kurangi dependency count, langsung berjalan dengan Laravel install, productivity tinggi untuk relasional data
- **Cons:** Kurang type-safety dibanding Prisma, tapi coverage MVP enough

**MVP Need:** **Yes** — Mendukung seluruh relasi database yang dibutuhkan fitur MVP.

---

## 6. Authentication

### Teknologi: **Laravel Breeze (web) + Sanctum (API tokens)**

**Alasan Pemilihan:**
- Laravel Breeze: Scaffold login/register, email verification, password reset dalam 5 menit
- Blade components dan Livewire components untuk UI auth
- Sanctum: API tokens untuk front-end aplikasi (jika butuh token-based API)
- Session management otomatis, cookie handling secure
- Password hashing otomatis dengan bcrypt (atau argon2 di PHP 8.2)
- Test case sudah generate oleh Breeze (`pest.php`)

**Fitur yang Dikapitalkan:**
- Halaman login/register standar
- Email verification middleware
- Password reset flow
- API token untuk endpoints yang butuh auth (axios header)
- "Remember me" functionality
- Social login extension (Google) jika butuh fase 2

**Alternatif:**
- **Laravel Passport** → OAuth2 server, overkill untuk MVP (cocokkan platform multi-client)
- **Auth custom dari nol** → Security risk, development time tinggi

**Trade-off:**
- **Pros:** Fastest implementasi, coverage fitur Must Have auth, community tested
- **Cons:** Tidak fleksibel untuk auth protocol kompleks (OAuth2, SAML)

**MVP Need:** **Yes** — Kritis, fitur Must Have pertama yang diimplementasikan.

---

## 7. Authorization

### Teknologi: **Spatie Laravel Permission 5.x**

**Alasan Pemilihan:**
- Role & permission management yang mature, sudah digunakan puluhan ribuan aplikasi Laravel
- Definisi role 4: Mahasiswa, Perusahaan, Kampus/Admin langsung bisa didefinisikan di database seeder
- Menetapkan boleh apa untuk role mana (gates, policies)
- Cacheable permissions performa baik
- Integration dengan Laravel's gates & policies seamles

**Fitur yang Dikapitalkan:**
- Role enumeration: `student`, `company`, `admin`, `super-admin` (opsional)
- Permission: `view-dashboard`, `create-project`, `evaluate-student`, `manage-skills`, dll
- Menetapkan butang navigasi berdasarkan role di sidebar/navbar
- Proteksi endpoint API berdasarkan role

**Alternatif:**
- RBAC custom dari nol → Full control tapi development time tinggi, risk security bugs tinggi
- Acl libraries lain → Fitur kurang mature dari Spatie

**Trade-off:**
- **Pros:** Sudah teruji, fitur granular permission, kurangi risk security bugs untuk role-based access
- **Cons:** Konfigurasi awal enumerasi role dan permission

**MVP Need:** **Yes** — Kritis untuk memastikan mahasiswa tidak bisa akses fitur perusahaan dan sebaliknya.

---

## 8. File Storage

### Teknologi: **Laravel Local Storage (spesifikasi S3 transisi nanti)**

**Alasan Pemilihan:**
- Laravel File System abstraction: konfigurasi lokal development, S3 production dengan perubahan satu baris di `config/filesystems.php`
- Validasi tipe file (image/pdf) dan ukuran (max 5MB) sesuai G_DESIGN security requirement
- Store di lokal development (folder `storage/app/public`), symlink ke `public`
- CDN ready jika butuh optimization nanti
- Cost terendah untuk MVP (hosting lokal vs cloud storage cost per GB)

**Fitur yang Dikapitalkan:**
- Portfolio upload mahasiswa dengan validasi tipe/ukuran
- File path terstruktur: `portfolios/{student_id}/{timestamp}_{originalname}`
- File URL generation untuk tampilan di frontend
- Backup strategy: lokal development, cloud storage produksi

**Alternatif:**
- **Cloudinary** → Service pihak ketiga, fitur canggih (transformasi, optimization) tapi add dependency luar + cost subscription
- **Direct S3 upload dari frontend** → Kurangi backend responsibility tapi kurangi control di server

**Trade-off:**
- **Pros:** Cost terendah untuk MVP, control penuh di server, integrate seamles dengan rest stack
- **Cons:** Setup konfigurasi S3 di produksi perobut, tapi bisa ditunda ke fase 2

**MVP Need:** **Yes** — Portfolio upload requirement Must Have, local storage development cukup hingga launch.

---

## 9. API Architecture

### Teknologi: **Laravel RESTful Resources + API Routes**

**Alasan Pemilihan:**
- API Resources format response JSON konsisten sesuai spec api.md
- API Routes grouping (`api.php` routes file) dengan prefix `/api/v1`
- Rate limiting built-in per endpoint/user
- Rate limit konfigurasi: 60 request/menit per IP, 30 per authenticated user
- Request validation lewat Form Request classes
- Response format sesuai `{ success: boolean, data: {}, message: string, errors: [] }`

**Fitur yang Dikapitalkan:**
- Endpoint RESTful untuk: auth, users, students, companies, projects, matching, gap, recommendations, assessments, notifications
- Response format konsisten seluruh endpoint
- API versioning consideration di rute (`/v1/`, `/v2/`)
- Documentation otomatik melalui kode (tidak butuh tool eksternal untuk MVP)

**Alternatif:**
- **Lumen** (Laravel framework tanpa Ornstein) → Lighter tapi kurangi fitur bawaan yang kita butuhkan
- **Raw PHP framework** → Dari nol, butuh build semuanya

**Trade-off:**
- **Pros:** Response format sudah konsisten dengan api.md spec, less time formatting JSON manually
- **Cons:** Kurang fleksibilitas daripada Node.js Express middleware pipeline

**MVP Need:** **Yes** — Setiap endpoint harus follow contract API, Laravel Resources membuatkan ini mudah.

---

## 10. Validation

### Teknologi: **Laravel Form Requests + Validation Rules**

**Alasan Pemilihan:**
- Validasi terpisah dari controller logic, reusable across API/UI
- Error messages konsisten dengan format error di api.md
- Client-side validation otomatis via Laravel Validation JavaScript (tersedia bila butuh)
- Custom rules untuk validasi unik (cek email sudah terdaftar, skill sudah di-taxaonomy)
- Rule bawaan: `required`, `email`, `min`, `max`, `exists:table,column`, `mimes`, `max:fileSize`

**Fitur yang Dikapitalkan:**
- Form Request classes untuk setiap endpoint kritis: Register, Login, CreateProject, ApplyProject, EvaluationForm
- Validasi lintas: pastikan skill existence di taxonomy sebelum create StudentSkill
- Validasi cross-field: password confirmation, age validation
- Error response format: `{ message: "...", errors: [{ field: "...", message: "..." }] }`

**Alternatif:**
- **Joi** (Node.js) → Validasi powerful tapi butuh setup jika stack berubah ke Node
- **Manual validation di controller** → Code duplication, error handling tidak konsisten

**Trade-off:**
- **Pros:** Integrasi penuh dengan stack, validasi both server-side, kurangi code duplication
- **Cons:** Learning curve bentuk Form Request class tapi sangat produktif setelah konfigurasikan

**MVP Need:** **Yes** — Security requirement input validation wajib, Laravel Forms Requests mempermudah.

---

## 11. Testing

### Teknologi: **PestPHP + Laravel Dusk (opsional)**

**Alasan Pemilihan:**
- PestPHP: PHP testing framework modern, syntax yang expressif dan readable
- Test autodiscovery, minimal config file (`pest.php` hanya baris sedikit)
- Fitur: unit tests, integration tests, browser tests (Dusk untuk E2E)
- Compatible dengan PHPUnit assertions yang sudah ada
- CI/CD seamles dengan GitHub Actions (`php artisan test` atau `pest`)
- Coverage reporting, test ID yang terstruktur

**Fitur yang Dikapitalkan:**
- Unit test untuk fungsi hitung match score, gap calculation
- Integration test untuk alur end-to-end: register → skill add → project apply → evaluation
- Browser test untuk kritis: login flow, register flow, form submission
- Test case merujuk ke TASK.md acceptance criteria (seperti QA.md permintaan)
- Pest PHP faker data generator untuk test data

**Alternatif:**
- **PHPUnit** (standar de facto) → Masih valid, tapi syntax kurang expressif dari PestPHP
- **Jest** (jika stack berubah ke Node.js) → Masih valid untuk JavaScript testing

**Trade-off:**
- **Pros:** Productivity testing higher, syntax lebih readable, still compatible dengan PHPUnit
- **Cons:** Butuh PHP environment, tapi sudah menjadi standard PHP testing

**MVP Need:** **Yes** — Testing strategy sudah didefinisikan di QA.md, PestPHP paling produktif untuk coverage target.

---

## 12. Deployment

### Teknologi: **Laravel Forge** atau **VPS dengan ForgeKit**

**Alasan Pemilihan:**
- Laravel Forge: One-click deployment ke server (DigitalOcean, Linode, Vultr)
- Nginx + PHP-FPM konfigurasi teroptimalkan otomatis
- Free SSL (Let's Encrypt) dalam 1 klik
- Queue, scheduler setup dalam 10 menit
- Database migration handling
- Monitoring basic included (server health, uptime)

**Fitur yang Dikapitalkan:**
- Deploy aplikasi Laravel ke production dalam 15 menit
- SSL certificate otomatis, HTTPS enforced
- Queue worker setup untuk email notifikasi
- Cron job scheduler untuk maintenance tasks
- Database backup scheduling

**Alternatif:**
- **Shared hosting** → Terbatas fitur (tidak support queue, limited PHP version, tidak recommend)
- **Docker deployment** → Full control tapi butuh DevOps knowledge, setup time tinggi untuk MVP
- **Heroku/PHP Heroku** → Costly untuk scale yang dibutuhkan, lock-in vendor

**Trade-off:**
- **Pros:** Get application live fast tanpa micromanage server ops, murah ($5-20/bulan)
- **Cons:** Kurangi fleksibilitas dibanding VPS manual, tapi untuk MVP sufficiently

**MVP Need:** **Yes** — Get application live fast tanpa micromanage server infrastructure.

---

## 13. Monitoring

### Teknologi: **Laravel Telescope + Sentry (free tier)**

**Alasan Pemilihan:**
- Laravel Telescope: Debugging request, queries, jobs, dalam development environment
- ErrorTracking (Sentry): Production monitoring error tracking, free tier tersedia
- Log, breadcrumbs, performance metrics (response time, throughput)
- Integrasi seamles dengan Laravel aplikasi (`Telescope::route(...)`)
- Alert email jika error critical muncul
- Visibilitas tanpa production cost awawal

**Fitur yang Dikapitalkan:**
- Development: Melacak request yang lambat, query N+1, job yang gagal
- Production: Error tracking, stack trace, user context, frequency tracking
- Performance monitoring: response time per endpoint, throughput per hari
- User feedback loop: report bug dari aplikasi ke dashboard admin

**Alternatif:**
- **New Relic** → Powerful tapi cost awawal untuk MVP, fitur overkill
- **Log manual** → Tidak direkomendasikan, susah dipelacak dan di-analyze

**Trade-off:**
- **Pros:** Insight development tanpa production cost awawal, monitoring error wajib untuk user experience
- **Cons:** Butuh konfigurasi awal, tapi free tier mencakup kebutuhan MVP

**MVP Need:** **Yes** — Quality assurance, visibility ke production issues after launch.

---

## 14. Development Workflow

### Alur Kerja Tim (Single Developer atau Small Tim):

1. **Setup Environment:**
   - `composer create-project laravel/laravel .` (Laravel 10)
   - `php artisan key:generate`
   - `composer require laravel/breeze --dev` lalu `php artisan breeze:install`
   - `composer require spatie/laravel-permission`
   - `npm install` (untuk asset compilation, Livewire dependencies)

2. **Database Setup:**
   - Konfigurasi `.env` database (PostgreSQL connection)
   - `php artisan migrate` — apply semua migrasi dari database.md
   - `php artisan db:seed` — populate skill taxonomy seed data

3. **Fitur Implementation (berdasarkan TASK.md Phase 0-12):**
   - Setiap task di-TASK.md memiliki acceptance criteria yang testable
   - Setiap fitur memiliki unit test (PestPHP) sebelum didefinisikan DONE
   - Code review antar sesi (wajib 1 reviewer selain pengirim)

4. **Deployment Pipeline:**
   - Git repository dengan branch strategy (main, develop, feature/*)
   - Laravel Forge auto-deploy dari branch main ke production
   - Tes menjalankan `php artisan test` sebelum merge
   - Monitoring diasetel setelah deploy

---

## 15. Stack Decision Rationale Summary

| Kriteri | Keputusan | Alasan Utama |
|---------|-----------|--------------|
| **Simplicity** | Laravel monolith | Fitur built-in menutup mayoritas requirement, minimal library ketiga |
| **Maintainability** | PHP + Eloquent + Spatie | Codebase satu bahasa, konvensi standar, developer bisa onboard cepat |
| **Developer Experience** | PHP 8.2 + Laravel | Ecosystem terdocumentasi, community besar, learning curve rendah |
| **Scalability** | PostgreSQL + Laravel | Bisa scale horizontal tetapi monolith MVP sufficient untuk launch traffic |
| **Security** | Laravel built-in + Spatie | Password hashing, CSRF, RBAC, rate limit semua sudah implemented, tidak butuh custom dari nol |
| **Low Development Complexity** | 4-6 minggu MVP | Target bisa dicapai dengan tim satu full-stack PHP developer |

### Mengapa Bukan Stack Lain:

| Stack | Alasan Ditinggal |
|-------|------------------|
| Node.js + Express | Butuh konfigurasi auth RBAC dari nol, kompleksitas setup tinggi untuk timeline MVP |
| Python + FastAPI | Ecosystem file upload management + RBAC library kurang matur dari Laravel untuk MVP |
| Ruby on Rails | Meskipun produktif, tim tidak punya experience Ruby, switching cost terlalu tinggi |
| MongoDB | Loss relasional integrity untuk skill gap calculation dan analytics kompleks |

### Migrasi ke Produksi:

1. **Tahap 1 (MVP):** Local development + PostgreSQL local + Local file storage
2. **Tahap 2 (Launch):** Deploy ke VPS via Laravel Forge + PostgreSQL production + S3 file storage konfigurasi
3. **Tahap 3 (Scale):** Load balancing, caching layer (Redis), CDN untuk file assets jika traffic meningkat

---

## 16. [NEEDS DECISION] Items yang Masih Dibutuhkan Sebelum Stack Final

Meskipun stack direkomendasikan, berikut [NEEDS DECISION] yang masih memeriksa konfirmasi sebelum pengembangan dimulai:

1. **Konfirmasi pengembang:** Tim memiliki skill PHP 8.2 + Laravel experience, atau butuh onboard training?
2. **Pilihan database hosting:** PostgreSQL lokal development, atau langsung ke cloud (ElephantSQL, Supabase, AWS RDS)?
3. **Konfigurasi S3:** Apa waktu migrasi ke S3 untuk file portfolio, atau tetap lokal selama MVP?
4. **Pilihan deployment:** Laravel Forge, atau VPS manual dengan script deploy sendiri?
5. **Pilihan testing framework:** PestPHP dipakai, atau team memihak PHPUnit?

Setelah [NEEDS DECISION] ini dikonfirmasi, stack teknologi siap digunakan untuk pengembangan MVP Campus Industry Talent Hub.

> **Catatan 2026-09-05 (TASK-002):** Bagian 1–16 di atas BERSTATUS SUPERSEDED. Lihat Bagian 17 untuk stack aktif.

---

## 17. Stack Aktif (Keputusan Final 2026-09-05, TASK-002)

**Alasan keputusan:** PHP/Composer/PostgreSQL tidak tersedia di lingkungan pengembangan; dependensi Node.js (express, jsonwebtoken, bcrypt, better-sqlite3, express-rate-limit, express-validator, passport) sudah terpasang di repo; `api.md` netral-stack dan contoh base URL dev-nya (`http://localhost:3000/api/v1`) cocok dengan Express.

| Lapisan | Teknologi Aktif |
|---------|-----------------|
| Runtime / Backend | Node.js 24 + Express 5 |
| Database | SQLite via `better-sqlite3` (file `server/data/app.db`) |
| Auth | JWT (`jsonwebtoken`), hash bcrypt (10 rounds), rate limit (`express-rate-limit`) |
| Validasi | `express-validator` |
| Session | `express-session` (+ `passport`/`passport-local` tersedia bila dibutuhkan) |
| Testing | Jest (`npm test`, pola `tests/**/*.test.js`) |
| CI | GitHub Actions (`.github/workflows/ci.yml`): setup-node 24 → `npm ci` → `npm test` |
| File upload | Local storage development (S3 `[NEEDS DECISION]` saat deploy) |
| Frontend | `[NEEDS DECISION]` — default yang diusulkan: EJS server-rendered dalam codebase Express; dikonfirmasi ulang saat mulai Phase 2 |

**Adaptasi database (SQLite vs skema PostgreSQL di database.md):** ENUM → TEXT + CHECK constraint; JSON → TEXT (JSON string); BIGINT UNSIGNED → INTEGER; YEAR → INTEGER; TIMESTAMP → TEXT (ISO 8601) dengan DEFAULT `(datetime('now'))`. Relasi, unique constraint, dan index tetap sama. Tercatat sebagai `[ASSUMPTION]` di database.md Bagian 6.