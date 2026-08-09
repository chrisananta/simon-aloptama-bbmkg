# Spesifikasi REST API SIMON BBMKG V

Backend berjalan dalam satu proses Express bersama frontend (`server.ts`), listening di port `3000` (default). Semua endpoint di-mount di bawah prefix `/api`.

Setiap route grup didaftarkan di **dua path sekaligus** (lihat `simon-backend/src/routes/index.ts`): path utama (root) dan alias namespaced (`/auth`, `/master`, `/operational`, `/system`) — keduanya mengarah ke controller yang sama, jadi bisa dipakai bergantian.

## Autentikasi

Semua endpoint **wajib** menyertakan header berikut, KECUALI `POST /api/login` dan `GET /api/health`:

```
Authorization: Bearer <JWT_TOKEN>
```

Token didapat dari response `POST /api/login`. Endpoint yang butuh hak admin (create/update/delete pada data master) menolak dengan `403` jika token valid tapi role bukan `ADMIN`.

**Response jika token tidak ada / tidak valid (401):**
```json
{ "success": false, "message": "Akses ditolak. Token tidak ditemukan, silakan login kembali." }
```

**Response jika role bukan ADMIN untuk aksi yang butuh admin (403):**
```json
{ "success": false, "message": "Akses ditolak. Aksi ini hanya diizinkan untuk Admin INSKAL." }
```

---

## 1. Auth & User — `simon-backend/src/routes/authRoutes.ts`

### POST `/api/login` (publik, rate-limited)
Login dan mendapatkan JWT token. Dibatasi maksimal **10 percobaan gagal per 15 menit per IP** (`express-rate-limit`); percobaan yang berhasil tidak dihitung ke kuota.

* **Payload**:
```json
{ "username": "admin.inskal", "password": "..." }
```
* **Response 200 OK**:
```json
{
  "success": true,
  "token": "<JWT>",
  "user": {
    "id": "USR-ADMIN-001",
    "username": "admin.inskal",
    "name": "Ir. Fajar Nur, M.T.",
    "role": "ADMIN",
    "title": "Admin INSKAL & Kalibrasi BBMKG V",
    "uptStation": "BBMKG Wilayah V Papua"
  }
}
```
* **Response 401** (password salah): `{ "success": false, "message": "Kata sandi salah. Silakan periksa kembali kata sandi Anda." }`
* **Response 429** (kena rate-limit): `{ "success": false, "message": "Terlalu banyak percobaan login gagal. Silakan coba lagi dalam beberapa menit." }`

### GET `/api/users` — wajib login
Daftar semua user. **Field `passwordHash` tidak pernah disertakan** dalam response.

### POST `/api/users` — wajib login + ADMIN
Buat user baru. Password otomatis di-hash (bcrypt) sebelum disimpan.

### PUT `/api/users/:id` — wajib login + ADMIN
Update user. Jika field `password` disertakan, otomatis di-hash ulang.

### DELETE `/api/users/:id` — wajib login + ADMIN

---

## 2. Devices — `deviceRoutes.ts` (alias: `/api/master/devices`)

| Method | Path | Akses |
| :--- | :--- | :--- |
| GET | `/api/devices` | Login |
| GET | `/api/devices/:id` | Login |
| POST | `/api/devices` | Login + ADMIN |
| PUT | `/api/devices/:id` | Login + ADMIN |
| DELETE | `/api/devices/:id` | Login + ADMIN |

---

## 3. Stations — `stationRoutes.ts` (alias: `/api/master/stations`)

| Method | Path | Akses |
| :--- | :--- | :--- |
| GET | `/api/stations` | Login |
| POST | `/api/stations` | Login + ADMIN |
| PUT | `/api/stations/:id` | Login + ADMIN |
| DELETE | `/api/stations/:id` | Login + ADMIN |

---

## 4. Petugas — `petugasRoutes.ts` (alias: `/api/master/petugas`)

