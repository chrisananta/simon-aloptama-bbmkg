#!/bin/sh
set -e

echo "==> Menjalankan Prisma migrate deploy..."
npx prisma migrate deploy --schema=simon-backend/prisma/schema.prisma

echo "==> Migration selesai. Menjalankan server..."
exec "$@"
