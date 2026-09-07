---
title: "PRD.md — Campus Industry Talent Hub"
version: "1.0.0"
date: "2026-09-05"
status: "Approved"
---

# PRD.md — Campus Industry Talent Hub

## Product Overview

**Nama Produk:** Campus Industry Talent Hub

**Product Vision:**
Menjadi jembatan utama antara kebutuhan proyek nyata industri dengan mahasiswa/dosen kampus yang memiliki kompetensi relevan, sekaligus membangun inteligensi kompetensi mahasiswa melalui pengalaman project real.

**Product Mission:**
Menciptakan ekosistem di mana kebutuhan skill industri teridentifikasi, mahasiswa teracak berdasarkan kemampuan mereka, dan pengalaman project menjadi katalis perkembangan karir yang berkelanjutan.

**Problem Statement:**
 Industri memiliki proyek nyata yang butuh kompetensi khusus, namun mahasiswa sering tidak terlihat atau terhubung dengan peluang ini. Sebaliknya, kampus kesulitan memetahui kebutuhan industri yang aktual dan memetakan skill mahasiswa secara real-time. Tidak ada platform terpusat yang menghubungkan keduanya secara efisien.

**Solution:**
Platform terpusat yang menggabungkan Campus Industry Project Marketplace dengan Campus Talent Intelligence Platform. Sistem akan memetakan skill mahasiswa, skill yang dibutuhkan industri, mengidentifikasi skill gap, dan memberikan rekomendasi pengembangan serta matching project yang transparan.

**Target Users:**
1. **Mahasiswa** — mencari project, mengembangkan skill, membangun portfolio
2. **Perusahaan** — menampilkan project, mencari talenta, evaluasi mahasiswa
3. **Kampus/Admin** — mengelola mahasiswa/perusahaan/project, melihat analytics kebutuhan industri
4. **Dosen/Mentor** — membimbing mahasiswa, memantau project

**Value Proposition:**
- Untuk Mahasiswa: Akses project nyata, pengembangan skill terstruktur, rekomendasi pembelajaran berdasarkan gap
- Untuk Perusahaan: Akses talenta terfilter berdasarkan skill, evaluasi kualitas, CSR dampak kampus
- Untuk Kampus: Data-driven decision making, pengelolaan skill taxonomy, identifikasi gap industri

---

## User Roles

### Mahasiswa

- Membuat profil lengkap (bio, foto, latar belakang)
- Mengisi/mendapatkan data kompetensi (skill assessment, sertifikasi, pengalaman)
- Mengunggah portfolio (proyek sebelumnya, kerja akademik, dll)
- Melihat daftar project yang tersedia
- Mendapat rekomendasi project berdasarkan skill match
- Mendaftar/project aplikasi
- Mengikuti assessment/project
- Melihat skill gap diri sendiri
- Mendapat rekomendasi kursus/workshop/mentor untuk peningkatan

### Perusahaan

- Membuat profil perusahaan (deskripsi, industri, size, etc.)
- Membuat project dengan detail requirement
- Menentukan skill requirement per project
- Melihat kandidat yang cocok (talent matching)
- Melihat match score & detail skill
- Memilih mahasiswa untuk project
- Memberikan evaluasi/project assessment setelah selesai

### Kampus/Admin

- Mengelola mahasiswa (CRUD, status aktif/alumni)
- Mengelola perusahaan (verifikasi, profil)
- Mengelola project (validasi, kategori, status)
- Mengelola skill taxonomy (daftar skill, kategori, level)
- Memantau skill mahasiswa terupdate
- Melihat skill gap kolektif mahasiswa
- Melihat kebutuhan industri (trend skill yang dibutuhkan)
- Melihat analytics penggunaan platform

### Dosen/Mentor (Opsional)

- Membimbing mahasiswa dalam project
- Memantau kemajuan project mahasiswa
- Memberikan assessment/evaluasi kuality project
- Memberikan rekomendasi perembangan skill

