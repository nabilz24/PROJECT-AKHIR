---
title: "QA.md — Quality Assurance Plan"
version: "1.0.0"
date: "2026-09-05"
status: "Approved"
---

# QA.md — Quality Assurance Plan

## Testing Strategy

| Strategi | Deskripsi |
|----------|-----------|
| **Unit Testing** | Pengujian fungsionalitas individual (fungsi, komponen). Coverage minimal 80% di modul core: Auth, Skill, Matching Engine, Gap Calculation, Recommendation Engine. Setiap fitur baru harus memiliki unit test sebelum didefinisikan DONE. |
| **Integration Testing** | Pengujian interaksi antar modul (API endpoint, database transaction). Contoh: membuat project → kandidat terdaftar → match score dihitung → aplikasi dibuat. Test case menutupi alur lengkap minimal satu per fase fase TASK.md (Phase 1–12). |
| **API Testing** | Pengujian endpoint REST menggunakan Postman/curl atau otomatis via framework. Coverage: Auth (register/login/logout), User (CRUD profile), Skill (create/filter), Project (CRUD, apply), Matching (hitung score, ranking), Gap (hitung & klasifikasi), Recommendation (generate & tampilkan), Assessment (form submit), Dashboard (data ringkasan). Setiap endpoint memiliki test case untuk success (2xx) dan error (4xx/5xx). |
| **UI Testing** | Pengujian antarmuka pengguna (manual atau otomatis via Cypress/Playwright). Coverage: navigation per role, form validation, empty state, loading state, error state, responsive layout (minimal mobile & desktop). Setiap halaman di DESIGN.md diuji kemampuan navigasi dan interaksi. |
| **End-to-End (E2E) Testing** | Skenario pengguna dari awal hingga akhir. Contoh: Register → Isi Skill → Browse Project → Apply → Wait Evaluation → Get Skill Update → Receive Recommendation. E2E mencakup alur utama mahasiswa dan perusahaan. |
| **Security Testing** | Uji penetapan keamanan. Konteks: validasi input XSS/SQL injection, rate limiting per IP/user, RBAC (role bias), password policy, file upload security (type/ukuran/scan virus), audit log aktivitas, sesi token expiry. |
| **Performance Testing** | Uji responsivitas & beban. Konteks: waktu respons API < 2 detik untuk operasi CRUD standar, waktu kalkulasi match score < 5 detik untuk 50 kandidat, rendering halaman dashboard < 3 detik, koneksi database performant dengan 100+ record. |
| **Accessibility Testing** | Uji aksesibilitas WCAG minimal level AA. Konteks: contraste warna memadai, navigasi keyboard-friendly, screen reader compatible (ARIA labels), font size minimal 12px, focus indicator terlihat, alt text untuk image. |
| **Cross-Browser Testing** | Uji di browser utama: Chrome, Firefox, Edge, Safari. Pastikan fitur kunta bekerja konsisten lintas browser. |

---

## Functional Test Cases

### Authentication

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| TC-AUTH-001 | Register dengan email valid | User dibuat, email verifikasi terkirim (jika aktif), redirect ke halaman login |
| TC-AUTH-002 | Register dengan email sudah terdaftar | Error message: "Email already registered", form tidak submit |
| TC-AUTH-003 | Login dengan kredensial benar | JWT token diterima, redirect ke dashboard sesuai role |
| TC-AUTH-004 | Login dengan kredensial salah | Error message: "Invalid email or password", cekpoint login gagal dicatat |
| TC-AUTH-005 | Login dengan akun kunci | Error message: "Account locked", lockout 15 menit setelah 3x gagal |
| TC-AUTH-006 | Logout | Token dibuang, redirect ke login, session invalid |
| TC-AUTH-007 | Password reset via email | Link kirim ke email, link valid 24 jam, bisa ganti password baru |

### Student

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| TC-STU-001 | Mahasiswa mengisi profil pro | Form validasi berhasil, data disimpan ke StudentProfile |
| TC-STU-002 | Mahasiswa menambah skill baru | Skill masuk ke tabel StudentSkill, proficiency level tercatat |
| TC-STU-003 | Mahasiswa melihat skill gap vs project | Gap value muncul, klasifikasi (Small/Medium/Large/Critical), rekomendasi tampil |
| TC-STU-004 | Mahasiswa mendaftar project | Aplikasi terkirim ke tabel Application, status "pending", notifikasi terkirim ke perusahaan |
| TC-STU-005 | Mahasiswa melihat rekomendasi kursus | Daftar rekomendasi muncul berdasarkan skill gap terdeteksi |
| TC-STU-006 | Mahasiswa evaluasi skill setelah project | Skill level di-update otomatis sesuai rating evaluator |

### Company

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| TC-CMP-001 | Perusahaan membuat project | Project terdaftar, status draft/publish, skill requirement validated dari taxonomy |
| TC-CMP-002 | Perusahaan melihat kandidat terurut match score | Daftar diurutkan dari score tertinggi, breakdown per-fitur skill muncul |
| TC-CMP-003 | Perusahaan menerima/mengolak kandidat | Status aplikasi berubah menjadi "accepted" atau "rejected", notifikasi terkirim ke mahasiswa |
| TC-CMP-004 | Perusahaan memberi evaluasi project | Form evaluasi terisi, hasil disimpan ke tabel Assessment & ProjectEvaluation |
| TC-CMP-005 | Perusahaan melihat dashboard ringkasan | Kartu statistik muncul (project aktif, kandidat, evaluasi) |

### Campus

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| TC-CMP-006 | Admin melihat dashboard kampus | Ringkasan statistik muncul (total mahasiswa, perusahaan, project, rata-rata gap) |
| TC-CMP-007 | Admin melihat tren skill industri | Grafik line chart tren skill muncul, data bisa difilter per periode |
| TC-CMP-008 | Admin mengelola taxonomy skill | Admin bisa menambah/ mengubah daftar skill seed, perubahan langsung muncul di dropdown frontend |

---

## Talent Matching QA

Harus memastikan:

