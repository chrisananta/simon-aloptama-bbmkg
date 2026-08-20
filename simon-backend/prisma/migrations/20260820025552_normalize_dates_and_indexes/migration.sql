-- CreateTable
CREATE TABLE "device_monthly_scores" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sla" DOUBLE PRECISION NOT NULL,
    "ola" DOUBLE PRECISION NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'Admin INSKAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_monthly_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_monthly_scores_deviceId_month_year_key" ON "device_monthly_scores"("deviceId", "month", "year");

-- AddForeignKey
ALTER TABLE "device_monthly_scores" ADD CONSTRAINT "device_monthly_scores_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