| Method | Path | Akses |
| :--- | :--- | :--- |
| GET | `/api/petugas` | Login |
| POST | `/api/petugas` | Login + ADMIN |
| PUT | `/api/petugas/:id` | Login + ADMIN |
| DELETE | `/api/petugas/:id` | Login + ADMIN |

---

## 5. SLA/OLA — `slaOlaRoutes.ts` (alias: `/api/operational/sla-ola`)

Diisi rutin oleh operator UPT (bukan cuma admin), jadi cukup wajib login — tidak perlu role ADMIN.

| Method | Path | Akses |
| :--- | :--- | :--- |
| GET | `/api/sla-ola/logs` | Login |
| POST | `/api/sla-ola` (atau `/api/sla-ola/save`) | Login |

* **Payload POST**:
```json
{
  "uptStation": "Stasiun Meteorologi Dok II Jayapura",
  "category": "AWOS",
  "deviceId": "AWOS-STN-01",
  "kondisiSla": true,
  "kondisiOla": 98.5,
  "kendala": "Pembersihan rutin sensor kelembapan"
}
```

---

## 6. Kalibrasi — `calibrationRoutes.ts` (alias: `/api/operational/calibration`)

| Method | Path | Akses |
| :--- | :--- | :--- |
| GET | `/api/calibration` (atau `/api/calibration/records`) | Login |
| POST | `/api/calibration` (atau `/api/calibration/save`) | Login |

* **Payload POST**:
```json
{
  "deviceId": "AWS-JAP-01",
  "deviceName": "AWS Sentani",
  "uptStation": "Stasiun Meteorologi Sentani",
  "category": "AWS",
  "lastCalibrated": "2026-07-15",
  "calibrationValidUntil": "2027-07-14",
  "calibrationAgency": "Tim INSKAL BBMKG Wilayah V"
}
```

---

## 7. Audit Log — `auditLogRoutes.ts` (alias: `/api/system/audit-logs`)

| Method | Path | Akses |
| :--- | :--- | :--- |
| GET | `/api/audit-logs` | Login |
| POST | `/api/audit-logs` | Login |
| DELETE | `/api/audit-logs/clear` | Login + ADMIN |

* **Payload POST** (`recordId` wajib diisi — akan ditolak Prisma jika kosong):
```json
{
  "table": "autentikasi",
  "action": "LOGOUT",
  "recordId": "USR-ADMIN-001",
  "recordName": "Ir. Fajar Nur, M.T.",
  "actor": "Ir. Fajar Nur, M.T.",
  "details": "Pengguna melakukan logout dan mengakhiri sesi aktif",
  "status": "SUCCESS"
}
```

`action` harus salah satu dari: `TAMBAH`, `EDIT`, `HAPUS`, `SIMPAN_SLA_OLA`, `SIMPAN_KALIBRASI`, `SYNC_SERVER`, `RESET_DATA`, `EXPORT_DATA`, `LOGIN`, `LOGOUT`, `REFRESH_TOKEN`.

`table` harus salah satu dari: `master_stasiun`, `master_alat`, `master_sla_ola`, `master_akun`, `kalibrasi`, `sistem`, `pengaturan`, `autentikasi`.

---

## 8. History

### GET `/api/history?...` — wajib login
Log riwayat operasional gabungan (dipakai untuk laporan/filter di frontend).

---

## 9. Health Check (publik, tanpa token)

### GET `/api/health`
```json
{
  "status": "ONLINE",
  "service": "SIMON Aloptama BBMKG Wilayah V Backend API",
  "database": "PostgreSQL + Prisma ORM",
  "timestamp": "2026-08-08T10:00:00.000Z"
}
```

---

## Format Response Standar

Semua endpoint (kecuali `/health`) mengikuti pola:

```json
// Sukses
{ "success": true, "data": { ... } }

// Gagal
{ "success": false, "message": "Pesan error yang jelas dalam Bahasa Indonesia" }
```