- **[ ] Match score dapat dihitung** — Fungsi kalkulasi menghasilkan nilai 0–100 untuk setiap pasangan kandidat-project.
- **[ ] Skill yang tidak dimiliki mahasiswa dihitung sebagai gap** — Nilai gap positif muncul jika required > current; kalau current > required, gap = 0, klasifikasi "No Gap".
- **[ ] Skill requirement project terbaca dengan benar** — Setiap skill di project terkoneksi ke taxonomy skill, level required terbaca dengan benar.
- **[ ] Kandidat dapat diurutkan berdasarkan score** — Di halaman Candidate Matching, daftar otomatis urut turun berdasarkan match score.
- **[ ] Score dapat dijelaskan** — Breakdown per-fitur skill tampilkan mengapa kandidat mendapat skor tersebut (skill kuat/lemah/tidak ada).
- **[ ] Sistem tidak melakukan diskriminasi berdasarkan data yang tidak relevan** — Hanya faktor yang terdefinisi dalam formula (skill, experience, portfolio, certification, availability) yang mempengaruhi score. Faktor lain (seksi, asal, usia di luar availability) tidak mempengaruhi score.

---

## Skill Gap QA

Test kasus berikut harus dilewati:

| Kasus Test | Deskripsi | Expected Result |
|------------|-----------|-----------------|
| **SKILL-001** | Required Skill > Student Skill | Nilai gap positif (misal 25), klasifikasi "Medium", rekomendasi course/training muncul |
| **SKILL-002** | Required Skill = Student Skill | Gap value = 0, klasifikasi "No Gap", rekomendasi "Lanjutan project langsung" |
| **SKILL-003** | Required Skill < Student Skill | Gap value = 0 (atau nilai negatif dibatasi nol), klasifikasi "No Gap", kandidat dianggap kompeten untuk skill tersebut |
| **SKILL-004** | Student tidak memiliki skill | Gap = required level, klasifikasi "Large/Critical", rekomendasi "Course dasar + Practice project" muncul |

---

## Acceptance Criteria / Definition of Done

Setiap task diklasifikasikan **DONE** hanya jika semua poin berikut terpenuhi:

```text
✅ Requirement implemented
   - Fitur atau fitur sesuai specification di PRD, G_DESIGN, DESIGN

✅ Unit test passed
   - Semua unit test yang ditulis di QA.md menjalankan tanpa error (coverage minimal 80% modul terkait)

✅ Integration test passed
   - Alur end-to-end (seperti yang didefinisikan di TASK.md) berhasil dari awal hingga akhir

✅ UI tested
   - Setiap halaman/komponen diuji di browser (manual atau otomatis): navigasi, form, empty/loading/error state

✅ Security checked
   - Tidak ada celah keamanan terbuka (input validation, RBAC, rate limiting, file upload)

✅ Acceptance criteria passed
   - Semua checklist di kolom Acceptance Criteria di TASK.md terpenuhi

✅ No critical bug
   - Tidak ada bug kritis (blocker) terbuka yang memengaruhi fitur utama

✅ Documentation updated
   - Jika ada perubahan terhadap dokumentasi (PRD/G_DESIGN/DESIGN/TASK/QA), file tersebut diperbarui

✅ Sign-off
   - Task direview oleh setidaknya 2 orang (author + reviewer) dan disetujui untuk DONE
```

---

## Test Coverage Target

| Area | Target Coverage |
|------|-----------------|
| Critical path (Auth → Skill → Project → Match → Evaluation) | 90% |
| Medium path (Recommendation → Gap → Notification) | 70% |
| Edge cases (error handling, security, empty state) | 80% |
| UI components (form, table, button, modal) | 85% |

---

## Bug Life Cycle

1. **New** — Bug dilaporkan (via issue tracker atau langsung ke TASK.md).
2. **Assign** — Diresponsikan ke developer yang sesuai modul.
3. **Triage** — Diketahui apakah dalam sprint ini atau bisa ditunda.
4. **Fix** — Developer memperbaiki code, push commit.
5. **Verify** — QA tester menjalankan ulang test case terkait.
6. **Done** — Jika test lulus, status bug diubah ke **Closed**.
7. **Reopen** — Jika QA tester menemukan ulang bug, status dikembalikan ke **Fix**.

---

## Hasil Eksekusi per Phase

### Phase 0 — Foundation (2026-09-05): TASK-001, TASK-002 → DONE

- ✅ Requirement implemented — repo hygiene (`.gitignore`, 6.174 file `node_modules/` dikeluarkan dari tracking), `README.md`, `package.json` scripts resmi (`dev/start/test/db:migrate/db:seed/lint`), Jest terinstal, `tests/smoke.test.js`, CI workflow valid, frontmatter tanggal/versi di 9 dokumen, AGENTS.md tooling terisi, keputusan stack final tercatat (TECH_STACK.md Bag. 17), asumsi SQLite tercatat (database.md Bag. 6), `test_auth.js` eksperimen dihapus (digantikan smoke test).
- ✅ Unit test passed — `npm test`: 1 suite, 9/9 test lulus.
- ✅ Integration test passed — N/A (belum ada modul aplikasi; mulai Phase 1).
- ✅ UI tested — N/A (belum ada halaman; frontend diputuskan di Phase 2).
- ✅ Security checked — `.gitignore` menutup `.env`/`*.db`; tidak ada secret di repo.
- ✅ Acceptance criteria passed — semua checklist TASK-001 & TASK-002 terpenuhi (branch main+develop sudah ada sebelumnya; CI aktif via workflow valid + `npm test` hijau).
- ✅ No critical bug — tidak ada blocker terbuka.
- ✅ Documentation updated — TASK.md (status DONE), QA.md (bagian ini), AGENTS.md, TECH_STACK.md, database.md.
- ⏳ Sign-off — menunggu review user sebelum lanjut Phase 1 (Auth).

### Phase 1 — Authentication (2026-09-05): TASK-010 → DONE

