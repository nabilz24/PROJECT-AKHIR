# DESIGN.md — UI/UX Design Specification

## Design Principles

Platform Campus Industry Talent Hub harus terasa:

- **Modern** — Desain antarmuka yang bersih, tipografi modern, warna palette yang profesional namun menyegarkan. Tidak ada elemen desain yang ketinggalan zaman.
- **Professional** — Karena platform menghubungkan mahasiswa dengan industri, tampilan harus memberikan rasa percaya dan serius. Tidak ada elemen "main-main" atau remaja.
- **Academic** — Elemen akademis subtle (warna akademis, struktur yang terorganisir, terminologi yang tepat) namun tetap modern. Platform harus merespek konteks kampus.
- **Industry-oriented** — Desain mencerminkan dunia kerja: struktur yang jelas, informasi yang padat namun terbaca, navigasi yang efisien. Pengguna (perusahaan) harus merasa nyaman menggunakan platform ini.
- **Simple** — Hindari desain yang terlalu ramai. Fokus pada user journey yang utama. Setiap elemen di halaman harus memiliki tujuan yang jelas.
- **Data-driven** — Antarmuka menampilkan data dengan visualisasi yang jelas (chart, tabel, progress bar) tanpa membanjiri pengguna dengan angka mentah sekaligus. Informasi hierarkis: overview → detail → actions.

---

## Information Architecture

### Navigasi Student

```text
├─ Dashboard      → Ringkasan aktivitas, project terbaru, rekomendasi skill
├─ Projects       → Browse cari project industry, filter skill/level
├─ My Applications → Lihat status aplikasi yang saya kirim
├─ My Skills      → Daftar skill saya + proficiency level
├─ Skill Gap      → Analisis gap skill vs requirement project
├─ Recommendations → Kursus/workshop/sertifikasi yang sudah dipilih/dipilih
├─ Portfolio      → Unggahan proyek sebelumnya, karya tulis, kode
├─ Profile        → Profil personal, kontak, setelan akun
└─ Settings       → Password, notifikasi, keluar akun
```

### Navigasi Company

```text
├─ Dashboard      → Ringkasan project aktif, kandidat, evaluasi menunggu
├─ Projects       → Lihat/kelola project yang dibuat
├─ Candidates     → Daftar mahasiswa yang mendaftar, filter match score
├─ Talent Matching → Detail evaluasi kecocokan kandidat
├─ Project Management → Create/edit/project status
├─ Profile        → Profil perusahaan, setting akun
└─ Settings       → Notifikasi, keluar akun
```

### Navigasi Campus/Admin

```text
├─ Dashboard      → Ringkasan total, statistik utama, alert penting
├─ Students       → Data mahasiswa, filter search, export
├─ Companies      → Data perusahaan terverifikasi, verifikasi status
├─ Projects       → Lihat semua project, filter status, kategori
├─ Skills         → Taxonomy skill, managemen daftar skill, data seed
├─ Skill Gap      → Analisis gap kolektif mahasiswa vs butuh industri
├─ Industry Demand → Tren skill yang dicari perusahaan
├─ Analytics      → Visualisasi data mendalam, laporan export
└─ Settings       → Konfigurasi sistem, pengguna, integrasi
```

---

## Main Screens

### 1. Login

- **Tujuan:** Masuk ke sistem
- **Komponen:** Form email/password, tombol login, link "Lupa password?", link daftar
- **Info yang ditampilkan:** Hanya branding/login form
- **Primary action:** Login
- **Secondary action:** Daftar dengan email
- **Empty state:** Belum ada akun
- **Loading state:** Proses autentikasi
- **Error state:** Kredensial salah, akun kunci, error server

### 2. Register

- **Tujuan:** Membuat akun baru
- **Komponen:** Form memilih role (Mahasiswa/Perusahaan), input data dasar, setuju ketentuan
- **Info yang ditampilkan:** Pilihan role menentukan field yang muncul (jika Mahasiswa: NPM, Program Studi; jika Perusahaan: Nama Perusahaan, Industri)
- **Primary action:** Daftar dengan memilih role
- **Secondary action:** Login sebagai tamu (jika ada)
- **Empty state:** —
- **Loading state:** Proses pendaftaran, verifikasi email
- **Error state:** Email sudah terdaftar, validasi field gagal, ketentuan tidak disetujui

