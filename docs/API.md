# Spesifikasi REST API SIMON BBMKG V

Backend berjalan dalam satu proses Express bersama frontend (`server.ts`), listening di port `3000` (default). Semua endpoint di-mount di bawah prefix `/api` (dan juga di-mount ulang di `/api/v1` — lihat `server.ts`: `app.use("/api", apiRouter)` dan `app.use("/api/v1", apiRouter)`), tapi **tidak ada** alias namespaced per-grup (`/auth`, `/master`, `/operational`, dst.) — semua route grup didaftarkan langsung di root (`apiRouter.use('/', ...)`, lihat `simon-backend/src/routes/index.ts`).

## Autentikasi

Jalur utama: token JWT dikirim & disimpan lewat **cookie `httpOnly` bernama `simon_jwt`**, di-set otomatis oleh backend lewat header `Set-Cookie` saat `POST /api/login` berhasil. Browser mengirim cookie ini otomatis di setiap request (asal request menyertakan `credentials: 'include'`) — JavaScript di halaman (termasuk skrip jahat lewat XSS) **tidak bisa membaca cookie ini sama sekali**.

Fallback (untuk klien non-browser seperti script/Postman/curl yang tidak menyimpan cookie): header
```
Authorization: Bearer <JWT_TOKEN>
```

Semua endpoint **wajib** terautentikasi (lewat salah satu dari dua jalur di atas), KECUALI `POST /api/login` dan `GET /api/health`.

Token didapat dari cookie `Set-Cookie` pada response `POST /api/login` (**bukan** dari body JSON — lihat catatan di bawah). Endpoint yang butuh hak admin (create/update/delete pada data master) menolak dengan `403` jika token valid tapi role bukan `ADMIN`.

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
Login dan mendapatkan sesi. Dibatasi maksimal **10 percobaan gagal per 15 menit per IP** (`express-rate-limit`); percobaan yang berhasil tidak dihitung ke kuota.

* **Payload**:
```json
{ "username": "admin.inskal", "password": "..." }
```
* **Response 200 OK** (token JWT dikirim lewat header `Set-Cookie: simon_jwt=...; HttpOnly`, **bukan** di body — `expiresAt` di body hanya timestamp non-rahasia untuk keperluan UI):
```json
{
  "success": true,
  "message": "Login berhasil.",
  "expiresAt": 1755950400000,
  "user": {
    "id": "USR-ADMIN-001",
    "username": "admin.inskal",
    "name": "Ir. Fajar Nur, M.T.",
    "role": "ADMIN",
    "title": "Admin INSKAL & Kalibrasi BBMKG V",
    "nip": "19850412 201012 1 001",
    "email": "fajar.nur@bmkg.go.id",
    "uptStation": "BBMKG Wilayah V Papua",
    "avatarUrl": "..."
  }
}
```
* **Response 401** (password salah): `{ "success": false, "message": "Kata sandi salah. Silakan periksa kembali kata sandi Anda." }`
* **Response 429** (kena rate-limit): `{ "success": false, "message": "Terlalu banyak percobaan login gagal. Silakan coba lagi dalam beberapa menit." }`

### POST `/api/logout` (tidak wajib token — lihat catatan)
Menghapus cookie `simon_jwt` di browser lewat `Set-Cookie` dengan masa berlaku sudah lewat. **Sengaja tidak dipasangi `verifyToken`**: kalau token sudah invalid/kedaluwarsa, `verifyToken` akan menolak dengan 401 sebelum sempat mengirim instruksi hapus cookie — cookie basi jadi nyangkut terus. Controller mencoba baca identitas user (best-effort, untuk audit log) tapi cookie **selalu** dibersihkan apa pun kondisi tokennya.

### GET `/api/users` — wajib login
Daftar semua user. **Field `passwordHash` tidak pernah disertakan** dalam response.

### POST `/api/users` — wajib login + ADMIN
Buat user baru. Password otomatis di-hash (bcrypt) sebelum disimpan. Kalau field `password` tidak diisi, sistem generate password acak dan mengembalikannya **sekali** di response (`generatedPassword`) — client tidak pernah boleh mengirim hash siap pakai.

### PUT `/api/users/:id` — wajib login + ADMIN
Update user. Jika field `password` disertakan, otomatis di-hash ulang.

### DELETE `/api/users/:id` — wajib login + ADMIN
Menolak dengan `400` jika mencoba hapus akun sendiri, atau menghapus admin terakhir yang tersisa.

---

## 2. Devices — `deviceRoutes.ts`

| Method | Path | Akses |
| :--- | :--- | :--- |
| GET | `/api/devices` | Login |
| GET | `/api/devices/:id` | Login |
| POST | `/api/devices` | Login + ADMIN |
| PUT | `/api/devices/:id` | Login + ADMIN |
| DELETE | `/api/devices/:id` | Login + ADMIN |

---

## 3. Stations — `stationRoutes.ts`

| Method | Path | Akses |
| :--- | :--- | :--- |
| GET | `/api/stations` | Login |
| POST | `/api/stations` | Login + ADMIN |
| PUT | `/api/stations/:id` | Login + ADMIN |
| DELETE | `/api/stations/:id` | Login + ADMIN |

---

## 4. Petugas — `petugasRoutes.ts`

| Method | Path | Akses |
| :--- | :--- | :--- |
| GET | `/api/petugas` | Login |
| POST | `/api/petugas` | Login + ADMIN |
| PUT | `/api/petugas/:id` | Login + ADMIN |
| DELETE | `/api/petugas/:id` | Login + ADMIN |

---

## 5. SLA/OLA — `slaOlaRoutes.ts`

Entry harian diisi rutin oleh operator UPT (bukan cuma admin), jadi cukup wajib login. Rekap **bulanan** (dipakai khusus di Admin Master View) dibatasi ADMIN saja.

| Method | Path | Akses |
| :--- | :--- | :--- |
| GET | `/api/sla-ola/logs` | Login |
| POST | `/api/sla-ola` (atau `/api/sla-ola/save`) | Login |
| GET | `/api/sla-ola/monthly` | Login + ADMIN |
| POST | `/api/sla-ola/monthly` | Login + ADMIN |

* **Payload POST** (`/api/sla-ola` atau `/api/sla-ola/save`):
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

## 6. Kalibrasi — `calibrationRoutes.ts`

Perubahan data kalibrasi adalah data master; **hanya Admin INSKAL** yang boleh menulis.

| Method | Path | Akses |
| :--- | :--- | :--- |
| GET | `/api/calibration` (atau `/api/calibration/records`) | Login |
| POST | `/api/calibration` (atau `/api/calibration/save`) | Login + ADMIN |

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

## 7. Audit Log — `auditLogRoutes.ts`

| Method | Path | Akses |
| :--- | :--- | :--- |
| GET | `/api/audit-logs` | Login |
| POST | `/api/audit-logs` | Login + ADMIN |
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