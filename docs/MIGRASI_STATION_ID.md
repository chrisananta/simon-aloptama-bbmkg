# Migrasi `uptStation` (teks) -> `stationId` (FK)

Kolom teks `uptStation` di `devices`, `sla_ola_logs`, `calibration_records` dan `users`
diganti relasi `stationId` ke `upt_stations.id`. Pencocokan kode/nama
(`isSameUpt`, `isDeviceInUserUpt`, `findStationByNameOrCode`) dihapus; akses dan filter
sekarang membandingkan ID langsung (`canAccessStation()` di backend).

## Urutan deploy

1. **Backup:** `pg_dump -Fc "$DATABASE_URL" > backup_sebelum_stationid.dump`
2. **Preflight (read-only):** `psql "$DATABASE_URL" -f simon-backend/prisma/preflight/20261019_station_normalization.sql`
   Bagian 1-4 harus kosong. Kalau ada baris, samakan nilai `uptStation`-nya dengan KODE atau
   NAMA stasiun di `upt_stations`, lalu ulangi.
3. **Deploy** kode baru. `docker-entrypoint.sh` menjalankan `prisma migrate deploy`
   (migrasi `20261019000000_normalize_station_relations`).
4. Semua user harus **login ulang** satu kali (token lama tidak membawa `stationId`).

Kalau migrasi berhenti karena data tak terpetakan, tidak ada yang berubah (satu transaksi).
Perbaiki datanya, lalu `prisma migrate resolve --rolled-back 20261019000000_normalize_station_relations`
dan jalankan lagi.

## Aturan data baru
- `User.stationId` boleh kosong = level Balai. **TEKNISI_UPT wajib** punya stasiun.
- Log SLA/OLA bulanan dan catatan kalibrasi mengambil stasiun dari alatnya.
- Stasiun tidak bisa dihapus selama masih dipakai alat, akun, log SLA/OLA, atau kalibrasi.
- API: field `uptStation` diganti `stationId` (ID stasiun); filter history memakai `?stationId=`.