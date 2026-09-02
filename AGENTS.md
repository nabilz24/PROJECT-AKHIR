# AGENTS.md — Konteks & Aturan untuk AI Agent

## Navigasi Dokumentasi Proyek (Source of Truth)

Dokumen berikut merupakan **source of truth** utuh untuk pengembangan Campus Industry Talent Hub. AI agent **wajib** mengikuti urutan dan aturan berikut sebelum memulai coding atau perubahan apa pun:

1. **PRD.md** — Menentukan **Apa & Mengapa** produk dibangun. Setiap requirement di sini adalah acuan mutlak.
2. **G_DESIGN.md** — Menentukan **Bagaimana sistem bekerja** pada level arsitektur & module. Modul-modul ini adalah tempat implementasi kode.
3. **DESIGN.md** — Menentukan **Bagaimana pengguna berinteraksi** dengan sistem. Setiap halaman & komponen UI harus sesuai desain ini.
4. **TASK.md** — Menentukan **Apa yang perlu dibangun** dalam roadmap. Setiap task memiliki Acceptance Criteria yang harus divalidasi.
5. **QA.md** — Menentukan **Bagaimana kita mengecek apakah itu bekerja**. Test case & acceptance criteria harus bisa divalidasi.

**Aturan Kinilal:**
- Jangan coding sebelum kelima dokumen di atas disetujui/tersedia di repo.
- Setiap fitur yang dibangun harus dapat dilintasi kembali ke requirement di PRD.md.
- Setiap task di TASK.md harus memiliki acceptance criteria yang valid sesuai QA.md.
- Jika ada `[NEEDS DECISION]` atau `[ASSUMPTION]` di dalam dokumentasi, jangan mengasumsikan — tandai dan berikan rekomendasi, atau tunggu keputusan dari product owner.

---

## Instruksi Build & Tooling (Placeholder — Stack Netral)

Karena stack teknologi saat ini `[NEEDS DECISION]` (belum diputuskan di awal proyek), bagian ini disediakan sebagai placeholder yang akan diisi setelah teknologi divergensi.

**Setelah stack diputuskan (mis. Next.js + Node/Express/PostgreSQL, atau Laravel + Vue, dsb.), tambahkan ke sini:**

- **Perintah Development:** `npm run dev` / `php artisan serve` — menjalankan server lokal di port default (3000/8000)
- **Perintah Lint:** `npm run lint` / `php vendor/bin/phpcs` — memastikan code convention
- **Perintah Test:** `npm test` / `php artisan test` — menjalankan suite unit & integration test
- **Perintah Type Check:** `npm run typecheck` / `php artisan tinker` — validasi tipe data
- **Perintah Build Produksi:** `npm run build` / `php artisan optimize` — generate assets untuk deploy
- **Perintah Deploy:** `npm run deploy` / `php artisan deploy` — deploy ke environment staging/production
- **Database Migration:** `npm run db:migrate` / `php artisan migrate` — aplikasi schema ke database
- **Seed Data:** `npm run db:seed` / `php artisan db:seed` — populate data awal (skill taxonomy, user dummy, dsb.)

**Konvensi Commit:**
- `git commit -m "feat: <singkat>"` untuk fitur baru
- `git commit -m "fix: <singkat>"` untuk bug fix
- `git commit -m "docs: <singkat>"` untuk perubahan dokumentasi
- `git commit -m "refactor: <singkat>"` untuk refactor tanpa perubahan fitur
- `git commit -m "test: <singkat>"` untuk menambahkan test case

---

## Aturan Kerja & Konvensi Agent

1. **Wajib Baca Dokumen Sebelum Coding** — Setiap sesi kerja dimulai dengan membaca PRD.md untuk memahami scope, lalu melintasi TASK.md untuk lihat task yang akan dikerjakan hari ini.
2. **Tandai `[NEEDS DECISION]` & `[ASSUMPTION]`** — Jika menemui kekeliruan atau hal yang belum ditentukan di dokumentasi, tambahkan komentar `// [NEEDS DECISION]: ...` di code dan lanjutkan; jangan berhenti atau mengarang solusi tanpa koordinasi.
3. **Validasi Acceptance Criteria** — Setiap fitur yang dikerjakan harus bisa divalidasi melalui acceptance criteria di TASK.md dan test case di QA.md. Jika test gagal, fitur dianggap belum selesai.
4. **Jangan Mengarang Requirement Bisnis** — Jika requirement tidak ada di PRD, tandai sebagai `// TODO: discuss with product owner` dan lanjutkan pekerjaan fitur lain. Tidak boleh mengasumsi fitur tambahan sewaktu-waktu.
5. **Prioritaskan MVP** — Fokus pada fitur Must Have di PRD.md fase awal. Should Have & Could Have bisa ditambahkan setelah MVP stabil.
6. **Jangan Gunakan AI/ML Kompleks** — Selama fase MVP, gunakan rule-based system yang transparan (seperti yang telah didefinisikan di PRD.md Talent Matching). AI/ML hanya dipertimbangkan setelah MVP luncur dan terverifikasi requirement.
7. **Jaga Konsistensi Terminologi** — Gunakan nama role (Mahasiswa/Perusahaan/Kampus/Admin/Dosen) dan nama entiti (Skill, Project, Matching, Gap, Recommendation) sesuai dokumentasi. Jangan ubah nama field atau tabel tanpa koordinasi.
8. **Update Dokumentasi Saat Perubahan** — Jika coding menemukan hal yang berbeda dengan dokumentasi, perbaiki dokumentasi terlebih dahulu (menjadi `[NEEDS DECISION]` atau `[ASSUMPTION]` baru) sebelum lanjutkan fitur lain.
9. **Commit Pesan Harus Jelaskan "Mengapa"** — Commit message harus merujuk ke ID task di TASK.md (mis. `fix: TASK-060 - perbaikan kalkulasi match score sesuai formula 50/20/10/10/10`).
10. **Code Review Wajib** — Setiap pull request harus memiliki minimal 1 reviewer selain pengirim. Reviewer memastikan code sesuai acceptance criteria, koneksi ke PRD, dan standar kode yang sudah ditetapkan.

---

## Peta Referensi Lintas Dokumen

| Dokumen | Role Agent | Referensi Utama |
|---------|------------|-----------------|
| **PRD.md** | Penentu scope & fitur | Setiap requirement, user role, MVP scope |
| **G_DESIGN.md** | Penentu arsitektur | Modul, data flow, entity, security |
| **DESIGN.md** | Penentu UI/UX | Setiap halaman, komponen, desain visual |
| **TASK.md** | Penentu pekerjaan | ID task, priority, dependencies, acceptance criteria |
| **QA.md** | Penentu kualitas | Test case, acceptance criteria, bug life cycle |
| **AGENTS.md** | Konteks & aturan | Aturan kerja, navigasi dokumen, konvensi |

**Tinjauan Awal Setiap Sesi:**
1. Buka `opencode.json` — pastikan plugin `ecc-universal` aktif.
2. Baca `AGENTS.md` — kuatkan aturan kerja hari ini.
3. Baca `TASK.md` — lihat task yang dipilih (status TODO).
4. Buka file terkait (mis. PRD.md untuk scope) sebelum coding.
5. Kerjakan task hingga Acceptance Criteria terpenuhi.
6. Catat hasil di `QA.md` test case.
7. Commit dengan merujuk ke ID task.
8. Update status task ke `DONE` di TASK.md.