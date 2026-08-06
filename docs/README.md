# Documentation SIMON BBMKG V

Selamat datang di Dokumentasi Pengembang **SIMON BBMKG V** (Sistem Informasi Monitoring Peralatan Meteorologi, Klimatologi, dan Geofisika Wilayah V).

Dokumentasi ini disusun agar developer baru dapat langsung memahami arsitektur, struktur kode, konvensi penamaan, validasi data, serta alur pengembangannya.

---

## 📚 Daftar Isi Dokumentasi

1. **[Arsitektur Sistem (ARCHITECTURE.md)](./ARCHITECTURE.md)**  
   Penjelasan arsitektur sistem, centralized API client, mekanisme dual-storage (Local + Server Fallback), dan Audit Logging.

2. **[Spesifikasi API & Data Contract (API.md)](./API.md)**  
   Dokumentasi REST API Server (`server.ts`) dan struktur response JSON untuk sync data BMKG.

3. **[Panduan Pengembang & Konvensi Penamaan (DEVELOPMENT_GUIDE.md)](./DEVELOPMENT_GUIDE.md)**  
   Standar penamaan berkas (`*Page.tsx`, `*Card.tsx`, `*Table.tsx`, `*Service.ts`, `*Types.ts`), aturan validasi Zod & React Hook Form, serta cara menambahkan fitur baru.

---

## 🚀 Ringkasan Teknologi Utama (Tech Stack)

| Komponen | Teknologi |
| :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript + Vite |
| **Styling** | Tailwind CSS v4 |
| **Form & Validation** | React Hook Form + Zod Schema Validation |
| **State & Local Persistence** | Centralized API Layer (`apiClient`) + LocalStorage + Memory Fallback |
| **Backend Server** | Node.js Express Server (`server.ts`) with Vite Middleware |
| **Icons & Visuals** | Lucide React Icons |
| **Leaflet Maps** | React Leaflet / Leaflet Map for BMKG Wilayah V Stations |

---

## 📁 Struktur Direktori Utama

```
src/
├── app/
│   └── App.tsx               # Entry Point aplikasi utama
├── features/                 # Modular feature domains
│   ├── dashboard/            # Dashboard SLA/OLA & Peta Stasiun
│   │   ├── DashboardPage.tsx
│   │   ├── DashboardCard.tsx
│   │   ├── DashboardTable.tsx
│   │   ├── DashboardService.ts
│   │   └── DashboardTypes.ts
│   ├── sla-ola/              # Pengisian & Monitoring SLA/OLA
│   │   ├── SlaOlaPage.tsx
│   │   ├── SlaOlaModal.tsx
│   │   ├── SlaOlaTable.tsx
│   │   ├── SlaOlaService.ts
│   │   └── SlaOlaTypes.ts
│   ├── calibration/          # Inskal Kalibrasi & Sertifikat
│   │   ├── CalibrationPage.tsx
│   │   ├── CalibrationModal.tsx
│   │   ├── CalibrationTable.tsx
│   │   ├── CalibrationService.ts
│   │   └── CalibrationTypes.ts
│   ├── admin/                # Master Data Management (Stasiun & Alat)
│   │   ├── AdminMasterPage.tsx
│   │   ├── AdminMasterService.ts
│   │   └── AdminMasterTypes.ts
│   ├── audit-log/            # Log Aktivitas & Perubahan System
│   │   ├── AuditLogPage.tsx
│   │   ├── AuditLogTable.tsx
│   │   ├── AuditLogService.ts
│   │   └── AuditLogTypes.ts
│   └── certificates/         # Sertifikat Redirect & Downloads
│       └── CertificatePage.tsx
├── shared/                   # Shared utilities, API client, & Zod schemas
│   ├── api/                  # Centralized API Client layer (`apiClient`)
│   ├── schemas/              # Zod validation schemas
│   ├── types/                # Global TypeScript definitions
│   └── components/           # UI Modals & Error Boundary
└── layouts/                  # Navbar & Sidebar layouts
```
