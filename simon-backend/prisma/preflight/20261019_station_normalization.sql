-- Preflight (READ-ONLY) untuk migrasi 20261019000000_normalize_station_relations.
-- Jalankan SEBELUM deploy:  psql "$DATABASE_URL" -f simon-backend/prisma/preflight/20261019_station_normalization.sql
-- Hasil yang diharapkan: bagian 1-4 KOSONG. Kalau ada baris, perbaiki nilainya (samakan
-- dengan KODE atau NAMA stasiun di upt_stations) sebelum migrasi dijalankan.

\echo '== 1. Alat dengan stasiun tidak dikenal (tanpa stationId & teks tidak cocok) =='
SELECT d."uptStation" AS teks_stasiun, count(*) AS jumlah_alat
FROM devices d
WHERE d."stationId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM upt_stations s
    WHERE upper(btrim(d."uptStation")) IN (upper(btrim(s.stationid)), upper(btrim(s.name))))
GROUP BY d."uptStation" ORDER BY 1;

\echo '== 2. SLA/OLA log dengan stasiun tidak dikenal (dan alatnya tidak bisa dipakai sebagai fallback) =='
SELECT l."uptStation" AS teks_stasiun, count(*) AS jumlah_log
FROM sla_ola_logs l
WHERE NOT EXISTS (
        SELECT 1 FROM upt_stations s
        WHERE upper(btrim(l."uptStation")) IN (upper(btrim(s.stationid)), upper(btrim(s.name))))
  AND NOT EXISTS (SELECT 1 FROM devices d WHERE d."devicesId" = l."deviceId")
GROUP BY l."uptStation" ORDER BY 1;

\echo '== 3. Catatan kalibrasi dengan stasiun tidak dikenal =='
SELECT r."uptStation" AS teks_stasiun, count(*) AS jumlah_catatan
FROM calibration_records r
WHERE NOT EXISTS (
        SELECT 1 FROM upt_stations s
        WHERE upper(btrim(r."uptStation")) IN (upper(btrim(s.stationid)), upper(btrim(s.name))))
  AND NOT EXISTS (SELECT 1 FROM devices d WHERE d."devicesId" = r."deviceId")
GROUP BY r."uptStation" ORDER BY 1;

\echo '== 4. TEKNISI_UPT tanpa stasiun yang valid (wajib diperbaiki) =='
SELECT u.username, u."uptStation" AS teks_stasiun
FROM users u
WHERE u.role = 'TEKNISI_UPT'
  AND NOT EXISTS (
    SELECT 1 FROM upt_stations s
    WHERE upper(btrim(u."uptStation")) IN (upper(btrim(s.stationid)), upper(btrim(s.name))))
ORDER BY 1;

\echo '== 5. Informasi: user non-teknisi yang akan menjadi level Balai (stationId NULL) =='
SELECT u.username, u.role, u."uptStation" AS teks_stasiun
FROM users u
WHERE u.role <> 'TEKNISI_UPT'
  AND NOT EXISTS (
    SELECT 1 FROM upt_stations s
    WHERE upper(btrim(u."uptStation")) IN (upper(btrim(s.stationid)), upper(btrim(s.name))))
ORDER BY 1;

\echo '== 6. Informasi: alat yang teks stasiunnya beda dari stasiun relasinya (relasi dipakai) =='
SELECT d."devicesId", d."uptStation" AS teks_lama, s.stationid, s.name AS nama_stasiun_sekarang
FROM devices d JOIN upt_stations s ON s.id = d."stationId"
WHERE upper(btrim(d."uptStation")) NOT IN (upper(btrim(s.stationid)), upper(btrim(s.name)))
ORDER BY 1;

\echo '== 7. Peringatan: teks yang cocok ke LEBIH DARI SATU stasiun (ambigu) =='
SELECT t.teks, count(*) AS jumlah_stasiun_cocok FROM (
  SELECT DISTINCT d."uptStation" AS teks FROM devices d
  UNION SELECT DISTINCT "uptStation" FROM sla_ola_logs
  UNION SELECT DISTINCT "uptStation" FROM calibration_records
  UNION SELECT DISTINCT "uptStation" FROM users) t
JOIN upt_stations s ON upper(btrim(t.teks)) IN (upper(btrim(s.stationid)), upper(btrim(s.name)))
GROUP BY t.teks HAVING count(*) > 1;