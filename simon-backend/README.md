# SIMON Aloptama Backend Service

Backend REST API modular untuk **SIMON Aloptama BBMKG Wilayah V Papua** menggunakan stack modern:
- **Node.js & Express.js** (TypeScript)
- **Prisma ORM**
- **PostgreSQL Database**
- **JWT Authentication & Audit Logging**

---

## 📁 Struktur Direktori `simon-backend`

```
simon-backend/
├── prisma/
│   └── schema.prisma         # Schema Database PostgreSQL (Users, UPT, Devices, SLA/OLA, Calibration, Audit)
├── src/
│   ├── config/               # Konfigurasi aplikasi & Environment
│   ├── db/
│   │   └── prisma.ts         # Singleton Client Prisma ORM
│   ├── controllers/          # Business logic handlers
│   │   ├── authController.ts
│   │   ├── deviceController.ts
│   │   ├── stationController.ts
│   │   ├── slaOlaController.ts
│   │   ├── calibrationController.ts
│   │   └── auditLogController.ts
│   ├── routes/               # Modular Express Routers
│   │   ├── authRoutes.ts
│   │   ├── deviceRoutes.ts
│   │   ├── stationRoutes.ts
│   │   ├── slaOlaRoutes.ts
│   │   ├── calibrationRoutes.ts
│   │   ├── auditLogRoutes.ts
│   │   └── index.ts          # Root API Router (/api/v1)
│   ├── app.ts                # Express Application Setup
│   ├── server.ts             # Express Server Entry Point
│   └── seed.ts               # Database Initial Seeder Script
├── .env.example              # Template variabel lingkungan PostgreSQL & JWT
├── tsconfig.json             # Konfigurasi TypeScript NodeNext
├── package.json              # Backend Dependencies & Scripts
└── README.md
```

---

## 🛠️ Cara Menjalankan Backend SIMON

### 1. Install Dependensi
```bash
cd simon-backend
npm install
```

### 2. Salin File `.env` & Atur Database PostgreSQL
```bash
cp .env.example .env
```
Isi `DATABASE_URL` dengan kredensial PostgreSQL Anda:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/simon_db?schema=public"
```

### 3. Migrasi Schema Prisma ke PostgreSQL
```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Seed Data Awal SIMON
```bash
npm run seed
```

### 5. Jalankan Backend Server
```bash
npm run dev
```

Server API v1 akan berjalan di: `http://localhost:5000/api/v1`

---

## 📡 Endpoint API Utama (`/api/v1`)

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/v1/health` | Cek status kesehatan backend & koneksi DB |
| `POST` | `/api/v1/auth/login` | Login pengguna & penerbitan token JWT |
| `GET` | `/api/v1/master/devices` | Mengambil seluruh data Aloptama |
| `POST` | `/api/v1/master/devices` | Menambah data Aloptama baru |
| `GET` | `/api/v1/master/stations` | Mengambil seluruh data stasiun UPT |
| `POST` | `/api/v1/operational/sla-ola/save` | Menyimpan kalkulasi SLA/OLA Aloptama |
| `POST` | `/api/v1/operational/calibration/save` | Menyimpan data/sertifikat kalibrasi INSKAL |
| `GET` | `/api/v1/system/audit-logs` | Mengambil riwayat log audit aktivitas |