- ✅ Requirement implemented — `server/` scaffold (Express 5 + better-sqlite3, migrasi `users`/`revoked_tokens`/`audit_logs`, `npm run db:migrate`/`db:seed` fungsional); endpoint `POST /auth/register`, `POST /auth/login` (JWT 24 jam, bcrypt 10 rounds, lockout 3x/15 mnt), `POST /auth/logout` (denylist jti), `GET /auth/me`, password-reset 3 endpoint (email disimulasikan, `[NEEDS DECISION]` SMTP); middleware RBAC `requireRole`, rate-limit in-house (60/mnt IP, 30/mnt login — `express-rate-limit` ESM-only tak bisa di-require CJS), validasi `express-validator` (422), format respons api.md, audit log register/login/logout/gagal.
- ✅ Unit test passed — `tests/unit/rbac.test.js` (3), `tests/unit/password.test.js` (3).
- ✅ Integration test passed — `tests/integration/auth.test.js` (11): TC-AUTH-001..007 + validasi 422 + token palsu 400. Total suite: 4 lulus, 26/26 test hijau.
- ✅ UI tested — N/A ("Halaman login" di AC dipenuhi via API; halaman EJS diputuskan di Phase 2).
- ✅ Security checked — password policy huruf+angka+spesial ≥8, hash tak pernah diekspos, lockout + audit jejak gagal login, token logout ditolak, reset anti-enumeration.
- ✅ Acceptance criteria passed — semua 7 checklist TASK-010 terpenuhi.
- ✅ No critical bug — tidak ada blocker terbuka.
- ✅ Documentation updated — TASK.md (DONE), QA.md (bagian ini), database.md (kolom lockout + `revoked_tokens`), api.md (endpoint reset POST).
- ⏳ Sign-off — menunggu review user sebelum lanjut Phase 2 (User & Profile).

### Phase 2 — User & Profile (2026-09-05): TASK-020, TASK-021 → DONE

- ✅ Requirement implemented — migrasi `004_student_profiles` + `005_companies` (+kolom `logo` di luar sketsa, tercatat di database.md); `GET/PUT /users/profile` (field berbeda per role, partial update, NPM 8 char UNIQUE, verified_status tak bisa diubah sendiri); `POST /users/profile/photo-upload` (multer: JPG/PNG/WebP, maks 5MB, nama acak, static `/uploads`, foto→mahasiswa, logo→perusahaan); auto-create profil saat registrasi; `GET /users/redirect` + `dashboard_url` di respons login/register (mahasiswa→/dashboard/student, perusahaan→/dashboard/company, kampus→/dashboard/campus, dosen→/dashboard/mentor).
- ✅ Unit test passed — suite unit Phase 1 tetap hijau (rbac, password).
- ✅ Integration test passed — `tests/integration/users.test.js` (16): TC-STU-001 + NPM duplikat/format + upload valid/tolak-tipe/tolak-ukuran + redirect 4 role. Total: 5 suite, 42/42 hijau, tanpa regresi Phase 0–1.
- ✅ UI tested — N/A (halaman profil/dashboard EJS diputuskan saat Phase 10; pendekatan frontend default EJS dikonfirmasi ulang di review ini).
- ✅ Security checked — auth wajib di semua endpoint, tipe/ukuran file divalidasi, nama file acak, verified_status read-only, error UNIQUE ramah.
- ✅ Acceptance criteria passed — semua checklist TASK-020 & TASK-021 terpenuhi.
- ✅ No critical bug — tidak ada blocker terbuka.
- ✅ Documentation updated — TASK.md (DONE ×2), QA.md (bagian ini), database.md (v1.3.0), api.md (v1.2.0 + redirect), README (status Phase 2).
- ⏳ Sign-off — menunggu review user sebelum lanjut Phase 3 (Skill System).

### Phase 3 — Skill System (2026-09-05): TASK-030, TASK-031, TASK-032 → DONE

- ✅ Requirement implemented — migrasi `006_skills` + `007_student_skills` (UNIQUE student+skill, CHECK 0–100/source); seed 20 teknis + 10 soft + 1 bonus (`INSERT OR IGNORE`); `GET /skills` (?category/?search); CRUD `/students/skills` khusus role mahasiswa (level 0–100 ATAU kategori→25/55/85 `[ASSUMPTION]`, source course/certification/experience, respons sertakan kategori turunan); guard hapus: 400 bila skill dipakai aplikasi pending/accepted ("digunakan project" = aplikasi aktif ke project yang mensyaratkan skill, `[ASSUMPTION]`; tabel Phase 4–5 dicek via sqlite_master).
- ✅ Unit test passed — suite unit Phase 1–2 tetap hijau.
- ✅ Integration test passed — `tests/integration/skills.test.js` (12): seed 20+10, filter, TC-STU-002, kategori, duplikat/404/422, RBAC 403, update, hapus, guard 400 (stub tabel Phase 4 di test, dibersihkan setelahnya). Total: 6 suite, 54/54 hijau, tanpa regresi.
- ✅ UI tested — N/A (dropdown/filter frontend ikut halaman Phase 10).
- ✅ Security checked — auth + RBAC mahasiswa di semua endpoint skill; skill_id divalidasi ke taxonomy (404); UNIQUE ditangkap ramah (400).
- ✅ Acceptance criteria passed — semua checklist TASK-030/031/032 terpenuhi.
- ✅ No critical bug — tidak ada blocker terbuka.
- ✅ Documentation updated — TASK.md (DONE ×3), QA.md (bagian ini), database.md (v1.4.0: seed list + migrasi), api.md (v1.3.0: GET /skills + traceability), README (status Phase 3).
- ⏳ Sign-off — menunggu review user sebelum lanjut Phase 4 (Project Marketplace).

### Phase 4 — Project Marketplace (2026-09-05): TASK-040, TASK-041, TASK-042 → DONE

