-- AlterTable: alat yang hanya dikalibrasi (tidak dipantau SLA/OLA)
ALTER TABLE "devices"
  ADD COLUMN IF NOT EXISTS "calibrationOnly" BOOLEAN NOT NULL DEFAULT false;