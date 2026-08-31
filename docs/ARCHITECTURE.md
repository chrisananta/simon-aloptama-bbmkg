# Arsitektur Sistem SIMON BBMKG V

## 1. Konsep Arsitektur Utama

SIMON BBMKG V adalah aplikasi full-stack dengan **backend nyata** (Express + Prisma + PostgreSQL), bukan sekadar penyimpanan lokal di browser. Empat pilar utamanya:

1. **Backend berbasis PostgreSQL (`simon-backend/`)**: Semua data (user, device, stasiun, kalibrasi, SLA/OLA, audit log, petugas) disimpan permanen di database PostgreSQL lewat Prisma ORM — bukan `localStorage`.
2. **Autentikasi berbasis JWT + RBAC**: Setiap endpoint API (kecuali login & health check) wajib menyertakan token JWT yang valid. Aksi sensitif (hapus data, kelola akun) dibatasi khusus role `ADMIN`.
3. **Centralized API Client (frontend)**: Abstraksi tunggal (`src/shared/api/apiClient.ts`) untuk semua pemanggilan API, dengan cache di memori untuk mengurangi request berulang.
4. **Audit Log System**: Setiap aksi tambah/ubah/hapus/login/logout dicatat otomatis ke tabel `audit_logs` dengan aktor, timestamp, dan detail aksi.

---

## 2. Server Gabungan (Frontend + Backend dalam 1 proses)

Aplikasi ini **tidak** memisahkan frontend dan backend jadi dua server berbeda saat development maupun production standar. `server.ts` di root project menjalankan **satu proses Express** yang:

- Me-mount seluruh REST API di bawah prefix `/api/*` dan `/api/v1/*` (lihat `simon-backend/src/routes/index.ts`)
- **Development**: menjalankan Vite dalam *middleware mode* untuk hot-reload frontend
- **Production** (`NODE_ENV=production`): menyajikan file statis hasil `vite build` dari folder `dist/`
- Menjalankan **auto-seed** sekali saat database masih kosong (generate 3 akun awal dengan password acak, hanya ditampilkan sekali di log terminal)

**Static assets (`public/`)**: berkas apa pun di `public/` (mis. `public/geo/provinsi-indonesia.geojson`) di-serve Vite apa adanya di URL root — **dev**: langsung dari disk lewat Vite middleware; **build**: otomatis ikut ter-copy ke `dist/` sehingga tetap bisa diakses di production tanpa konfigurasi tambahan. Frontend mengambilnya lewat `fetch()` biasa di runtime (bukan `import` statis), sehingga file besar (mis. GeoJSON ~850KB) tidak ikut membengkakkan bundle JS utama dan hanya di-load saat komponen peta benar-benar dibuka.

```
[ Browser ]
     │  fetch('/api/...')  ← satu origin, port sama (3000)
     ▼
[ server.ts — Express + (Vite middleware / static dist/) ]
     │
     ▼
[ apiRouter — simon-backend/src/routes/index.ts ]
     │
     ▼
[ Controllers — simon-backend/src/controllers/*.ts ]
     │
     ▼
[ Prisma Client → PostgreSQL ]
```

---

## 3. Alur Autentikasi (Login → Token → Request Terproteksi)

```
1. User submit form login
       │
       ▼
2. POST /api/login (dibatasi rate-limit: maks 10x gagal / 15 menit per IP)
       │
       ▼
3. Backend (userController.login):
   - Cek password pakai bcrypt.compare()
   - Jika akun lama masih pakai password teks polos (migrasi dari versi lama),
     dicocokkan dulu lalu OTOMATIS di-hash ulang ke bcrypt & disimpan
   - Sukses → generate JWT (jsonwebtoken), berisi { id, username, role, name, uptStation }
       │
       ▼
4. Backend set cookie httpOnly "simon_jwt" lewat header Set-Cookie (userController.ts).
   Token TIDAK dikirim di body JSON — hanya "expiresAt" (timestamp non-rahasia)
   yang dikirim di body untuk keperluan UI (mis. hitung mundur sesi).
   Frontend (authService.ts) menyimpan metadata sesi NON-rahasia (user + expiresAt)
   di localStorage — token JWT itu sendiri TIDAK PERNAH ada di localStorage.
       │
       ▼
5. Semua request API berikutnya lewat authFetch() (src/shared/api/http.ts)
   yang menyertakan `credentials: 'include'` — browser otomatis mengikutkan
   cookie httpOnly "simon_jwt" di setiap request tanpa perlu campur tangan JS.
       │
       ▼
6. Backend: middleware verifyToken (simon-backend/src/middleware/authMiddleware.ts)
   membaca token dari cookie (jalur utama) atau header Authorization: Bearer
   (fallback untuk klien non-browser), lalu memvalidasi di SETIAP endpoint
   terproteksi. Jika aksi butuh hak admin → middleware requireAdmin tambahan.
       │
       ▼
7. Jika token invalid/kedaluwarsa → 401 → frontend otomatis logout
   (event 'simon_session_expired', ditangani di AuthContext.tsx)
```