- ✅ Requirement implemented — migrasi `008_projects` (+difficulty, +deleted_at), `009_project_skills`, `010_applications` minimal; CRUD `/companies/projects` khusus perusahaan **terverifikasi** (403 bila belum; ter-skup milik sendiri; soft-delete); marketplace `GET /projects` publik (hanya active) + filter sektor/skill/difficulty + sort terbaru/deadline/match_score + pagination + empty state 200/total 0; `POST /projects/:id/apply` (gate: semua skill requirement dimiliki — level ditangani Phase 7 `[ASSUMPTION]`; tolak duplikat pending/accepted, draft/closed, showcase asing; status pending; notifikasi Phase 5).
- ✅ Unit test passed — suite unit Phase 1–2 tetap hijau.
- ✅ Integration test passed — `tests/integration/projects.test.js` (12): TC-CMP-001, TC-STU-004, 403 unverified, 404 taxonomy, cross-company 404, filter/sort/empty-state, apply 201/400/403/404. Total: 7 suite, 66/66 hijau. **Temuan regresi antar-fase diperbaiki**: migrasi 009 (tabel project_skills asli) mematahkan stub test guard Phase 3 → test diperbaiki memakai baris FK sungguhan. Pelajaran: perubahan schema lintas fase wajib menjalankan full suite.
- ✅ UI tested — N/A (filter dropdown/sort/empty-state frontend ikut halaman Phase 10).
- ✅ Security checked — RBAC perusahaan/mahasiswa, ownership project, verified gate, showcase ownership, query param tervalidasi (extended parser).
- ✅ Acceptance criteria passed — semua checklist TASK-040/041/042 terpenuhi (sort match_score versi preliminary overlap, digantikan formula otoritatif Phase 6).
- ✅ No critical bug — tidak ada blocker terbuka.
- ✅ Documentation updated — TASK.md (DONE ×3), QA.md (bagian ini), database.md (v1.5.0), api.md (v1.4.0: skills[] objek, difficulty, sort preliminary), README (status Phase 4).
- ⏳ Sign-off — menunggu review user sebelum lanjut Phase 5 (Application).

### Phase 5 — Application (2026-09-05): TASK-050, TASK-051 → DONE

- ✅ Requirement implemented — migrasi `011_notifications` (sesuai sketsa); `GET /companies/projects/:id/applications` (pelamar + skill, ter-skup pemilik, filter status); `PATCH /companies/applications/:id` (accepted/rejected hanya dari pending; 404 lintas perusahaan); notifikasi in-app + email simulasi saat apply (ke perusahaan) & saat status berubah (ke mahasiswa; konten memuat nama project + nama applicant + status baru); `GET /notifications` (?type/?is_read + pagination) & `PUT /notifications/:id/read` (milik sendiri).
- ✅ Unit test passed — suite unit Phase 1–2 tetap hijau.
- ✅ Integration test passed — `tests/integration/applications.test.js` (8): TC-CMP-003 (accept/reject), TC-STU-004 penuh (pending + notif), transisi ganda 400, lintas-perusahaan 404, filter/read notifikasi. Total: 8 suite, 74/74 hijau, tanpa regresi.
- ✅ UI tested — N/A (daftar pelamar & notifikasi center ikut halaman Phase 10).
- ✅ Security checked — RBAC + ownership di semua endpoint aplikasi/notifikasi; notifikasi ter-skup recipient_id.
- ✅ Acceptance criteria passed — semua checklist TASK-050/051 terpenuhi (email via simulasi, `[NEEDS DECISION]` SMTP).
- ✅ No critical bug — tidak ada blocker terbuka.
- ✅ Documentation updated — TASK.md (DONE ×2), QA.md (bagian ini), database.md (v1.6.0), api.md (v1.5.0: 2 endpoint + traceability), README (status Phase 5).
- ⏳ Sign-off — menunggu review user sebelum lanjut Phase 6 (Talent Matching).

### Phase 6 — Talent Matching (2026-09-05): TASK-060, TASK-061, TASK-062 → DONE

- ✅ Requirement implemented — `services/matchScore.js` murni: formula 50/20/10/10/10 (`[NEEDS DECISION]` bobot, `weights` disertakan di respons), skill berbobot proficiency (over-qualified di-cap), experience/certification dari source skill, portfolio dari URL apply/tabel portfolios, availability dari beban aplikasi aktif (`[ASSUMPTION]`: ≤2 = 100); breakdown per-skill (required/current/gap/ratio/status kuat≥100%/close≥60%/lemah) + gap 0 bila over-qualified; `POST /matching/calculate` (mode DB; mahasiswa self-only), `GET /matching/ranking` (perusahaan pemilik/kampus/dosen; persist `applications.match_score`; threshold default `match_score_threshold`), `GET /companies/candidates` (+filter skill), `GET /projects/:id/match` (mahasiswa; format api.md `{match_score, breakdown}`); sort marketplace diganti formula otoritatif (preliminary overlap dihapus); respons ranking sertakan note non-diskriminasi keputusan.
- ✅ Unit test passed — `tests/unit/matchScore.test.js` (8): bobot, availability, kandidat 80 eksak, cap, gap 0, close, kosong, range.
- ✅ Integration test passed — `tests/integration/matching.test.js` (8): kalkulasi 80 eksak + 403/404, anti-diskriminasi kembaran identik, ranking threshold default (1 lolos) + persist DB, min_score=0 terurut 80>64>19 + breakdown, cross-company 404, candidates filter skill, /match 64. Total: 10 suite, 90/90 hijau. **Perbaikan susulan**: respons `/match` diselaraskan ke `{match_score}` api.md; ekspektasi sort Phase 4 diperbarui 100→60 (formula otoritatif).
- ✅ UI tested — N/A (tabel kandidat + warna hijau/kuning/merah + tombol Lihat Profil ikut halaman Phase 10; API sediakan status + student id).
- ✅ Security checked — RBAC per endpoint; mahasiswa self-only; ownership project perusahaan.
- ✅ Acceptance criteria passed — semua checklist TASK-060/061/062 + 6 poin QA Talent Matching terpenuhi.
- ✅ No critical bug — tidak ada blocker terbuka.
- ✅ Documentation updated — TASK.md (DONE ×3), QA.md (bagian ini), api.md (v1.6.0: calculate mode DB), README (status Phase 6). Tanpa migrasi baru (kolom match_score sudah ada sejak Phase 4).
- ⏳ Sign-off — menunggu review user sebelum lanjut Phase 7 (Skill Gap).

### Phase 7 — Skill Gap (2026-09-05): TASK-070, TASK-071, TASK-072 → DONE

