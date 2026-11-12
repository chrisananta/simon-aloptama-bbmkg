# Arsitektur Sistem SIMON BBMKG V

## 1. Konsep Arsitektur Utama

SIMON BBMKG V adalah aplikasi full-stack dengan **backend nyata** (Express + Prisma + PostgreSQL), bukan sekadar penyimpanan lokal di browser. Empat pilar utamanya:

1. **Backend berbasis PostgreSQL (`simon-backend/`)**: Semua data (user, device, stasiun, kalibrasi, SLA/OLA, audit log, petugas) disimpan permanen di database PostgreSQL lewat Prisma ORM — bukan `localStorage`.
2. **Autentikasi berbasis JWT + RBAC**: Setiap endpoint API (kecuali login & health check) wajib menyertakan token JWT yang valid. Akses dibatasi per role (RBAC) dengan **4 role**: `SUPER_ADMIN`, `ADMIN_INSKAL`, `KAUPT_KABBMKG`, `TEKNISI_UPT` (lihat bagian 6).
3. **Centralized API Client (frontend)**: Abstraksi tunggal (`src/shared/api/apiClient.ts`) untuk semua pemanggilan API, dengan cache di memori untuk mengurangi request berulang.
4. **Audit Log System**: Setiap aksi tambah/ubah/hapus/login/logout dicatat otomatis ke tabel `audit_logs` dengan aktor, timestamp, dan detail aksi.

---

## 2. Server Gabungan (Frontend + Backend dalam 1 proses)

Aplikasi ini **tidak** memisahkan frontend dan backend jadi dua server berbeda saat development maupun production standar. `server.ts` di root project menjalankan **satu proses Express** yang:

