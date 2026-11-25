-- Migrasi: tambah nilai enum untuk audit log modul Perbaikan & Genset, serta aksi LOGIN_GAGAL (percobaan login yang gagal). ADD VALUE tidak mengubah data lama; aman dijalankan berulang berkat IF NOT EXISTS.
ALTER TYPE "LogTable" ADD VALUE IF NOT EXISTS 'perbaikan';
ALTER TYPE "LogTable" ADD VALUE IF NOT EXISTS 'genset';
ALTER TYPE "LogAction" ADD VALUE IF NOT EXISTS 'LOGIN_GAGAL';