### Keamanan yang diterapkan

| Aspek | Implementasi |
| :--- | :--- |
| Penyimpanan token | Cookie `httpOnly` + `secure` (production) + `sameSite: lax`, nama `simon_jwt` — tidak bisa dibaca JavaScript sama sekali (beda dengan `localStorage` yang selalu bisa dibaca skrip apa pun). Ini juga meredam risiko CSRF lewat atribut `sameSite`. |
| Hashing password | `bcrypt` (10 salt rounds), dengan migrasi otomatis dari data lama |
| Secret JWT | Wajib di-set lewat env var `JWT_SECRET` — server **menolak nyala** jika kosong (`simon-backend/src/config/env.ts`) |
| Brute-force protection | `express-rate-limit` khusus endpoint `/api/login` |
| Otorisasi berbasis peran | Middleware `requireAdmin` untuk aksi hapus data & kelola akun |
| Password di response API | Field `passwordHash` **tidak pernah** dikirim ke frontend (di-strip di `userController.ts`) |
| CORS | Whitelist berbasis hostname yang di-parse dari `Origin` (bukan pencocokan substring mentah) — `server.ts` |
| Auto-seed | Password akun awal di-generate **acak** tiap instalasi baru, dicetak sekali ke log terminal — bukan password hardcoded |

### Kenapa fallback offline TIDAK boleh dipakai saat backend menolak login

`authService.ts` sempat memiliki mode fallback offline (untuk kondisi backend benar-benar tidak bisa dihubungi, mis. mati total). Penting: fallback ini **hanya** boleh aktif jika `fetch()` gagal total (`TypeError`, jaringan terputus) — **bukan** saat backend berhasil dihubungi tapi menjawab menolak (401 password salah, 429 rate-limit). Membedakan dua kondisi ini krusial, karena kalau tertukar, fallback offline bisa jadi celah bypass autentikasi.

---

## 4. Struktur Endpoint API (ringkas — detail lengkap lihat [API.md](./API.md))

Backend mendaftarkan seluruh grup route di root (`/api/...`), tanpa alias namespaced terpisah. Prefix `/api` juga di-mount ulang secara identik di `/api/v1` (lihat `server.ts`).

| Grup | Path | Akses tulis (POST/PUT/DELETE) |
| :--- | :--- | :--- |
| Auth & User | `/api/login`, `/api/logout`, `/api/users` | ADMIN (kecuali login/logout) |
| Devices | `/api/devices` | ADMIN |
| Stations | `/api/stations` | ADMIN |
| Petugas | `/api/petugas` | ADMIN |
| SLA/OLA (entry harian) | `/api/sla-ola` | Login (semua role) |
| SLA/OLA (rekap bulanan) | `/api/sla-ola/monthly` | ADMIN |
| Kalibrasi | `/api/calibration` | ADMIN |
| Audit Log | `/api/audit-logs` | ADMIN |
| History | `/api/history` | — (read-only, wajib login) |
| Health check | `/api/health` | — (publik, tanpa token) |

---

## 5. Fitur Utama SIMON BBMKG V

1. **Dashboard Monitoring**: Visualisasi status ALOPTAMA (Normal, Gangguan, Mati Total), skor SLA/OLA, serta peta sebaran stasiun UPT Wilayah V (`src/features/monitoring/MapContainer.tsx`, Leaflet native — bukan `react-leaflet`), dilengkapi overlay garis batas 38 provinsi (GeoJSON statis dari `public/geo/`, di-toggle lewat menu Layers pada peta) dan pilihan basemap OpenStreetMap / Satelit.
2. **Kalkulator & Pengisian SLA/OLA**: Perhitungan otomatis skor OLA berdasarkan bobot komponen (Logger, Kelistrikan, Komunikasi, Sensor Aktif).
3. **Repository Kalibrasi INSKAL**: Pencatatan riwayat kalibrasi, masa berlaku sertifikat, dan penanggung jawab tim.
4. **Master Database Admin**: CRUD stasiun UPT, peralatan, dan petugas — dibatasi role `ADMIN`, dengan log audit otomatis.
5. **Manajemen Akun & RBAC**: Role `ADMIN` (Admin INSKAL) vs `UPT_PIMPINAN`, menentukan menu & aksi yang boleh diakses (`src/features/auth/AuthContext.tsx` → `permissions`).
6. **Audit Log Aktivitas**: Riwayat lengkap setiap perubahan data, termasuk login/logout, untuk integritas dan transparansi sistem.