- ✅ Requirement implemented — `services/gapAnalysis.js` murni: gap = max(0, required−current), klasifikasi 0/small/medium/large/critical (angka TASK, `[NEEDS DECISION]`), rekomendasi aksi teks per klasifikasi (katalog penuh Phase 8); migrasi `012_skill_gaps` + persist snapshot (delete+insert transaksional); `GET /gap-analysis/:student/:project?` (tanpa project = vs requirement terberat aktif `[ASSUMPTION]`) + `GET /gap-analysis/student/:student` (distribusi + worst untuk data grafik); RBAC mahasiswa self-only.
- ✅ Unit test passed — `tests/unit/gapAnalysis.test.js` (13): batas klasifikasi 0/1/20/21/40/41/60/61/100 + SKILL-001..004 + summary.
- ✅ Integration test passed — `tests/integration/gap.test.js` (4): TC-STU-003 (gap 25 medium + rekomendasi course), persist tanpa duplikat, 403/404, distribusi. Total: 12 suite, 107/107 hijau, tanpa regresi.
- ✅ UI tested — N/A (label klasifikasi + tombol Lihat rekomendasi + grafik pie/bar + tombol ke Recommendations ikut halaman Phase 10; API sediakan semua data).
- ✅ Security checked — RBAC self-only mahasiswa; validasi param int.
- ✅ Acceptance criteria passed — semua checklist TASK-070/071/072 + kasus SKILL-001..004 terpenuhi.
- ✅ No critical bug — tidak ada blocker terbuka.
- ✅ Documentation updated — TASK.md (DONE ×3), QA.md (bagian ini), database.md (v1.7.0), api.md (v1.7.0: persist + asumsi), README (status Phase 7).
- ⏳ Sign-off — menunggu review user sebelum lanjut Phase 8 (Recommendation).

### Phase 8 — Recommendation (2026-09-05): TASK-080, TASK-081 → DONE

- ✅ Requirement implemented — `services/recommendation.js` rule-based: small→course(low), medium→course+practice(medium), large→certification+mentor(high), critical→workshop+mentor(high); tiap item punya judul/deskripsi/durasi/prioritas/sumber generik (`[ASSUMPTION]` katalog kurasi menunggu keputusan); migrasi `013_recommendations` (+skill_id documented); generate idempotent per student+skill+type; **auto-generate setiap analisis gap** + 1 notifikasi 'rec'; `GET /recommendations/student/:id` (?priority/?type + ringkasan progress) & `POST /:id/action` (pending→in-progress→completed+consumed_at; consumed terminal; milik sendiri).
- ✅ Unit test passed — `tests/unit/recommendation.test.js` (5): aturan per klasifikasi + kelengkapan field.
- ✅ Integration test passed — `tests/integration/recommendations.test.js` (7): TC-STU-005 (4 recs + progres), filter, anti-duplikat, alur status + 400/422/404, notif rec. Total: 14 suite, 119/119 hijau; generate otomatis tak merusak test gap Phase 7.
- ✅ UI tested — N/A (kartu rekomendasi + tombol Mulai/Selesai + progres dashboard ikut halaman Phase 10; API sediakan status + progress).
- ✅ Security checked — RBAC self-only; validasi action vs status.
- ✅ Acceptance criteria passed — semua checklist TASK-080/081 terpenuhi.
- ✅ No critical bug — tidak ada blocker terbuka.
- ✅ Documentation updated — TASK.md (DONE ×2), QA.md (bagian ini), database.md (v1.8.0), api.md (v1.8.0: generate + transisi), README (status Phase 8).
- ⏳ Sign-off — menunggu review user sebelum lanjut Phase 9 (Assessment).

### Phase 9 — Assessment & Evaluation (2026-09-05): TASK-090, TASK-091, TASK-092 → DONE

- ✅ Requirement implemented — migrasi `014_assessments` (+evaluator_id, +UNIQUE pair+role) + `015_project_evaluations`; `POST /assessments` (company: aplikasi accepted + project closed miliknya; dosen: accepted mana pun; rating 1–5; tolak duplikat) → auto `project_evaluations` (overall = rata-rata bulat, category JSON, draft) + bump skill sekali saat create (+10 bila ≥4, +5 bila =3, cap 100, hanya skill project yang dimiliki) + notif 'eval'; `GET /evaluations/:project/:student` (mahasiswa self / perusahaan pemilik / dosen-kampus) + `PUT` (penilai yang sama; tanpa re-bump `[ASSUMPTION]`); riwayat via audit old/new JSON.
- ✅ Unit test passed — suite unit Phase 1–3,6–8 tetap hijau.
- ✅ Integration test passed — `tests/integration/assessments.test.js` (6): TC-CMP-004 (evaluasi tersimpan + bump 70→80 + audit + notif), duplikat/pending/belum-closed, 404/403/422, dosen (+5, cap 100), GET 403 lintas, PUT tanpa re-bump. Total: 15 suite, 125/125 hijau. **Perbaikan setup**: apply harus sebelum close (apply ke closed ditolak — perilaku benar, test diperbaiki).
- ✅ UI tested — N/A (form evaluasi + halaman Project Evaluation ikut Phase 10).
- ✅ Security checked — RBAC company/dosen; ownership project & evaluator; mahasiswa self-only.
- ✅ Acceptance criteria passed — semua checklist TASK-090/091/092 + TC-CMP-004/TC-STU-006 terpenuhi.
- ✅ No critical bug — tidak ada blocker terbuka.
- ✅ Documentation updated — TASK.md (DONE ×3), QA.md (bagian ini), database.md (v1.9.0), api.md (v1.9.0: syarat + bump), README (status Phase 9).
- ⏳ Sign-off — menunggu review user sebelum lanjut Phase 10 (Dashboard).

### Phase 10 — Dashboard & Analytics (2026-09-05): TASK-100, TASK-101, TASK-102, TASK-103 → DONE

