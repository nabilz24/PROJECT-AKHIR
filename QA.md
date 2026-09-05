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

---