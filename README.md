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

Salin file contoh `.env.example` ke `.env.local` untuk development lokal:

```bash
cp .env.example .env.local
```

Isi variabel berikut:
- `SUPABASE_URL`: URL proyek Supabase Anda.
- `SUPABASE_KEY`: Service role key (untuk admin/server) atau Anon key.
- `SUPABASE_JWT_SECRET`: JWT secret dari dashboard Supabase.
- `QR_SECRET`: String rahasia untuk enkripsi QR.

### 2. Setup Otomatis

Jalankan perintah berikut untuk memverifikasi koneksi dan membuat bucket storage yang diperlukan:

```bash
npm run setup
```

Skrip ini akan:
- Memeriksa koneksi ke Supabase.
- Membuat bucket storage (`qr`, `faces`, `profiles`, `materials`) jika belum ada.
- Memverifikasi aksesibilitas tabel database.

### 3. Verifikasi Kesehatan Sistem (Health Check)

Sebelum menjalankan aplikasi, Anda dapat memeriksa status koneksi:

```bash
npm run health-check
```

### 4. Menjalankan Aplikasi

```bash
# Development
npm run dev

# Server Backend
npm run server
```

## 🔄 Integrasi CI/CD & GitHub

Sistem ini dirancang untuk deployment otomatis. Skrip integrasi terletak di folder `scripts/`.

- **Development**: Gunakan `.env.local`.
- **Production**: Set environment variables di platform deployment (misal: Vercel, Railway).
- **Validasi**: `npm run check-env` dijalankan otomatis sebelum start.

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