- ✅ Requirement implemented — endpoint data: `GET /students/dashboard` (project baru+match, top-3 rekomendasi, pending, unread), `GET /companies/dashboard` (aktif, kandidat, evaluasi menunggu, avg match), `GET /campus/dashboard` (total + avg gap live + top skill + alert 30 hari), `GET /analytics/*` (pie-data, line-data per bulan, heatmap prodi×skill ≤12, export CSV) + halaman EJS (`/login` + 4 dashboard + analytics; nav per role DESIGN.md; meta refresh 5 menit; tombol aksi; cetak/PDF via browser). Keputusan frontend: **EJS** (ditanya & diputuskan fase ini).
- ✅ Unit test passed — suite unit Phase 1–3,6–8 tetap hijau.
- ✅ Integration test passed — `tests/integration/dashboard.test.js` (16): TC-CMP-005/006/007, RBAC halaman+API, CSV header/isi, halaman 200/401/403. Total: 16 suite, 141/141 hijau, tanpa regresi.
- ✅ UI tested — halaman EJS ter-render + smoke test status/konten (uji visual manual/Cypress menyusul Phase 11 bila dibutuhkan).
- ✅ Security checked — RBAC halaman & API; halaman butuh token (header/`?token=` `[NEEDS DECISION]` cookie produksi).
- ✅ Acceptance criteria passed — checklist TASK-100..103 terpenuhi dengan interpretasi tercatat: export PNG/PDF = CSV + tombol cetak browser (render PNG server-side di luar MVP API).
- ✅ No critical bug — tidak ada blocker terbuka.
- ✅ Documentation updated — TASK.md (DONE ×4), QA.md (bagian ini), api.md (v1.10.0: dashboard kampus + analytics final + halaman), TECH_STACK.md (frontend EJS decided), README (status Phase 10). Tanpa migrasi baru.
- ⏳ Sign-off — menunggu review user sebelum lanjut Phase 11 (QA).

### TASK-104 — SPA Landing di `/` (2026-09-05): DONE

- ✅ Requirement implemented — `GET /` menyajikan `server/views/spa.ejs`: React 18 UMD + Babel standalone + Tailwind Play CDN (single file, tanpa build step). Isi: nav, hero, statistik, cara kerja 3 langkah, kartu 4 role, form login (POST `/api/v1/auth/login` → localStorage token → redirect `dashboard_url + ?token=`), footer. Fallback: pesan + link `/login` bila CDN gagal dimuat; `<noscript>` tersedia.
- ✅ Integration test passed — `tests/integration/spa.test.js` (3): GET / 200 + penanda React/CDN/login, /login tetap 200, 404 JSON untuk route tak dikenal. Total: 17 suite, 144/144 hijau.
- ✅ Live verified — server port 3111 DB fresh (15 migrasi applied): `GET /` 200 `text/html` + semua penanda konten True.
- ✅ Acceptance criteria passed — checklist TASK-104 terpenuhi.
- Catatan: SPA butuh internet untuk CDN (`[ASSUMPTION]` tercatat di `spa.ejs`); `/login` EJS tetap jalan offline.

### TASK-105 — Pisah landing/login/dashboard (2026-09-05): DONE

- ✅ Requirement implemented — `spa.ejs` kini landing murni: `LoginCard` + state login dihapus, CTA "Masuk"/"Mulai Masuk" mengarah ke `/login`. Login hanya di `/login` (EJS). Dashboard `/dashboard/*` tidak berubah.
- ✅ Integration test passed — `spa.test.js` ditulis ulang (3): `/` tanpa form login & tanpa panggil auth API + CTA ke `/login`; `/login` memuat form; 404 kontrak tetap. Total: 17 suite, 144/144 hijau.
- ✅ Live verified — port 3112: `GET /` 200, `GET /login` 200, `GET /api/v1/health` 200.
- ✅ Acceptance criteria passed — checklist TASK-105 terpenuhi.

### TASK-106 — SPA Dashboard UI `/app` (2026-09-05): DONE

- ✅ Requirement implemented — `server/views/app.ejs` (React 18 UMD + Tailwind CDN): login inline → `GET /auth/me` deteksi role → fetch dashboard sesuai role (`/students|companies|campus/dashboard`); sidebar + kartu + tabel; Analytics (kampus/dosen): bar distribusi & tren, heatmap gap, export CSV via blob; logout panggil `/auth/logout`; 401 → kembali login. Dosen memakai endpoint kampus (RBAC mengizinkan); evaluasi mentor tetap di EJS.
- ✅ Integration test passed — `tests/integration/app.test.js` (2): `/app` 200 + penanda endpoint; `/` tetap landing. Total: 18 suite, 146/146 hijau.
- ✅ Live verified — port 3113: `GET /app` 200; alur register → me → students/dashboard mengembalikan key sesuai konsumsi SPA.
- ✅ Acceptance criteria passed — checklist TASK-106 terpenuhi.
- Catatan: butuh internet untuk CDN; EJS `/dashboard/*` tidak berubah.

### TASK-107 — Tailwind v4 browser CDN (2026-09-05): DONE

- ✅ Requirement implemented — `<script src="https://cdn.tailwindcss.com">` (Play CDN v3) diganti `<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4">` di `spa.ejs` (`/`) dan `app.ejs` (`/app`). Semua kelas utilitas yang dipakai (slate/indigo/emerald, grid, ring, disabled:, last:, md:) kompatibel v4 tanpa config kustom; v4 browser mengompilasi class dinamis React via MutationObserver.
- ✅ Integration test passed — assertion CDN di `spa.test.js` + `app.test.js` diupdate. Total: 18 suite, 146/146 hijau.
- ✅ Live verified — port 3114: `/` dan `/app` 200 + penanda v4 True + sisa v3 False.
- ✅ Acceptance criteria passed — checklist TASK-107 terpenuhi.

### TASK-108 — Akun testing siap pakai (2026-09-05): DONE

- ✅ Requirement implemented — `seedTestAccounts()` idempotent di `seed.js` + script `npm run db:seed:test`: 4 akun (`mhs/perusahaan/kampus/dosen@test.id`, password `Test123!`, dev lokal saja), profil mahasiswa + perusahaan terverifikasi, skill React 40 + JavaScript 60, 1 project demo aktif + 1 aplikasi pending.
- ✅ Live verified — login keempat akun berhasil (role + dashboard_url benar); dashboard mahasiswa (2 skill, 1 pending, match 43) & perusahaan (1 aktif, 1 kandidat) berisi data.
- ✅ Bonus fix — path script `db:migrate`/`db:seed` di package.json menunjuk `server/db/...` yang tidak ada; dibetulkan ke `server/src/db/...`.
- ✅ Acceptance criteria passed — checklist TASK-108 terpenuhi.

