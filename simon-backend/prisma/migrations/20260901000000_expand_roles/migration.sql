-- Migrasi: perluas Role dari 2 nilai (ADMIN, UPT_PIMPINAN) menjadi 4 nilai
-- (TEKNISI_UPT, KAUPT_KABBMKG, ADMIN_INSKAL, SUPER_ADMIN).
--
-- Pemetaan data lama -> baru (permintaan pimpinan BBMKG, Sept 2026):
--   ADMIN        -> ADMIN_INSKAL   (akses tetap luas, tapi Database Master
--                                   dipersempit & tanpa Audit Log - diatur
--                                   di level aplikasi, bukan di migrasi ini)
--   UPT_PIMPINAN -> TEKNISI_UPT    (default paling aman; akun yang memang
--                                   pejabat KaUPT/KaBBMKG perlu di-upgrade
--                                   manual ke KAUPT_KABBMKG lewat menu
--                                   Kelola Akun setelah migrasi ini)
--
-- Postgres tidak mengizinkan hapus nilai enum secara langsung, jadi
-- pendekatannya: buat tipe enum baru, pindahkan kolom "role" ke tipe baru
-- sambil memetakan nilai lama, lalu buang tipe lama.

CREATE TYPE "Role_new" AS ENUM ('TEKNISI_UPT', 'KAUPT_KABBMKG', 'ADMIN_INSKAL', 'SUPER_ADMIN');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role_new"
  USING (
    CASE "role"::text
      WHEN 'ADMIN' THEN 'ADMIN_INSKAL'
      WHEN 'UPT_PIMPINAN' THEN 'TEKNISI_UPT'
      ELSE 'TEKNISI_UPT'
    END
  )::"Role_new";

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'TEKNISI_UPT';

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";
