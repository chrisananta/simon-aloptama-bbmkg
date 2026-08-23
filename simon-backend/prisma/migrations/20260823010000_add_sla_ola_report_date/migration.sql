-- Tambah kolom reportDate & isLate pada sla_ola_logs, untuk mendukung
-- pengisian SLA/OLA susulan (backdate maks. 10 hari) dari data harian yang
-- terlewat, tanpa kehilangan riwayat per-tanggal.

-- 1. Tambah kolom dulu sebagai nullable supaya bisa diisi dari data lama.
ALTER TABLE "sla_ola_logs" ADD COLUMN "reportDate" DATE;
ALTER TABLE "sla_ola_logs" ADD COLUMN "isLate" BOOLEAN NOT NULL DEFAULT false;

-- 2. Backfill data historis: reportDate = tanggal dari timestamp submit lama
--    (waktu itu belum ada konsep backdate, jadi tanggal lapor = tanggal submit).
UPDATE "sla_ola_logs" SET "reportDate" = "timestamp"::date WHERE "reportDate" IS NULL;

-- 3. Kunci kolom jadi NOT NULL setelah backfill selesai.
ALTER TABLE "sla_ola_logs" ALTER COLUMN "reportDate" SET NOT NULL;

-- 4. Index untuk query historis per tanggal.
CREATE INDEX "sla_ola_logs_reportDate_idx" ON "sla_ola_logs"("reportDate");