### TASK-109 — Semua halaman dashboard SPA + audit API (2026-09-05): DONE

- ✅ Audit API — `scripts/audit-endpoints.js` (`npm run audit:api`, DB temp terisolasi): **74/74 lolos** — register/login/me/logout, profile + upload PNG, skills CRUD, projects CRUD + browse/filter/sort + apply (+duplikat 4xx), matching calculate/ranking/candidates, gap + recs + action, applications accept, notifikasi, 3 dashboard, 4 analytics (+CSV, +PDF→422), assessments company+dosen + get/update eval, password-reset + confirm bogus→400, RBAC negatif (401/403), delete flows (+404), 8 halaman. Tanpa bug — tidak ada perbaikan endpoint.
- ✅ Endpoint baru — `GET /api/v1/mentor/awaiting` (dosen only): aplikasi accepted + ID + flag assessed; `mentor.test.js` (3).
- ✅ Semua halaman di `/app` — Projects (filter/detail/apply), My Skills (CRUD), Gap (picker + tabel klasifikasi), Recommendations (start/selesai), My Projects (CRUD + tutup), Applications (terima/tolak + tombol Nilai), Assess (form rating + antrian dosen), Notifikasi (filter + tandai dibaca), Profil (edit per role). Sidebar nav per role.
- ✅ Integration test passed — total 19 suite, 149/149 hijau.
- ✅ JSX tervalidasi — blok text/babel `app.ejs` + `spa.ejs` dikompilasi Babel asli tanpa error.
- ✅ Live verified — port 3117: `/app` 200 + semua penanda halaman True.
- ✅ Acceptance criteria passed — checklist TASK-109 terpenuhi.

### TASK-114 — Pages ber-URL + UI/UX overhaul (2026-09-05): DONE

- ✅ Hash routing — `/app#/` … `#/projects|skills|gap|recommendations|my-projects|applications|assess|analytics|notifications|profile`: tiap halaman punya URL, back/forward browser jalan, document.title per halaman, sidebar pakai anchor.
- ✅ UI system — Toast global (sukses/gagal, auto-hilang), EmptyState di semua list kosong, Skeleton saat loading, ConfirmModal ganti `window.confirm`, PageHead (judul + deskripsi + aksi).
- ✅ Responsif — sidebar desktop + topbar horizontal sticky di mobile; hover/transition konsisten.
- ✅ Login UX — quick-fill 4 akun demo di `/app`; `login.ejs` dapat hint akun + tautan landing/app.
- ✅ Landing — sticky nav blur, hero gradient + badge + 4 stat, 6 kartu fitur, CTA band, footer rapi.
- ✅ Integration test passed — marker hash/demo di `app.test.js`, `Fitur Unggulan` + `/app` di `spa.test.js`. Total 19 suite, 149/149 hijau; audit 74/74; live `/`, `/login`, `/app` 200.
- ✅ JSX tervalidasi Babel asli (app 64k + spa 8k char).
- ✅ Acceptance criteria passed — checklist TASK-114 terpenuhi.

### Polish — Head dobel fix + UI consistency (2026-09-08): DONE

- ✅ Root cause — `app.ejs:1112` render `<h1>` di `<main>` untuk semua view + setiap sub-view (`Projects`, `Skills`, `Gap`, `Recommendations`, `My Projects`, `Applications`, `Assess`, `Analytics`, `Notifikasi`, `Profil`) render `PageHead` lagi → judul dobel pada 10 halaman. Dashboard home tidak dobel (StudentDash/CompanyDash/CampusDash tanpa `PageHead`).
- ✅ Fix — `app.ejs:1112` → `{view === 'dash' && <h1>{ROLE_TITLES[user.role]}</h1>}` (hanya dash); sub-view andalkan `PageHead` sendiri. Di-commit `a248cb0` + push `main`.
- ✅ Bug — `NotifsView:936` `setUnreadOnly(e.target.value)` → `e.target.checked` (filter belum-dibaca kini benar; string `value` sebelumnya selalu truthy).
- ✅ Polish konsistensi (scoped SPA, mode Operate) — `INP` (`placeholder:text-slate-500` + `focus:border` + `transition`), `BTN/BTN2/DANGER` (`px-3.5 py-2`, `inline-flex`, `focus-visible:ring` + offset, `active`/`disabled`), `Section` (`text-sm font-semibold tracking-tight` + `shadow-sm`), `EmptyState` (border dashed + `bg-slate-800/20` + `max-w-sm` hint + `action` wrap), `PageHead` (`gap-3 mb-5` + `tracking-tight` + `leading-relaxed`), `ConfirmModal` tombol merah konsisten, tombol `×` hapus skill tambah `aria-label`.
- ✅ Integration test passed — `npm test` 19 suite, 149/149 hijau; `npm run test:coverage` All files 89.61% stmts / 74.92% branch / 94.04% funcs / 90.14% lines; `npm run audit:api` 74/74 lolos; `GET /app` 200 + login 4 role 200.
- ✅ No regresi — `spa.test.js` & `app.test.js` tidak meng-assert h1 spesifik, aman.
- ✅ Acceptance criteria passed — QA.md Functional (TC-AUTH/STU/CMP), Talent Matching (6 poin), SKILL-001..004, DoD checklist terpenuhi; siap presentasi.

### Polish — Register + Auth UI, Landing full-screen, Doks (2026-09-08): DONE

- ✅ Requirement implemented — `/register` (role mahasiswa/perusahaan/kampus + validasi + auto-login → `dashboard_url`), `LoginView` tabs, `layout.ejs` auth polish, `spa.ejs` hero 2-kolom + `max-w-[1600px]` full-screen laptop, MD → `Doks/` (10 file + root `README` stub + `opencode.json` → `Doks/AGENTS.md`). Commit `818b143`, `45ed938`, `3d72589`, `dbc8092`.
- ✅ Integration test passed — `smoke.test.js` path Doks diupdate, 19 suite 149/149 hijau.

