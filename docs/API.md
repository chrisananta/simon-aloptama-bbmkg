# Spesifikasi REST API SIMON BBMKG V

Backend berjalan dalam satu proses Express bersama frontend (`server.ts`), listening di port `3000` (default). Semua endpoint di-mount di bawah prefix `/api` (dan juga di-mount ulang di `/api/v1` — lihat `server.ts`: `app.use("/api", apiRouter)` dan `app.use("/api/v1", apiRouter)`), tapi **tidak ada** alias namespaced per-grup (`/auth`, `/master`, `/operational`, dst.) — semua route grup didaftarkan langsung di root (`apiRouter.use('/', ...)`, lihat `simon-backend/src/routes/index.ts`).

## Autentikasi

Jalur utama: token JWT dikirim & disimpan lewat **cookie `httpOnly` bernama `simon_jwt`**, di-set otomatis oleh backend lewat header `Set-Cookie` saat `POST /api/login` berhasil. Browser mengirim cookie ini otomatis di setiap request (asal request menyertakan `credentials: 'include'`) — JavaScript di halaman (termasuk skrip jahat lewat XSS) **tidak bisa membaca cookie ini sama sekali**.

Fallback (untuk klien non-browser seperti script/Postman/curl yang tidak menyimpan cookie): header
```
Authorization: Bearer <JWT_TOKEN>
```

Semua endpoint **wajib** terautentikasi (lewat salah satu dari dua jalur di atas), KECUALI `POST /api/login` dan `GET /api/health`.

