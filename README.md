# Campus Industry Talent Hub

> Dokumentasi lengkap dipindahkan ke folder [`Doks/`](./Doks/).

## Daftar Dokumen
- [README](./Doks/README.md) — Ringkasan proyek & cara menjalankan
- [PRD](./Doks/PRD.md) — Product Requirements
- [G_DESIGN](./Doks/G_DESIGN.md) — Global System Design
- [DESIGN](./Doks/DESIGN.md) — UI/UX Design
- [TASK](./Doks/TASK.md) — Roadmap development
- [QA](./Doks/QA.md) — Quality Assurance
- [api](./Doks/api.md) — REST API Specification
- [database](./Doks/database.md) — Database Schema
- [TECH_STACK](./Doks/TECH_STACK.md) — Technology Stack
- [AGENTS](./Doks/AGENTS.md) — AI Agent Rules

## Menjalankan Proyek
```bash
npm.cmd install --ignore-scripts
node server/src/db/migrate.js
node server/src/db/seed.js --test-accounts
npm.cmd run dev
# buka http://localhost:3000
```
Lihat detail lengkap di [Doks/README.md](./Doks/README.md).