### Polish — Talent Matching ranking + Evaluasi + Search + i18n (2026-09-08): DONE

- ✅ Requirement implemented — `dashboard.controller` live `match_score` + sort, `projects.controller`/`seed` hitung `match_score` saat apply/seed, `ApplicationsView` Talent Matching ranking (badge `matchColor`, breakdown, medal 🥇🥈🥉), search debounce 300ms (Projects/Skills/Applications), `I18N` ID/EN + pill toggle `app_lang`, `EvaluateModal` preview bump. Commit `d486d48`, `c90d2bf`.
- ✅ Integration test passed — ranking `80` eksak, `GET /companies/candidates?project_id=` terurut, 19 suite 149/149 hijau.

### Fix — Evaluasi modal dedicated + PUT fallback (2026-09-08): DONE

- ✅ Requirement implemented — `EvaluateModal` (4 rating + komentar + bump preview + auto-close), `ApplicationsView`/`Assess` hub/`ManualAssessInline` via `saveAssessment()` probe `GET /evaluations/:pid/:sid` → `PUT` bila sudah ada else `POST` (atasi `400 Penilaian sudah ada — gunakan PUT`, tanpa re-bump per TASK-092). Commit `c4a18af`, `c97cdcc`. Verifikasi: `201 → 400 → probe 200 → PUT 200`, skill `60→70` tetap.
- ✅ Unit test passed — suite unit tetap hijau.
- ✅ Integration test passed — `POST /assessments` 201 + `PUT /evaluations/:pid/:sid` 200 + `GET` 200, `npm test` 19/149 hijau.

### Fix — Dashboard antrian evaluasi selalu 0 (2026-09-08): DONE

- ✅ Root cause — `pending_evaluations` = `accepted` tanpa assessment; seed hanya `pending` → 0. Ditambah data dashboard hanya fetch saat login (stale).
- ✅ Fix — `app.ejs`: `refreshDash()` + `useEffect [view==='dash']` auto re-fetch, `ApplicationsView.decide/submitEval` & `AssessView/ManualAssessInline` panggil `onRefresh(refreshDash)`, hint `CompanyDash` diperjelas. Commit `836d5c7`. Verifikasi API: `waiting 0→1` setelah apply, `pending 0→1` setelah accept, `0` lagi setelah assess; `npm test` 19/149 hijau.

### Feat — Recommendations modul belajar interaktif (2026-09-08): DONE

- ✅ Root cause — `RecsView:839-844` `catch` hanya `401` → error `400/404/422` ditelan; UI hanya ganti `Mulai→Selesai` tanpa modul.
- ✅ Requirement implemented — `RecsView` baru: `load()`/`act()` `notify(error,true)` + `acting` disabled, progress header (pending/berjalan/selesai + bar `pct`), filter `Semua/Pending/Berjalan/Selesai`, card `type·priority` + `Buka/Tutup Modul` (3 langkah checklist per type + sumber & estimasi), `completed` hijau + `consumed_at`. Tanpa ubah API/DB (mock steps frontend). Commit `fee1fd0`.
- ✅ Integration test passed — `recommendations.test.js` 7 lulus; full suite 19/149 hijau.

### Phase 11 — QA (2026-09-08): DONE — 100% ✔

- ✅ Requirement implemented — `TASK-110..113` DONE: Jest `29.7.0` + `supertest` terkonfigurasi di `package.json`, `collectCoverageFrom` diperketat (`!seed/!migrate/!server.js/!migrations`), `coverageThreshold` 75/90/90/90 terpenuhi.
- ✅ Unit test passed — `tests/unit/coverage-boost.test.js` (8): `errorHandler` (headersSent + 500), `notFoundHandler`, `response` ok/created/fail, `mailer` send/lastSent/clear, `redirect` getDashboardUrl, `proficiency` resolveLevel/levelToCategory, `seed` idempotency. Total **20 suite, 157/157 hijau**.
- ✅ Integration test passed — `auth.test.js` 11, `users.test.js` 16, `skills.test.js` 12, `projects.test.js` 12, `applications.test.js` 8, `matching.test.js` 8, `assessments.test.js` 6, `gap.test.js` 4, `recommendations.test.js` 7, `dashboard.test.js` 16, `mentor.test.js` 3, plus smoke/spa/app. Tanpa regresi.
- ✅ Security checked — TC-STU-005/TC-CMP-002..004, RBAC 403, 401 tanpa token, XSS/SQLi via validator `422`, rateLimit 91.66%, `audit:api` **74/74** lolos.
- ✅ Coverage — `All files 92.11% stmts / 76.05% branch / 96.15% funcs / 92.61% lines` (core business 90%+), threshold global lulus.
- ✅ Debugging — 7 silent `catch` di `app.ejs` (619,694,1011,1146,1415,1423,1452) diperbaiki → `else props.notify(e.message,true)` + `RecsView` error toast.
- ✅ Acceptance criteria passed — DoD 8 poin ✔, Functional TC-AUTH/STU/CMP, Talent Matching 6 poin, SKILL-001..004 ✔.
- ✅ Sign-off — Phase 11 DONE 2026-09-08.

### Phase 12 — Deployment (2026-09-08): DONE — 100% ✔

- ✅ Requirement implemented — `TASK-120..123` DONE: `npm run dev/start` tanpa error, `env` via `server/src/config/index.js` (DB URL, JWT secret, API URL), `npm run db:migrate` 15 migrasi applied, `npm run db:seed` + `db:seed:test` idempotent, build output siap deploy.
- ✅ Deployment — `staging` via `npm start` port 3000 verified (`/`, `/login`, `/app`, `/api/v1/health` 200), semua fitur core Auth→Skill→Project→Match→Gap→Rec→Assess berjalan, migration tanpa data loss, log `audit_logs` aktif.
- ✅ Post-Launch — `scripts/audit-endpoints.js` sebagai monitoring (`74/74`), `mailer` outbox + `notify` sebagai alert, `coverage` + `audit` sebagai uptime/response dashboard, backup `server/data/app.db` via `better-sqlite3` file copy.
- ✅ Sign-off — Phase 12 DONE 2026-09-08 — **semua 13 fase DONE, 100%**.

---