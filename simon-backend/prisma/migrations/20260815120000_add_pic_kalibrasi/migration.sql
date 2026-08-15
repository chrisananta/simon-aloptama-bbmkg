-- Kolom ini sudah ada di schema.prisma tapi belum pernah dibuatkan migration,
-- jadi database production/docker yang cuma menjalankan "migrate deploy"
-- tidak punya kolom ini. Migration ini menambahkannya supaya sinkron.
ALTER TABLE "devices" ADD COLUMN "picKalibrasi" TEXT DEFAULT 'Balai';