### 3. Student Dashboard

- **Tujuan:** Halaman utama mahasiswa, ringkasan aktivitas
- **Komponen:** Kartu ringkasan (project baru, rekomendasi skill, aplikasi pending), notifikasi, quick link ke Projects/Skills/Gap
- **Info yang ditampilkan:** Jumlah project baru minggu ini, rekomendasi skill top 3, aplikasi yang sudah dikirim tapi belum diverifikasi
- **Primary action:** "Lihat semua project" atau "Cek rekomendasi skill"
- **Secondary action:** Navigasi ke menu lain via sidebar
- **Empty state:** Belum ada project rekomendasi, belum ada notifikasi
- **Loading state:** Memuat data ringkasan dari API
- **Error state:** Gagal memuat ringkasan, coba lagi

### 4. Student Profile

- **Tujuan:** Edit profil personal
- **Komponen:** Form bio, foto profil, kontak (email/telepon), setelan preferensi notifikasi
- **Info yang ditampilkan:** Data diri yang sudah terisi, preview foto
- **Primary action:** Simpan perubahan profil
- **Secondary action:** Hapus foto, kembali ke dashboard
- **Empty state:** Belum ada foto/bio (tampilkan placeholder "Tambah foto/bio")
- **Loading state:** Mengirim data ke server
- **Error state:** Gagal upload foto, validasi email gagal

### 5. Skill Profile

- **Tujuan:** Lihat & kelola daftar skill beserta proficency level
- **Komponen:** Tabel daftar skill + level, tombol "Add Skill", filter kategori, tombol edit level
- **Info yang ditampilkan:** Setiap skill nama, level (0-100 atau kategori), sumber (course/cert/experience), tombol hapus
- **Primary action:** Tambah skill baru atau update level skill existing
- **Secondary action:** Urutkan skill berdasarkan level, filter kategori
- **Empty state:** Belum ada skill terdaftar (tampilkan CTA "Tambah skill pertama")
- **Loading state:** Memuat daftar skill dari server
- **Error state:** Gagal menyimpan level skill, skill tidak ditemukan di taxonomy

### 6. Skill Gap

- **Tujuan:** Analisis kesenjangan skill diri vs project yang dilaporkan
- **Komponen:** Tabel "Project yang saya minggulkan" vs "Skill yang dibutuhkan" vs "Skill yang saya miliki", visual bar gap, tombol "Lihat rekomendasi"
- **Info yang ditampilkan:** Per skill: required level, current level, gap value (nilai), klasifikasi (Small/Medium/Large/Critical), rekomendasi action
- **Primary action:** "Lihat rekomendasi pembelajaran" atau "Daftar project sesuai gap"
- **Secondary action:** Filter project berdasarkan gap size, ekspor daftar gap ke CSV
- **Empty state:** Belum ada project dilaporkan/skill tidak ada gap (tampilkan "Selamat! Skill Anda mencukupi")
- **Loading state:** Menghitung gap antar database student vs project
- **Error state:** Gagal menghitung gap, data tidak konsisten

### 7. Recommendations

- **Tujuan:** Lihat rekomendasi kursus/workshop/sertifikasi berdasarkan skill gap
- **Komponen:** Daftar kartu rekomendasi, each card: judul, deskripsi singkat, durasi estimasi, prioritas, tombol "Terima/Progress" / "Tangguh"
- **Info yang ditampilkan:** Skill target, sumber (platform mana), cost (jika ada), link registrasi, deadline
- **Primary action:** Klik "Terima/Simpan ke rencana belajar"
- **Secondary action:** Filter berdasarkan priority (High/Medium/Low), filter berdasarkan tipe (course/workshop/cert)
- **Empty state:** Belum ada rekomendasi (tampilkan "Semua skill Anda sudah optimal")
- **Loading state:** Memuat daftar rekomendasi dari engine
- **Error state:** Gagal memuat rekomendasi, coba lagi nanti

### 8. Project Marketplace

