-- CreateTable
CREATE TABLE "calibration_listed_devices" (
    "deviceId" TEXT NOT NULL,
    "listedBy" TEXT NOT NULL,
    "listedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calibration_listed_devices_pkey" PRIMARY KEY ("deviceId")
);