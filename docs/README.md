# Documentation SIMON BBMKG V

Selamat datang di Dokumentasi Pengembang **SIMON BBMKG V** (Sistem Informasi Monitoring Peralatan Meteorologi, Klimatologi, dan Geofisika Wilayah V).

Dokumentasi ini disusun agar developer baru dapat langsung memahami arsitektur, struktur kode, alur autentikasi, spesifikasi API, konvensi penamaan, serta cara menjalankan aplikasi.

---

## 📚 Daftar Isi Dokumentasi

1. **[Arsitektur Sistem (ARCHITECTURE.md)](./ARCHITECTURE.md)**
   Arsitektur server gabungan (frontend + backend 1 proses), alur autentikasi JWT lengkap, model keamanan, dan struktur endpoint API.

2. **[Spesifikasi API & Data Contract (API.md)](./API.md)**
   Dokumentasi lengkap REST API (`simon-backend/src/routes/`), termasuk endpoint mana yang publik, mana yang wajib login, dan mana yang wajib role ADMIN.

3. **[Panduan Pengembang & Konvensi Penamaan (DEVELOPMENT_GUIDE.md)](./DEVELOPMENT_GUIDE.md)**
   Standar penamaan berkas, aturan validasi Zod & React Hook Form, cara menjalankan aplikasi secara lokal, dan cara menambahkan fitur baru.

---

## 🚀 Ringkasan Teknologi Utama (Tech Stack)

| Komponen | Teknologi |
| :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript + Vite |
| **Styling** | Tailwind CSS v4 |
| **Form & Validation** | React Hook Form + Zod Schema Validation |
| **State & API Layer** | Centralized API Client (`apiClient`) dengan cache memori + `authFetch` (kirim cookie sesi `httpOnly` via `credentials: 'include'`) |
| **Backend Server** | Node.js + Express (`server.ts`), digabung dengan Vite middleware (dev) / static files (production) |
| **Database** | PostgreSQL + **Prisma ORM** (`simon-backend/prisma/schema.prisma`) |
| **Autentikasi** | JWT (`jsonwebtoken`) + `bcrypt` untuk hashing password |
| **Keamanan Tambahan** | `express-rate-limit` (brute-force protection pada login) |
| **Icons & Visuals** | Lucide React Icons |
| **Peta** | Leaflet (native, dikendalikan imperatif via `useRef`/`useEffect` — **bukan** wrapper `react-leaflet`) — sebaran stasiun UPT BMKG Wilayah V + overlay garis batas provinsi (GeoJSON statis) |

---

## 🔐 Autentikasi Singkat

- Login: `POST /api/login` → backend set cookie `httpOnly` `simon_jwt` (token **tidak** dikirim di body JSON)
- Semua endpoint lain wajib terautentikasi — cookie httpOnly terkirim otomatis oleh browser (jalur utama), atau header `Authorization: Bearer <token>` (fallback untuk klien non-browser)
- 2 role: `ADMIN` (Admin INSKAL — akses penuh) dan `UPT_PIMPINAN` (operator UPT — akses terbatas, tanpa hak hapus/kelola akun)
- Detail lengkap alur login → validasi token → migrasi password otomatis, lihat [ARCHITECTURE.md](./ARCHITECTURE.md#3-alur-autentikasi-login--token--request-terproteksi)

---

## 📁 Struktur Direktori Utama

```
├── server.ts                      # Entry point backend gabungan (Express + Vite middleware / static)
├── public/                         # Static assets — di-serve APA ADANYA di root URL oleh Vite
│   │                                # (TIDAK melalui bundler, TIDAK di-import di kode React)
│   └── geo/
│       └── provinsi-indonesia.geojson  # Batas 38 provinsi RI, di-fetch runtime oleh MapContainer
│                                        # via fetch('/geo/provinsi-indonesia.geojson')
├── src/                            # Frontend React + Vite
│   ├── app/App.tsx                 # Entry point aplikasi utama (routing menu internal)
│   ├── features/                   # Modular feature domains
│   │   ├── auth/                   # Login, AuthContext (session, JWT, RBAC), ProtectedRoute
│   │   ├── dashboard/               # Dashboard SLA/OLA & Peta Stasiun
│   │   ├── sla-ola/                 # Pengisian & Monitoring SLA/OLA
│   │   ├── calibration/             # Repository Kalibrasi INSKAL & Sertifikat
│   │   ├── admin/                   # Master Data Management (Stasiun, Alat, Petugas, Akun)
│   │   ├── audit-log/               # Log Aktivitas & Perubahan Sistem
│   │   ├── monitoring/              # Peta sebaran ALOPTAMA (Leaflet) — MapContainer.tsx
│   │   │                            # (marker status, popup detail, basemap OSM/Satelit,
│   │   │                            # overlay garis batas provinsi via public/geo/*.geojson)
│   │   │                            # + WaReportModal.tsx (laporan via WhatsApp)
│   │   └── certificates/            # Halaman sertifikat
│   ├── shared/
│   │   ├── api/                     # apiClient.ts (data layer) + http.ts (authFetch)
│   │   ├── services/                # Service tambahan (mis. petugasService)
│   │   ├── schemas/                 # Zod validation schemas
│   │   ├── types/                   # Global TypeScript definitions
│   │   └── components/              # UI Modals & Error Boundary
│   ├── layouts/                     # Navbar & Sidebar
│   └── assets/                      # Logo & gambar statis YANG di-bundle (di-import via kode,
│                                     # beda dengan public/ yang di-fetch runtime tanpa bundling)
└── simon-backend/                  # Backend API
    ├── prisma/schema.prisma         # Model data (User, UptStation, Device, SlaOlaLog,
    │                                 # CalibrationRecord, AuditLog)
    └── src/
        ├── config/env.ts            # Validasi JWT_SECRET wajib ada (fail-fast jika kosong)
        ├── middleware/               # authMiddleware.ts (verifyToken, requireAdmin),
        │                             # rateLimiter.ts (loginRateLimiter)
        ├── controllers/              # Logic tiap entitas (userController, deviceController, dst)
        ├── routes/                   # Definisi endpoint per entitas + routes/index.ts (gabungan)
        └── db/prisma.ts              # Prisma Client singleton
```

> 📌 **`public/` vs `src/assets/`:** `public/` di-serve Vite apa adanya ke URL root (`/geo/...`) tanpa lewat bundler — cocok untuk file besar yang di-`fetch()` saat runtime (mis. GeoJSON) supaya tidak menggembungkan bundle JS utama. `src/assets/` sebaliknya di-`import` langsung di kode React dan ikut diproses/di-hash oleh bundler. Folder `scripts/` (script import CSV) **bukan** static asset dan tidak pernah di-serve lewat HTTP — jangan taruh file yang perlu diakses browser di sana.

---

## ⚙️ Menjalankan Aplikasi Secara Lokal

Ringkas — detail lengkap ada di [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md).

```bash
npm install
# Buat file .env di ROOT dan di simon-backend/ (isinya harus SAMA PERSIS):
#   DATABASE_URL="postgresql://user:pass@localhost:5432/simon_bmkg?schema=public"
#   JWT_SECRET="<random string 32+ karakter>"
#   PORT=3000

npx prisma migrate deploy --schema=simon-backend/prisma/schema.prisma
npm run dev      # mode development, http://localhost:3000
```

> ⚠️ Server **menolak nyala** kalau `JWT_SECRET` belum di-set — ini disengaja (fail-fast), bukan bug.