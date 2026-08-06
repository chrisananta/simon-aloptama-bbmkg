-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'UPT_PIMPINAN');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('NORMAL', 'GANGGUAN', 'MATI');

-- CreateEnum
CREATE TYPE "CalibrationStatus" AS ENUM ('VALID', 'SEGERA_DIKALIBRASI', 'KADALUWARSA');

-- CreateEnum
CREATE TYPE "LogAction" AS ENUM ('TAMBAH', 'EDIT', 'HAPUS', 'SIMPAN_SLA_OLA', 'SIMPAN_KALIBRASI', 'SYNC_SERVER', 'RESET_DATA', 'EXPORT_DATA', 'LOGIN', 'LOGOUT', 'REFRESH_TOKEN');

-- CreateEnum
CREATE TYPE "LogTable" AS ENUM ('master_stasiun', 'master_alat', 'master_sla_ola', 'master_akun', 'kalibrasi', 'sistem', 'pengaturan', 'autentikasi');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'UPT_PIMPINAN',
    "title" TEXT NOT NULL,
    "nip" TEXT,
    "email" TEXT,
    "uptStation" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upt_stations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regionGroup" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upt_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "uptStation" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "conditionStatus" "EquipmentStatus" NOT NULL DEFAULT 'NORMAL',
    "calibrationStatus" "CalibrationStatus" NOT NULL DEFAULT 'VALID',
    "lastCalibrated" TEXT NOT NULL,
    "calibrationValidUntil" TEXT NOT NULL,
    "calibrationAgency" TEXT NOT NULL,
    "lastReportedDate" TEXT,
    "downtimeDuration" TEXT,
    "issueDescription" TEXT,
    "slaScore" DOUBLE PRECISION,
    "olaScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stationId" TEXT,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_ola_logs" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT,
    "uptStation" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kondisiSla" BOOLEAN NOT NULL DEFAULT true,
    "kondisiOla" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "kendala" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NORMAL',
    "actor" TEXT NOT NULL DEFAULT 'Operator UPT',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sla_ola_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibration_records" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "uptStation" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "lastCalibrated" TEXT NOT NULL,
    "calibrationValidUntil" TEXT NOT NULL,
    "calibrationAgency" TEXT NOT NULL,
    "certificateNumber" TEXT,
    "calibrationStatus" "CalibrationStatus" NOT NULL DEFAULT 'VALID',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calibration_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "table" "LogTable" NOT NULL,
    "action" "LogAction" NOT NULL,
    "recordId" TEXT NOT NULL,
    "recordName" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'System',
    "details" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "ipOrSource" TEXT DEFAULT 'SIMON API',

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "upt_stations_code_key" ON "upt_stations"("code");

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "upt_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_ola_logs" ADD CONSTRAINT "sla_ola_logs_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_records" ADD CONSTRAINT "calibration_records_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