- Me-mount seluruh REST API di bawah prefix `/api/*` dan `/api/v1/*` (lihat `simon-backend/src/routes/index.ts`)
- **Development**: menjalankan Vite dalam *middleware mode* untuk hot-reload frontend
- **Production** (`NODE_ENV=production`): menyajikan file statis hasil `vite build` dari folder `dist/`
- Menjalankan **auto-seed** sekali saat database masih kosong (generate 3 akun awal dengan password acak, hanya ditampilkan sekali di log terminal). Role akun awal: `admin.inskal` = `ADMIN_INSKAL`, `upt.jayapura` = `TEKNISI_UPT`, `pimpinan.balai` = `KAUPT_KABBMKG`. **Auto-seed tidak membuat `SUPER_ADMIN`** — lihat [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#auto-seed-akun-pertama-kali)

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
   terproteksi. Jika aksi butuh role tertentu → middleware tambahan (`requireAdmin`, `requireSuperAdmin`, atau `requireSuperAdminOrTeknisi`).
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
| Otorisasi berbasis peran | Middleware `requireAdmin` (Admin Inskal + Super Admin), `requireSuperAdmin` (kelola akun & master data), `requireSuperAdminOrTeknisi` (edit alat) — lihat bagian 6 |
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
| Auth & User | `/api/login`, `/api/logout`, `/api/users` | Login/logout publik; kelola akun: `SUPER_ADMIN` |
| Devices | `/api/devices` | Tambah & hapus: `SUPER_ADMIN`; edit: `SUPER_ADMIN` atau `TEKNISI_UPT` (hanya alat UPT sendiri, field terbatas) |
| Stations | `/api/stations` | `SUPER_ADMIN` |
| Petugas | `/api/petugas` | `SUPER_ADMIN` |
| SLA/OLA (pengisian harian) | `/api/sla-ola` | `TEKNISI_UPT` (UPT sendiri) atau `SUPER_ADMIN` |
| SLA/OLA (monitoring/koreksi log) | `/api/sla-ola/logs` | `ADMIN_INSKAL` atau `SUPER_ADMIN` (baca, koreksi, hapus) |
| Kalibrasi | `/api/calibration` | `ADMIN_INSKAL` atau `SUPER_ADMIN` |
| Perbaikan | `/api/perbaikan` | `ADMIN_INSKAL` atau `SUPER_ADMIN` (tulis) |
| Genset | `/api/genset` | `ADMIN_INSKAL` atau `SUPER_ADMIN` (baca & tulis) |
| Audit Log | `/api/audit-logs` | `SUPER_ADMIN` (tulis/hapus) |
| History | `/api/history` | — (read-only, wajib login) |
| Health check | `/api/health`, `/api/connection-stream` | — (publik, tanpa token) |

Semua endpoint baca (GET) cukup wajib login, kecuali yang dicatat di [API.md](./API.md) (mis. `GET /api/sla-ola/logs` dan `GET /api/genset` butuh Admin Inskal/Super Admin).

---

## 5. Fitur Utama SIMON BBMKG V

1. **Dashboard Monitoring**: Visualisasi status ALOPTAMA (Normal, Gangguan, Mati Total), skor SLA/OLA, serta peta sebaran stasiun UPT Wilayah V (`src/features/monitoring/MapContainer.tsx`, Leaflet native — bukan `react-leaflet`), dilengkapi overlay garis batas 38 provinsi (GeoJSON statis dari `public/geo/`, di-toggle lewat menu Layers pada peta) dan pilihan basemap OpenStreetMap / Satelit.
2. **Kalkulator & Pengisian SLA/OLA**: Perhitungan otomatis skor OLA berdasarkan bobot komponen (Logger, Kelistrikan, Komunikasi, Sensor Aktif).
3. **Repository Kalibrasi INSKAL**: Pencatatan riwayat kalibrasi, masa berlaku sertifikat, dan penanggung jawab tim. Status kalibrasi (**Valid / Segera Dikalibrasi / Kadaluwarsa**) dihitung **otomatis** dari masa berlaku (lihat bagian 7).
4. **Master Database Admin**: CRUD stasiun UPT, peralatan, petugas, dan akun — penuh hanya untuk `SUPER_ADMIN`; `ADMIN_INSKAL` hanya melihat tab monitoring SLA/OLA harian; `TEKNISI_UPT` hanya mengedit alat UPT-nya sendiri. Semua perubahan tercatat di log audit.
5. **Manajemen Akun & RBAC**: 4 role (`SUPER_ADMIN`, `ADMIN_INSKAL`, `KAUPT_KABBMKG`, `TEKNISI_UPT`) menentukan menu & aksi yang boleh diakses (`authService.getRBACPermissions` di `src/features/auth/authService.ts`, dikonsumsi lewat `permissions` di `AuthContext.tsx`; penegakan di backend lewat middleware).
6. **Audit Log Aktivitas**: Riwayat lengkap setiap perubahan data, termasuk login/logout, untuk integritas dan transparansi sistem.

---

## 6. RBAC: 4 Role

Enum `Role` (`simon-backend/prisma/schema.prisma`) memiliki 4 nilai. Migrasi `20260901000000_expand_roles` memetakan data lama: `ADMIN` → `ADMIN_INSKAL`, `UPT_PIMPINAN` → `TEKNISI_UPT` (akun yang sebenarnya pejabat Kepala UPT / Kepala BBMKG perlu diubah manual ke `KAUPT_KABBMKG` lewat menu Kelola Akun).

| Role | Nama di UI | Cakupan data | Menu | Hak utama |
| :--- | :--- | :--- | :--- | :--- |
| `SUPER_ADMIN` | Super Admin | Semua UPT | Dashboard, SLA & OLA, Kalibrasi, Sertifikat, Panduan, Database Master (penuh), Audit Log, Genset, Perbaikan | Kelola akun; CRUD stasiun, alat, petugas; lihat & hapus audit log; semua hak Admin Inskal; boleh mengisi SLA/OLA untuk UPT mana pun |
| `ADMIN_INSKAL` | Admin Inskal | Semua UPT | Dashboard, SLA & OLA, Kalibrasi, Sertifikat, Panduan, Database Master (hanya monitoring SLA/OLA harian), Genset, Perbaikan | Input kalibrasi; koreksi/hapus log SLA/OLA lewat Database Master; genset & perbaikan; laporan mingguan, daftar belum lapor, laporan UPT. **Tidak** mengisi SLA/OLA, tidak mengelola akun/master stasiun/alat/petugas, tidak melihat audit log |
| `KAUPT_KABBMKG` | KaUPT / KaBBMKG | UPT sendiri | Dashboard, SLA & OLA, Kalibrasi, Sertifikat, Panduan | Hanya melihat (read-only) + laporan UPT; tanpa tombol pengisian SLA/OLA |
| `TEKNISI_UPT` | Teknisi UPT | UPT sendiri | Dashboard, SLA & OLA, Kalibrasi, Sertifikat, Panduan, Database Master (hanya Master Alat UPT sendiri) | Mengisi SLA/OLA harian UPT sendiri; edit alat UPT sendiri (ID alat & UPT terkunci, tanpa tambah/hapus); laporan UPT |

Penegakan ada di dua lapis: **frontend** (`authService.getRBACPermissions` menentukan menu & tombol) dan **backend** (middleware di `authMiddleware.ts`) — backend tetap menolak dengan `403` walaupun UI dilewati.

| Middleware | Role yang lolos | Dipakai untuk |
| :--- | :--- | :--- |
| `verifyToken` | Semua role yang login | Hampir semua endpoint |
| `requireAdmin` | `ADMIN_INSKAL`, `SUPER_ADMIN` | Simpan kalibrasi, monitoring/koreksi log SLA/OLA, genset, perbaikan |
| `requireSuperAdmin` | `SUPER_ADMIN` | Kelola akun, tambah/hapus alat, CRUD stasiun & petugas, tulis/hapus audit log |
| `requireSuperAdminOrTeknisi` | `SUPER_ADMIN`, `TEKNISI_UPT` | Edit alat (`PUT /devices/:id`); Teknisi dibatasi lagi di `deviceController.updateDevice` |

Pengisian SLA/OLA (`POST /api/sla-ola`) diperiksa di dalam `slaOlaController.saveSlaOla`: hanya `TEKNISI_UPT` (untuk UPT sendiri) dan `SUPER_ADMIN`.

---

## 7. Aturan Perhitungan Otomatis

### SLA/OLA bulanan
Nilai bulanan per alat = **rata-rata isian harian** (`sla_ola_logs`) pada bulan itu, dikelompokkan berdasarkan `reportDate`. Jika satu alat diisi lebih dari sekali pada tanggal yang sama, hanya isian terakhir di tanggal itu yang dihitung. Bulan tanpa log tidak punya nilai (bukan 0). **Tidak ada lagi input admin yang diprioritaskan** — admin tidak mengisi SLA/OLA, hanya mengoreksi/menghapus log lewat Database Master, dan semua log diperlakukan sama siapa pun `actor`-nya (`simon-backend/src/utils/slaOlaMonthly.ts`).

### Status kalibrasi
Status dihitung otomatis dari masa berlaku sertifikat (`calibrationValidUntil`), memakai tanggal hari ini menurut WIT (Asia/Jayapura):

| Kondisi | Status |
| :--- | :--- |
| Masa berlaku sudah lewat hari ini | `KADALUWARSA` |
| Sisa masa berlaku ≤ 30 hari (termasuk hari terakhir) | `SEGERA_DIKALIBRASI` |
| Sisa masa berlaku > 30 hari | `VALID` |
| PIC Kalibrasi = "Tidak Dikalibrasi" | `TIDAK_DIKALIBRASI` (tetap, tidak dihitung) |

Dihitung saat data dibaca (`serializeDeviceDates` di `simon-backend/src/utils/dateUtils.ts`) dan saat disimpan (`calibrationController`, `deviceController`), jadi tidak ada status basi di database; frontend memakai aturan yang sama (`src/shared/utils/calibration.ts`). Field `calibrationStatus` pada request kalibrasi/alat diabaikan untuk alat yang dikalibrasi.