---

## Core Features

1. **Authentication & Authorization** — Login/register sosial/email, RBAC per role
2. **User Profile** — Halaman profil personal, info kontak, role-specific view
3. **Skill Profile** — Daftar skill, proficiency level, kategori, sumber (course/certification/experience)
4. **Portfolio** — Unggahan file/link, deskripsi proyek, media (code repo, design, tulisan)
5. **Industry Project Marketplace** — Search & filter project, detail project, status aktif/draft/ditutup
6. **Project Management** — Create/Edit/Hapus project (perusahaan), tracking progress
7. **Skill Requirement** — Define skill + proficiency level yang dibutuhkan project
8. **Talent Matching** — Hitung match score, daftar kandidat terurut, detail per-fitur
9. **Talent Intelligence** — Dashboard skill landscape, identifikasi gap, tren industri
10. **Skill Gap Analysis** — Alur required → current → gap → classification → recommendation
11. **Learning/Development Recommendation** — Course, workshop, certification, practice project, mentor
12. **Assessment** — Form evaluasi selama/ sesudah project, skor numerik + catatan
13. **Project Evaluation** — Review dari pihak perusahaan ke mahasiswa (dan sebaliknya)
14. **Notification** — Notifikasi mendaftar, update status, deadline, rekomendasi
15. **Dashboard** — Halaman utama per role, ringkasan aktif, pending, completed
16. **Analytics** — Visualisasi data: skill distribution, match rate, project success, industri demand

---

## Talent Matching

**Konsep:** Sistem menghitung **Talent Match Score** untuk membandingkan kandidat mahasiswa dengan requirement project.

**Formula Rule-based (MVP proposal, but `[NEEDS DECISION]` untuk validasi final):**

```text
Match Score =
Skill Match          50%
Experience         20%
Portfolio          10%
Certification      10%
Availability       10%
```

**Faktor detail per komponen:**

- **Skill Match:** Persentase overlap skill project vs skill mahasiswa yang dimiliki, dengan bobot berdasarkan proficiency level
- **Experience:** Tahun pengalaman proyek atau relevansi pengalaman (internship, course, project akademik)
- **Portfolio:** Kualitas portfolio (adanya link repo, deskripsi, testimoni), skor 0–100
- **Certification:** Sertifikat terverifikasi (bobot sesuai relevansi skill)
- **Availability:** Status aktif, jadwal fleksibel, ketersediaan waktu

**Catatan:** Bobot di atas hanya proposal awal dan harus melalui `[NEEDS DECISION]` sebelum dipakai di produksi. Sistem harus memungkinkan penyesuaian bobot oleh kampus/admin.

---

## Skill Gap Analysis

**Alur:**

```text
Required Skill
        ↓
Current Student Skill
        ↓
Gap Calculation
        ↓
Gap Classification
        ↓
Recommendation
```

**Contoh numerik:**

```text
Project membutuhkan:
React      Level: 80 (scale 0–100)

Mahasiswa memiliki:
React      Level: 55

Skill Gap:
25 point

Classification: Medium Gap
Recommendation: Course React dasar + Practice project sederhana
```

**Classifikasi Gap:**

| Nilai Gap | Classification | Rekomendasi |
|-----------|----------------|-------------|
| 0         | No Gap         | Lanjutkan/project langsung |
| 1–20      | Small Gap      | Course/Workshop pendek |
| 21–40     | Medium Gap     | Course + Practice project |
| 41–60     | Large Gap      | Certification + Mentor |
| >60       | Critical Gap   | Intensive training + Project bantuan |

---

## Recommendation System

Sistem memberikan rekomendasi berdasarkan skill gap terdeteksi:

- **Course** — Kursus online (Coursera, Udemy, dsb) sesuai skill minimal
- **Workshop** — Workshop intensif (internal kampus atau external)
- **Certification** — Sertifikasi terpadu (industri atau lembaga)
- **Practice project** — Project mini internal atau micro-project yang dipimpin
- **Mentor** — Penugasan dosen/mentor yang mengasuh pengembangan
- **Industry project** — Project yang sesuai gap dan availability mahasiswa

