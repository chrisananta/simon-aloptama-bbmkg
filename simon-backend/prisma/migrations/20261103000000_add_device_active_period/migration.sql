-- Periode aktif alat (format "YYYY-MM", inklusif di kedua ujung).
-- NULL = tidak dibatasi (alat lama tetap dihitung di semua bulan seperti sebelumnya).
ALTER TABLE "devices" ADD COLUMN "aktifSejak" VARCHAR(7);
ALTER TABLE "devices" ADD COLUMN "aktifSampai" VARCHAR(7);