- **Tujuan:** Browse dan cari project industry
- **Komponen:** Filter kategori/project, search bar, kartu project (judul, perusahaan, skill required, match score jika sudah login), tombol "Daftar"
- **Info yang ditampilkan:** Setiap kartu: judul project, nama perusahaan, sector industri, skill requirement ringkas, level kesulitan (opsional), deadline
- **Primary action:** "Daftar Project" atau "Lihat Detail"
- **Secondary action:** Filter by skill, filter by level, filter by kategori industri, sort by match score/terbaru
- **Empty state:** Tidak ada project yang cocok dengan filter yang dipilih (tampilkan saran filter lain)
- **Loading state:** Memuat daftar project dari server (skeleton cards)
- **Error state:** Gagal memuat project, coba filter lain

### 9. Project Detail

- **Tujuan:** Lihat detail project dan informasi lengkap
- **Komponen:** Header project (judul, perusahaan, logo), deskripsi panjang, skill requirement lengkap (tabel skill + level), deadline, jumlah aplikasi yang sudah diterima, tombol "Daftar Project"
- **Info yang ditampilkan:** Breakdown skill per-fit (skill dibutuhkan vs skill kandidat yang umum), deskripsi proyek, tanggapan perusahaan
- **Primary action:** "Daftar Project" (jika belum aplikasi) atau "Sudah Terdaftar" (jika sudah)
- **Secondary action:** Bagikan link project, simpan project ke favorite (jika fitur ada)
- **Empty state:** —
- **Loading state:** Memuat detail dari API (skeleton area)
- **Error state:** Project tidak ditemukan, akses ditolak (bukan kandidat)

### 10. Apply Project

- **Tujuan:** Mengajukan aplikasi ke project
- **Komponen:** Form memilih project, unggah portfolio (opsional), cover letter, daftar skill yang digunakan sebagai bekal, persetujuan ketentuan
- **Info yang ditampilkan:** Ringkasan project yang diajukan, field wajib terisi merah, prasyarat checklist (skill minimal terpenuhi?)
- **Primary action:** Kirim aplikasi
- **Secondary action:** Batalkan formulir, kembali ke detail project
- **Empty state:** Belum ada project yang dipilih
- **Loading state:** Validasi form dan pengiriman ke server
- **Error state:** Validasi gagal (skill tidak terpenuhi, portfolio format salah), project sudah ditutup, aplikasi duplikat

### 11. Company Dashboard

- **Tujuan:** Halaman utama perusahaan, ringkasan aktivitas
- **Komponen:** Kartu ringkasan (project aktif, kandidat menunggu, evaluasi menunggu), notifikasi, quick link ke Projects/Candidates/Talent Matching
- **Info yang ditampilkan:** Total project yang dipublikasikan, total aplikasi diterima, evaluasi yang belum selesai, match score rata-rata kandidat teratas
- **Primary action:** "Kelola Project" atau "Lihat Kandidat"
- **Secondary action:** Navigasi menu lain
- **Empty state:** Belum ada project atau kandidat
- **Loading state:** Memuat ringkasan dari API
- **Error state:** Gagal memuat ringkasan

### 12. Create Project

- **Tujuan:** Perusahaan membuat project baru
- **Komponen:** Form judul, deskripsi, kategori industri, field skill requirement (multi-select dari taxonomy), level kesulitan, deadline, foto thumbnail, status publish/draft
- **Info yang ditampilkan:** Validasi skill requirement (apakah skill ada di taxonomy), preview thumbnail, petunjuk input skill level (0-100 atau kategori)
- **Primary action:** Simpan project (draft atau publish)
- **Secondary action:** Batal, kembali ke dashboard
- **Empty state:** Form kosong (semua field kosong)
- **Loading state:** Validasi dan penyimpanan ke database
- **Error state:** Skill tidak ada di taxonomy, deadline lewat, foto terlalu besar, validasi perusahaan tidak terverifikasi

### 13. Candidate Matching

