-- AlterTable: riwayat pelaksanaan kalibrasi lapang
ALTER TABLE "calibration_records"
  ADD COLUMN IF NOT EXISTS "orderNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "assignmentLetterNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "startDate" DATE,
  ADD COLUMN IF NOT EXISTS "endDate" DATE;