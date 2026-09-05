# Campus Industry Talent Hub

Platform terpusat yang menghubungkan kebutuhan proyek nyata industri dengan mahasiswa/dosen kampus yang memiliki kompetensi relevan, sekaligus membangun inteligensi kompetensi mahasiswa melalui pengalaman project real.

## Tech Stack (MVP)

- **Runtime**: Node.js 24 + Express 5
- **Database**: SQLite (better-sqlite3) — adaptasi dari schema PostgreSQL
- **Auth**: JWT (jsonwebtoken) + bcrypt
- **Validation**: express-validator
- **Rate Limiting**: express-rate-limit
- **Session**: express-session
- **Testing**: Jest

## Struktur Repo

```
campus-industry-talent-hub/
├── .github/workflows/ci.yml    # GitHub Actions CI
├── docs/                       # Dokumentasi utama (di root juga)
│   ├── PRD.md                  # Product Requirements Document
│   ├── G_DESIGN.md             # Global System Design
│   ├── DESIGN.md               # UI/UX Design Specification
│   ├── TASK.md                 # Development Roadmap
│   ├── QA.md                   # Quality Assurance Plan
│   ├── AGENTS.md               # AI Agent Context & Rules
│   ├── database.md             # Database Schema & Migrations
│   ├── api.md                  # REST API Specification
│   └── TECH_STACK.md           # Technology Stack Decision
├── server/                     # Backend source (akan dibuat Phase 1+)
│   ├── src/
│   │   ├── app.js              # Express app
│   │   ├── server.js           # Entry point
│   │   ├── config/             # DB, env config
│   │   ├── middlewares/        # Auth, RBAC, rate-limit, error handling
│   │   ├── routes/             # API routes per module
│   │   ├── services/           # Business logic (matching, gap, recommendation)
│   │   ├── db/                 # Migrations & seeds
│   │   └── utils/              # Response helpers, audit log
│   └── data/                   # SQLite file (git-ignored)
├── tests/                      # Unit & integration tests
├── package.json
├── package-lock.json
└── .gitignore
```

## Menjalankan Proyek

### Prasyarat
- Node.js ≥ 20 (direkomendasikan v24)
- npm ≥ 10

### Instalasi
```bash
# Install dependencies
npm install

# (Opsional) Install dev dependencies untuk testing
npm install -D jest
```

### Database Migration & Seed
```bash
# Jalankan migrasi (akan dibuat Phase 1)
npm run db:migrate

# Seed skill taxonomy awal (30 skill)
npm run db:seed
```

### Development Server
```bash
# Start server (akan dibuat Phase 1)
npm run dev
```
Server akan berjalan di `http://localhost:3000`

### Testing
```bash
# Jalankan semua test
npm test

# Jalankan test dengan coverage
npm test -- --coverage
```

### Linting
```bash
# Jalankan linter (akan dikonfigurasi Phase 11)
npm run lint
```

## Dokumentasi Utama

| Dokumen | Deskripsi |
|---------|-----------|
| [PRD.md](PRD.md) | Product Requirements — Apa & Mengapa |
| [G_DESIGN.md](G_DESIGN.md) | Global Design — Arsitektur & Modul |
| [DESIGN.md](DESIGN.md) | UI/UX Design — Halaman & Komponen |
| [TASK.md](TASK.md) | Roadmap — 13 Fase development |
| [QA.md](QA.md) | Quality Assurance — Test case & DoD |
| [AGENTS.md](AGENTS.md) | Konteks AI Agent & Aturan kerja |
| [database.md](database.md) | Schema database 17 tabel |
| [api.md](api.md) | Spesifikasi REST API |
| [TECH_STACK.md](TECH_STACK.md) | Keputusan stack teknologi |

## Arsitektur Singkat

Per G_DESIGN.md: API-first, layered (Frontend → API Layer → Application Layer → Database), RBAC 4 role (Mahasiswa, Perusahaan, Kampus, Dosen), modular per fitur (Auth, Skill, Project, Matching, Gap, Recommendation, Assessment, Notification, Analytics).

## Kontribusi

1. Baca [AGENTS.md](AGENTS.md) untuk aturan kerja
2. Cek [TASK.md](TASK.md) untuk task yang tersedia (status TODO)
3. Implementasi mengikuti acceptance criteria di TASK.md & test case di QA.md
4. Commit dengan konvensi: `feat: TASK-XXX - ...`, `fix: TASK-XXX - ...`, `docs: TASK-XXX - ...`
5. Setiap PR minimal 1 reviewer selain pengirim

## Lisensi

Proyek internal — Campus Industry Talent Hub MVP.

---

**Status**: Phase 10 (Dashboard & Analytics) — DONE. Dashboard 4 role (EJS) + analytics + CSV, 141 test hijau.