# MeGallery - Private Offline Camera to Google Drive

Aplikasi web kamera (Progressive Web App) yang memungkinkan Anda mengambil foto secara privat:
- **Zero OS Gallery Pollution**: Foto **TIDAK PERNAH** masuk ke galeri lokal / media storage perangkat (Android Gallery / Google Photos / iOS Photos).
- **Offline-First Storage**: Foto disimpan dalam sandbox IndexedDB internal saat offline.
- **Direct to Google Drive**: Foto otomatis diunggah ke folder Google Drive pilihan Anda begitu perangkat terhubung ke internet.
- **Modern & Tactile UI**: Tema studio kamera dengan palet warna `#FEF9E1`, `#E5D0AC`, `#A31D1D`, `#6D2323`, haptic vibration, dan micro-interactions 60fps.
- **Max Web Security**: Pure client-side (tanpa database server luar), strict Content Security Policy (CSP), dan scope Google Drive `drive.file` (hanya dapat mengakses file yang dibuat oleh aplikasi ini).

---

## Cara Menjalankan Secara Lokal

1. **Jalankan Dev Server**:
   ```bash
   npm run dev
   ```
   Buka URL yang ditampilkan (contoh: `http://localhost:5173`).

2. **Akses dari HP (Local Network)**:
   Jalankan dengan flag `--host`:
   ```bash
   npx vite --host
   ```
   Buka IP lokal (contoh: `http://192.168.1.x:5173`) di browser HP Anda.
   *(Catatan: Browser modern mewajibkan HTTPS atau `localhost` untuk membuka kamera. Jika membuka via IP di HP, gunakan tunnel HTTPS gratis seperti Cloudflare Tunnel / Ngrok, atau deploy ke Vercel/Netlify/GitHub Pages).*

3. **Build untuk Production**:
   ```bash
   npm run build
   ```
   Hasil build siap di-deploy ada di folder `dist/`.

---

## Panduan Setup Google Drive API

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat project baru (contoh: `MeGallery-App`).
3. Aktifkan **Google Drive API** di menu *APIs & Services > Library*.
4. Buka *APIs & Services > OAuth consent screen*:
   - Pilih **External**.
   - Isi nama aplikasi dan email.
   - Tambahkan scope: `.../auth/drive.file`.
5. Buka *APIs & Services > Credentials*:
   - Klik **Create Credentials > OAuth client ID**.
   - Application type: **Web application**.
   - Pada **Authorized JavaScript origins**, tambahkan domain hosting Anda (contoh: `http://localhost:5173` atau domain HTTPS deployment).
   - Salin **Client ID** yang dihasilkan.
6. Buka web app MeGallery:
   - Klik ikon **Pengaturan** (gear) di kanan atas.
   - Masukkan **Client ID**.
   - Paste link folder Google Drive Anda (contoh: `https://drive.google.com/drive/folders/1AbC...`).
   - Klik **Hubungkan Google Drive**.

---

## Cara Install sebagai PWA di HP

- **Android (Chrome)**: Buka menu titik tiga (⋮) > pilih **Add to Home screen** (Tambahkan ke Layar Utama).
- **iOS (Safari)**: Buka tombol Share > pilih **Add to Home Screen**.
Aplikasi akan terbuka fullscreen tanpa bilah alamat browser, persis seperti aplikasi kamera native.
