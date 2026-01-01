# Sistem Absensi Web - Integrasi Supabase & GitHub

Proyek ini adalah aplikasi web absensi yang terintegrasi dengan Supabase untuk backend (Database, Auth, Storage) dan GitHub untuk CI/CD.

## 🚀 Fitur Utama

- **Absensi QR Code**: Generator QR code terenkripsi dengan metadata mata kuliah.
- **Integrasi Supabase Otomatis**: Skrip provisioning dan health check.
- **Manajemen Tugas & Materi**: Dashboard dosen untuk mengelola kelas.
- **Keamanan**: Enkripsi AES-256-GCM untuk payload QR.

## 🛠️ Prasyarat Instalasi

- Node.js (v16+)
- NPM atau Yarn
- Akun Supabase

## ⚙️ Setup & Konfigurasi

### 1. Konfigurasi Environment Variables

Salin file contoh `.env.example` ke `.env.local` (atau buat file `.env`) untuk development lokal:

```bash
cp .env.example .env
```

Isi variabel berikut sesuai kebutuhan Frontend (Vite) dan Backend (Node.js):

**Frontend (Vite):**
- `VITE_SUPABASE_URL`: URL proyek Supabase Anda.
- `VITE_SUPABASE_ANON_KEY`: Public Anon Key dari Supabase.
- `VITE_API_URL`: URL Backend API (default: `http://localhost:3000`).

**Backend (Node.js):**
- `SUPABASE_URL`: URL proyek Supabase Anda (sama dengan VITE_SUPABASE_URL).
- `SUPABASE_KEY`: Public Anon Key (sama dengan VITE_SUPABASE_ANON_KEY).
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key (secret) dari Supabase -> Project Settings -> API.
- `QR_SECRET`: String rahasia untuk enkripsi QR.
- `PORT`: Port server backend (default: 3000).

### 2. Setup Otomatis

Jalankan perintah berikut untuk memverifikasi koneksi dan membuat bucket storage yang diperlukan:

```bash
npm run setup
```

Skrip ini akan:
- Memeriksa koneksi ke Supabase.
- Membuat bucket storage (`qr`, `faces`, `profiles`, `materials`) jika belum ada.
- Memverifikasi aksesibilitas tabel database.

> **PENTING**: Jika skrip ini gagal karena error RLS (Row Level Security) atau tabel hilang, silakan jalankan isi file `supabase/migrations/fix_setup.sql` di SQL Editor pada Dashboard Supabase Anda. Ini akan memperbaiki permission dan membuat tabel yang hilang.

### 3. Verifikasi Kesehatan Sistem (Health Check)

Sebelum menjalankan aplikasi, Anda dapat memeriksa status koneksi:

```bash
npm run health-check
```

### 4. Menjalankan Aplikasi

```bash
# Development Frontend
npm run dev

# Server Backend
npm run server
```

## 🔄 Panduan Deployment dan Koneksi Supabase

### 1. Koneksi Supabase
Pastikan Anda telah membuat proyek di [Supabase](https://supabase.com/).
- Masuk ke **Project Settings** > **API**.
- Ambil `Project URL`, `anon public` key, dan `service_role` secret.
- Masukkan ke dalam file `.env` seperti yang dijelaskan di atas.

### 2. Deployment ke GitHub & Production
Saat melakukan deployment (misalnya ke Vercel untuk Frontend dan Railway/Render untuk Backend), pastikan untuk mengatur **Environment Variables** di dashboard hosting masing-masing.

**GitHub Secrets (untuk CI/CD Actions):**
Jika Anda menggunakan GitHub Actions, tambahkan secrets di Repository Settings > Secrets and variables > Actions:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Frontend Deployment (Vercel/Netlify):**
- Set `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
- Set `VITE_API_URL` ke URL backend production Anda.

**Backend Deployment (Railway/Render/Fly.io):**
- Set `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`.
- Set `QR_SECRET`.

### 3. Troubleshooting Koneksi & Login
Jika Anda mengalami error seperti `net::ERR_CONNECTION_REFUSED` atau `TypeError: Failed to fetch` saat login:

1. **Pastikan Backend Berjalan**: Error `net::ERR_CONNECTION_REFUSED` biasanya terjadi karena server backend tidak berjalan. Jalankan `npm run server` di terminal terpisah.
2. **Fallback Mode**: Sistem ini dilengkapi dengan fitur fallback. Jika backend mati, aplikasi akan mencoba menghubungi Supabase secara langsung. Agar fitur ini berjalan lancar, pastikan RLS Policy di database Supabase sudah benar.
3. **Perbaikan RLS**: Jika fallback gagal (misal: login berhasil tapi data user tidak muncul), jalankan skrip perbaikan RLS:
   ```bash
   node scripts/fix-rls.js
   ```
   Ini akan memperbarui policy database agar user dapat membaca profil mereka sendiri tanpa hambatan.

4. **Langkah Lainnya**:
   - Cek console browser untuk error detail.
   - Pastikan `VITE_API_URL` di frontend mengarah ke URL backend yang benar (jangan localhost jika di production).
   - Pastikan Supabase Project tidak sedang "Paused".
   - Verifikasi bahwa table `users`, `attendance_sessions`, dll sudah ada di database Supabase.

## 📱 Fitur QR Code

QR Code yang dihasilkan mengandung payload terenkripsi yang mencakup:
- ID Dosen
- Tipe QR (`class` untuk absensi kelas)
- Metadata Mata Kuliah (Nama, Kode) - *Ditampilkan di dashboard dosen*
- Validasi waktu dan lokasi (opsional)

### Format Payload Terenkripsi
Payload dienkripsi menggunakan AES-256-GCM. Struktur data setelah didekripsi:
```json
{
  "userId": "uuid",
  "type": "class",
  "course": {
    "id": "uuid",
    "name": "Nama Mata Kuliah",
    "code": "KODE123"
  },
  "data": "session_token",
  "settings": { ... }
}
```

## 🤝 Kontribusi

1. Clone repositori.
2. Buat branch fitur (`git checkout -b fitur-baru`).
3. Commit perubahan (`git commit -m 'Tambah fitur'`).
4. Push ke branch (`git push origin fitur-baru`).
5. Buat Pull Request.