Token didapat dari cookie `Set-Cookie` pada response `POST /api/login` (**bukan** dari body JSON — lihat catatan di bawah). Endpoint yang butuh role tertentu menolak dengan `403` jika token valid tapi role tidak sesuai. Ada 4 role: `SUPER_ADMIN`, `ADMIN_INSKAL`, `KAUPT_KABBMKG`, `TEKNISI_UPT` (tabel lengkap di [ARCHITECTURE.md](./ARCHITECTURE.md#6-rbac-4-role)). Pada tabel di bawah: **Admin** = `ADMIN_INSKAL` atau `SUPER_ADMIN` (middleware `requireAdmin`); **Super Admin** = `SUPER_ADMIN` saja (`requireSuperAdmin`).

**Response jika token tidak ada / tidak valid (401):**
```json
{ "success": false, "message": "Akses ditolak. Token tidak ditemukan, silakan login kembali." }
```

**Response jika role tidak berwenang (403)** — pesannya mengikuti middleware yang dipakai:
```json
{ "success": false, "message": "Akses ditolak. Aksi ini hanya diizinkan untuk Admin Inskal atau Super Admin." }
{ "success": false, "message": "Akses ditolak. Aksi ini hanya diizinkan untuk Super Admin." }
{ "success": false, "message": "Akses ditolak. Aksi ini hanya diizinkan untuk Super Admin atau Teknisi UPT." }
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
    "role": "ADMIN_INSKAL",
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

### POST `/api/users` — wajib login + Super Admin
Buat user baru. Password otomatis di-hash (bcrypt) sebelum disimpan. Kalau field `password` tidak diisi, sistem generate password acak dan mengembalikannya **sekali** di response (`generatedPassword`) — client tidak pernah boleh mengirim hash siap pakai.

### PUT `/api/users/:id` — wajib login + Super Admin
Update user. Jika field `password` disertakan, otomatis di-hash ulang.

### DELETE `/api/users/:id` — wajib login + Super Admin
Menolak dengan `400` jika mencoba hapus akun sendiri, atau menghapus Super Admin terakhir yang tersisa.

`role` pada payload user: `TEKNISI_UPT` (default), `KAUPT_KABBMKG`, `ADMIN_INSKAL`, atau `SUPER_ADMIN`.

---

## 2. Devices — `deviceRoutes.ts`

| Method | Path | Akses |
| :--- | :--- | :--- |
| GET | `/api/devices` | Login |
| GET | `/api/devices/:id` | Login |
| POST | `/api/devices` | Login + Super Admin |
| PUT | `/api/devices/:id` | Login + Super Admin **atau** Teknisi UPT |
| DELETE | `/api/devices/:id` | Login + Super Admin |

* **Teknisi UPT** pada `PUT /api/devices/:id`: hanya boleh mengedit alat milik UPT-nya sendiri (selain itu `403`), ID alat tidak bisa diubah, dan field sensitif (stasiun UPT, status kondisi, skor SLA/OLA) dibuang dari payload. Jika ia mengganti tanggal kalibrasi, masa berlaku dihitung server (+1 tahun − 1 hari).
* **`calibrationStatus` dihitung otomatis** dari `calibrationValidUntil`: `KADALUWARSA` jika sudah lewat, `SEGERA_DIKALIBRASI` jika sisa ≤ 30 hari, selain itu `VALID`; alat ber-PIC "Tidak Dikalibrasi" tetap `TIDAK_DIKALIBRASI`. Nilai `calibrationStatus` yang dikirim client diabaikan (kecuali `TIDAK_DIKALIBRASI` lewat PIC).

---

## 3. Stations — `stationRoutes.ts`

| Method | Path | Akses |
| :--- | :--- | :--- |
| GET | `/api/stations` | Login |
| POST | `/api/stations` | Login + Super Admin |
| PUT | `/api/stations/:id` | Login + Super Admin |
| DELETE | `/api/stations/:id` | Login + Super Admin |

---

## 4. Petugas — `petugasRoutes.ts`

| Method | Path | Akses |
| :--- | :--- | :--- |
| GET | `/api/petugas` | Login |
| POST | `/api/petugas` | Login + Super Admin |
| PUT | `/api/petugas/:id` | Login + Super Admin |
| DELETE | `/api/petugas/:id` | Login + Super Admin |

---

## 5. SLA/OLA — `slaOlaRoutes.ts`

Entry harian diisi rutin oleh **Teknisi UPT** (UPT sendiri) atau **Super Admin** — role lain mendapat `403`. Admin Inskal tidak mengisi SLA/OLA; ia hanya memantau, mengoreksi, dan menghapus entri lewat endpoint `logs`. Endpoint baca untuk rekap/tabel cukup wajib login.

| Method | Path | Akses |
| :--- | :--- | :--- |
| POST | `/api/sla-ola` (atau `/api/sla-ola/save`) | Login + Teknisi UPT (UPT sendiri) atau Super Admin |
| GET | `/api/sla-ola/summary?tahun=YYYY[&bulan=M]` | Login |
| GET | `/api/sla-ola/daily?bulan=M&tahun=YYYY` | Login |
| GET | `/api/sla-ola/range?from=YYYY-MM-DD&to=YYYY-MM-DD` | Login |
| GET | `/api/sla-ola/kendala?bulan=M&tahun=YYYY` | Login |
| GET | `/api/sla-ola/logs[?bulan=M&tahun=YYYY]` | Login + Admin |
| PUT | `/api/sla-ola/logs/:id` | Login + Admin |
| DELETE | `/api/sla-ola/logs/:id` | Login + Admin |

* **Ringkasan bulanan** (`GET /api/sla-ola/summary`, sumber halaman SLA & OLA): nilai per alat per bulan = **rata-rata isian harian** dari tabel `sla_ola_logs`, dikelompokkan berdasarkan `reportDate` (satu nilai per tanggal; bila diisi lebih dari sekali pada tanggal yang sama, isian terakhir yang dipakai). Semua log diperlakukan sama — tidak ada prioritas input admin. Bulan tanpa log tidak muncul di respons. Bentuk: `{ "success": true, "tahun": 2026, "data": { "<deviceId>": { "1": { "sla": 100, "ola": 92.5, "jumlahLog": 24 } } } }` (`jumlahLog` = jumlah hari yang punya isian).
* **Isian harian** (`/daily`): `{ data: { "<deviceId>": { "<tanggal 1-31>": { "sla": true, "ola": 100 } } } }`. **Rentang tanggal** (`/range`, sumber Laporan Mingguan): rata-rata isian harian per alat pada rentang (maks. 366 hari). **Kendala** (`/kendala`): keterangan kendala terbaru per alat pada satu bulan.
* **Tanggal laporan**: pengisian hari ini adalah untuk kondisi **kemarin**. `tanggal` (opsional, `YYYY-MM-DD`) boleh mundur maksimal 10 hari untuk pengisian susulan; tanggal lebih baru dari kemarin ditolak.
* **Koreksi/hapus entri** (`PUT`/`DELETE /api/sla-ola/logs/:id`): untuk memperbaiki salah input; status live alat disinkronkan ulang bila entri itu yang terbaru.

* **Payload POST** (`/api/sla-ola` atau `/api/sla-ola/save`):
```json
{
  "uptStation": "Stasiun Meteorologi Dok II Jayapura",
  "category": "AWOS",
  "deviceId": "AWOS-STN-01",
  "kondisiSla": true,
  "kondisiOla": 98.5,
  "kendala": "Pembersihan rutin sensor kelembapan",
  "tanggal": "2026-11-10"
}
```

---

## 6. Kalibrasi — `calibrationRoutes.ts`

Perubahan data kalibrasi adalah data master; yang boleh menulis hanya **Admin** (`ADMIN_INSKAL` atau `SUPER_ADMIN`).

| Method | Path | Akses |
| :--- | :--- | :--- |
| GET | `/api/calibration` (atau `/api/calibration/records`) | Login |
| GET | `/api/calibration/listed` | Login (daftar ID alat yang tampil di halaman Kalibrasi) |
| POST | `/api/calibration` (atau `/api/calibration/save`) | Login + Admin |

* Alat dengan PIC Kalibrasi "Tidak Dikalibrasi" ditolak (`400`).
* **Status kalibrasi otomatis**: server menghitung `calibrationStatus` dari `calibrationValidUntil` (`KADALUWARSA` bila sudah lewat, `SEGERA_DIKALIBRASI` bila sisa ≤ 30 hari, selain itu `VALID`). Field `calibrationStatus` di payload tidak lagi dipakai (tetap diterima agar client lama tidak error, tapi diabaikan).

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
| GET | `/api/audit-logs` | Login (menu Audit Log di UI hanya tampil untuk Super Admin) |
| POST | `/api/audit-logs` | Login + Super Admin |
| DELETE | `/api/audit-logs/clear` | Login + Super Admin |

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

## 8. Perbaikan & Genset — `perbaikanRoutes.ts`, `gensetRoutes.ts`

| Method | Path | Akses |
| :--- | :--- | :--- |
| GET | `/api/perbaikan` | Login |
| POST | `/api/perbaikan` | Login + Admin |
| DELETE | `/api/perbaikan/:id` | Login + Admin |
| GET | `/api/genset` | Login + Admin |
| POST | `/api/genset` | Login + Admin |
| DELETE | `/api/genset/:id` | Login + Admin |

---

## 9. History

### GET `/api/history?...` — wajib login
Log riwayat operasional gabungan (dipakai untuk laporan/filter di frontend).

---

## 10. Health Check & Status Koneksi (publik, tanpa token)

### GET `/api/health`
```json
{
  "status": "ONLINE",
  "service": "SIMON Aloptama BBMKG Wilayah V Backend API",
  "database": "PostgreSQL + Prisma ORM",
  "timestamp": "2026-08-08T10:00:00.000Z"
}
```

### GET `/api/connection-stream`
Server-Sent Events ringan untuk indikator status koneksi di frontend: server mengirim `event: status` dengan `{ "db": true|false }` setiap detik. Publik, tanpa data sensitif (maks. 300 koneksi bersamaan).

---

## Format Response Standar

Semua endpoint (kecuali `/health`) mengikuti pola:

```json
// Sukses
{ "success": true, "data": { ... } }

// Gagal
{ "success": false, "message": "Pesan error yang jelas dalam Bahasa Indonesia" }
```