# Panduan Deployment dan Koneksi Supabase

## 1. Konfigurasi Environment Variables

Aplikasi ini menggunakan environment variables untuk konfigurasi koneksi ke Supabase dan Backend API.

### Local Development (.env)
Pastikan file `.env` di root project memiliki isi sebagai berikut:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3000
```

### Production (GitHub Pages / Vercel / Netlify)
Saat men-deploy ke environment production, Anda perlu mengatur environment variables di dashboard hosting provider Anda.

**GitHub Secrets (untuk GitHub Actions):**
1. Masuk ke Repository Settings -> Secrets and variables -> Actions.
2. Tambahkan Repository Secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` (URL backend production Anda, misal: `https://api.myapp.com`)

## 2. Koneksi Supabase

Aplikasi menggunakan `@supabase/supabase-js` untuk koneksi. Client diinisialisasi di `src/config/supabase.ts`.

**Fitur Koneksi:**
- **Auth**: Menggunakan Supabase Auth untuk login/register.
- **Database**: Menggunakan Realtime subscriptions untuk update data (contoh: attendance, assignments).
- **Storage**: Menggunakan Supabase Storage untuk upload materi dan foto profil.

**Validasi Koneksi:**
Aplikasi secara otomatis memvalidasi koneksi saat start-up. Jika konfigurasi salah, error akan ditampilkan di console dan UI.

## 3. Deployment Backend

Server backend (`server.js`) perlu di-deploy secara terpisah (misal ke Heroku, Railway, atau Render) karena GitHub Pages hanya untuk static frontend.

1. **Deploy Server**:
   - Push kode ke repository.
   - Hubungkan ke layanan hosting Node.js.
   - Set environment variables di dashboard hosting:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY` (untuk admin tasks)
     - `PORT` (biasanya otomatis diset oleh provider)

2. **Update Frontend**:
   - Setelah backend live, update `VITE_API_URL` di konfigurasi frontend Anda agar mengarah ke URL backend yang baru.

## 4. Troubleshooting Login

### Error: `net::ERR_CONNECTION_REFUSED` / `TypeError: Failed to fetch`
- **Penyebab:** Server backend tidak berjalan atau tidak dapat diakses.
- **Solusi:**
  1. Jalankan backend dengan `npm run server`.
  2. Pastikan `VITE_API_URL` di `.env` sesuai (default: `http://localhost:3000`).

### Error: `500 Internal Server Error` (Failed to fetch profile)
- **Penyebab:** Kredensial Supabase (URL/Key) di backend salah atau kadaluarsa.
- **Solusi:**
  1. Cek file `.env` dan pastikan `SUPABASE_URL`, `SUPABASE_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` sudah benar.
  2. Restart server backend setelah mengubah `.env`.
  3. Pastikan format key adalah JWT yang valid (dimulai dengan `eyJ...`).

### Error: `401 Unauthorized` (Invalid API Key)
- **Penyebab:** API Key yang digunakan tidak valid untuk Project URL tersebut.
- **Solusi:**
  1. Login ke Supabase Dashboard > Project Settings > API.
  2. Generate ulang key jika perlu atau copy ulang `anon` dan `service_role` keys.
  3. Update `.env` di local dan production secrets.