Setiap rekomendasi dilengkapi dengan:

- Judul rekomendasi
- Skill target
- Estimasi waktu/durasi
- Sumber/daya pendukung
- Link/referensi

---

## MVP Scope

### Must Have

- Authentication (login/register)
- User Profile (Mahasiswa/Perusahaan)
- Skill Profile (dasar + level)
- Project Marketplace (lihat project, filter basic)
- Talent Matching (hitung match score, daftar kandidat)
- Notification (dasar: mendaftar, update status)

### Should Have

- Portfolio upload
- Skill Gap Analysis (hitung & klasifikasi)
- Recommendation System (sederhana berdasarkan gap)
- Assessment Form (basic evaluasi project)
- Dashboard per role

### Could Have

- Advanced filtering (lokasi, durasi, gaji)
- Real-time chat mahasiswa-perusahaan
- Gamifikasi skill development
- Integrasi dengan LMS kampus
- Export data CSV/Excel

### Future

- AI/ML prediction skill masa depan
- Virtual mentor / chatbot
- Multi-language support
- Mobile native app
- Integration dengan kredensial eksternal (LinkedIn, GitHub, dll)

---

## [NEEDS DECISION] — Daftar Keputusan yang Belum Ditetapkan

1. **Bobot formula match score** — Apakah menggunakan proposal 50/20/10/10/10 atau nilai lain? Siapa yang mengeset bobot?
2. **Skala proficience skill** — Range 0–100 atau A/B/C/D/F? Bagaimana konversi pengalaman nyata ke scale?
3. **Klasifikasi gap** — Apakai batas 0/1–20/21–40/41–60/>60 atau disesuaikan dengan kurva distribusi?
4. **Validasi rekomendasi** — Sistem rekomendasi berdasarkan rule-based manual atau akan dikembangkan AI/ML di fase selanjutnya?
5. **Sertifikasi terverifikasi** — Siapa otoritas mencatat sertifikat ( kampus, perusahaan, atau pihak ketiga)?
6. **Availability calculation** — Apa syarat dianggap "tersedia"? (Full-time, part-time, projek side)?
7. **Level project difficulty** — Apakah ada skor kesulitan (Easy/Medium/Hard) yang mempengaruhi match score?
8. **Daftawal skill taxonomy** — Skill apa saja yang di-bootstrap di sistem? Siapa yang mengurus daftar ini?

---

## [ASSUMPTION] — Asumsi Teknis Awal

1. Skill proficiency scale 0–100 dengan konversi dari: sertifikasi (mapping nilai), course completed (pass/fail → level), pengalaman proyek (estimasi tahun/kompleksitas).
2. System akan di-deploy dengan stack teknologi [NEEDS DECISION]— saat ini digunakan Netral (generic) di seluruh dokumen.
3. Data skill taxonomy awal diimpor dari sumber terbuka atau dikurasi manually oleh admin kampus.
4. Autentikasi menggunakan email/password + optionally sosial (Google/GitHub) sebagai opsi tambahan.
5. File portfolio diunggah ke storage cloud (konfigurasi [NEEDS DECISION] setelah stack ditentukan).
6. Setiap entitas memiliki created_at, updated_at, dan soft-delete logic.
7. API akan menggunakan REST convention dengan JSON response.
8. Role-based access control (RBAC) minimal: Mahasiswa, Perusahaan, Kampus/Admin, Dosen.

---

## MVP Success Metrics

- 80% mahasiswa dapat mendaftar project dalam 5 menit setelah login
- Sistem match score dihitung < 2 detik per kandidat
- 70% project memiliki setidaknya 1 kandidat dengan match score > 70%
- 90% evaluasi project dapat dilaksanakan tanpa error
- Skill gap terdeteksi akurat minimal 80% kasus uji