- **Tujuan:** Perusahaan melihat kandidat yang cocok dengan project
- **Komponen:** Tabel kandidat terurut berdasarkan match score, kolom: nama mahasiswa, foto kecil, match score %, skill overlap, tombol "Lihat Profil", tombol "Terima/Tolak"
- **Info yang ditampilkan:** Breakdown per skill (skill kandidat vs skill requirement), bobot skill yang kuat/lemah
- **Primary action:** "Terima Kandidat" (merekrut mahasiswa ini) atau "Tolak Kandidat"
- **Secondary action:** Filter berdasarkan skor, filter berdasarkan skill overlap, ekspor daftar kandidat
- **Empty state:** Tidak ada kandidat yang memenuhi minimum requirement (tampilkan "Tidak ada kandidat yang cocok, sesuaikan requirement skill")
- **Loading state:** Menghitung match score dan memuat daftar kandidat
- **Error state:** Sistem error menghitung score, data skill tidak lengkap

### 14. Campus Dashboard

- **Tujuan:** Halaman utama admin kampus, ringkasan strategis
- **Komponen:** Kartu statistik (total mahasiswa, total perusahaan terverifikasi, total project, rata-rata match score), alert sektor skill yang naik/turun, navigasi cepat ke modul lain
- **Info yang ditampilkan:** Grafik perkembangan skill mahasiswa qua waktu, percentage perusahaan yang sudah verifikasi, proyek berstatus apa
- **Primary action:** "Lihat Detail Statistik" atau "Masuk ke modul Skill Gap"
- **Secondary action:** Navigasi ke Students/Companies/Projects/Skills
- **Empty state:** Data kosong (kasus brand baru)
- **Loading state:** Mengakumulasikan data dari berbagai tabel
- **Error state:** Gagal mengambil data aggregasi

### 15. Skill Analytics

- **Tujuan:** Visualisasi data skill & industri demand
- **Komponen:** Grafik distribusi skill mahasiswa (pie/bar), grafik tren skill yang dicari industri (line chart), heatmap skill gap, tabel top skill yang paling diminati, filter per program studi/angkatan
- **Info yang ditampilkan:** Visualisasi yang memudahami pola skill, insight untuk kurikulum kampus, perbandingan dengan previous periode
- **Primary action:** Filter periode, filter program studi, ekspor grafik ke PNG/PDF
- **Secondary action:** Filter berdasarkan kategori skill (technical/soft skill), toggle tampilkan detail data
- **Empty state:** Tidak ada data untuk periode dipilih (tampilkan "Tidak ada data untuk periode ini")
- **Loading state:** Menggenerasi visualisasi dari agregasi data
- **Error state:** Gagal generate chart, coba filter lain

---

## Talent Match UI

Konsep visual presentasi match score di halaman candidate matching:

```text
PROJECT: Frontend Developer — E-commerce Platform

Required Skills:
React        ████████░░ 80%
JavaScript   █████████░ 90%
Node.js      ██████░░░░ 60%

CANDIDATE: Andi (24 tahun, Informatika UI 2022)

Current Skill Level:
React        85%
JavaScript  92%
Node.js      70%

MATCH SCORE: 89%

Per-Skill Breakdown:
✅ JavaScript — Kuat (92% > 90% required)
⚠️  React — Sedang (85% vs 80% required, +5% margin)
❌ Node.js — Lemah (70% vs 60% required, but still acceptable)

Keterangan visual:
- ██ = Level kemampuan kandidat
- ░░ = "Sisa" yang masih butuh didevelop
- Warna hijau = Kuat/Meets requirement
- Warna kuning = Sedang/Close to requirement
- Warna merah = Masih jauh (akan ditandai di rekomendasi)
```

**Prinsip desain:**

1. Match score ditampilkan secara prominent, tetapi **bukan satu-satunya indikator** keputusan penerimaan.
2. Breakdown per-fitur skill ditampilkan agar perusahaan bisa melihat di mana kandidat kuat/lemah.
3. Warna digunakan untuk komunikasi cepat status: hijau = memuaskan, kuning = close, merah = perlu pembelajaran.
4. Terdapat catatan bahwa kandidat boleh diterima meski ada skill gap kecil, asalkan ada rekomendasi pembelajaran atau mentor yang tersedia.
5. Tombol aksi "Terima" / "Tolak" harus memiliki disabled state jika match score dibawah batas minimum yang ditetapkan admin kampus.

---