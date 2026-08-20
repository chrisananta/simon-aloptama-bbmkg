-- Migrasi: normalisasi tanggal (String -> DATE) & tambah index untuk query yang sering dipakai
--
-- CATATAN PENTING SEBELUM DIJALANKAN:
-- 1. BACKUP database dulu (pg_dump) sebelum menjalankan migrasi ini di data yang berisi.
-- 2. Migrasi ini AMAN untuk data yang formatnya konsisten "YYYY-MM-DD" (format yang
--    dipakai seluruh aplikasi ini lewat <input type="date">). Kalau ada baris dengan
--    format tanggal lain / nilai kosong, ALTER TYPE di bawah akan GAGAL dan tidak ada
--    perubahan yang diterapkan (Postgres migration DDL bersifat transaksional per statement
--    dalam satu file migrasi Prisma) - jalankan query pengecekan di bagian akhir file ini
--    dulu kalau ragu.
--
-- Catatan: relasi User -> UptStation (stationId) SENGAJA TIDAK dibuat di migrasi ini.
-- User tetap pakai kolom uptStation (string) apa adanya - lebih sederhana, tidak
-- mengubah data lain, dan GET /users tetap tanpa join. Bisa ditambahkan lagi nanti
-- kalau memang dibutuhkan.

-- === 1. Devices: String -> DATE ===
ALTER TABLE "devices"
  ALTER COLUMN "lastCalibrated" TYPE DATE USING "lastCalibrated"::date,
  ALTER COLUMN "calibrationValidUntil" TYPE DATE USING "calibrationValidUntil"::date,
  ALTER COLUMN "lastReportedDate" TYPE DATE USING NULLIF("lastReportedDate", '')::date;

-- === 2. Calibration Records: String -> DATE ===
ALTER TABLE "calibration_records"
  ALTER COLUMN "lastCalibrated" TYPE DATE USING "lastCalibrated"::date,
  ALTER COLUMN "calibrationValidUntil" TYPE DATE USING "calibrationValidUntil"::date;

-- === 3. Index tambahan untuk query yang sering dipakai ===
CREATE INDEX "devices_uptStation_idx" ON "devices"("uptStation");
CREATE INDEX "devices_category_idx" ON "devices"("category");
CREATE INDEX "devices_stationId_idx" ON "devices"("stationId");

CREATE INDEX "sla_ola_logs_timestamp_idx" ON "sla_ola_logs"("timestamp");
CREATE INDEX "sla_ola_logs_deviceId_idx" ON "sla_ola_logs"("deviceId");
CREATE INDEX "sla_ola_logs_uptStation_idx" ON "sla_ola_logs"("uptStation");

CREATE INDEX "calibration_records_deviceId_idx" ON "calibration_records"("deviceId");
CREATE INDEX "calibration_records_createdAt_idx" ON "calibration_records"("createdAt");

CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");
CREATE INDEX "audit_logs_table_idx" ON "audit_logs"("table");
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs"("actor");

-- === Query pengecekan (jalankan manual dulu kalau ragu, SEBELUM migrasi ini) ===
-- Cari baris yang formatnya BUKAN "YYYY-MM-DD" dan akan gagal di-cast ke DATE:
--
-- SELECT id, "lastCalibrated" FROM devices
--   WHERE "lastCalibrated" !~ '^\d{4}-\d{2}-\d{2}$';
-- SELECT id, "calibrationValidUntil" FROM devices
--   WHERE "calibrationValidUntil" !~ '^\d{4}-\d{2}-\d{2}$';
-- SELECT id, "lastReportedDate" FROM devices
--   WHERE "lastReportedDate" IS NOT NULL AND "lastReportedDate" !~ '^\d{4}-\d{2}-\d{2}$';
-- SELECT id, "lastCalibrated" FROM calibration_records
--   WHERE "lastCalibrated" !~ '^\d{4}-\d{2}-\d{2}$';
-- SELECT id, "calibrationValidUntil" FROM calibration_records
--   WHERE "calibrationValidUntil" !~ '^\d{4}-\d{2}-\d{2}$';
