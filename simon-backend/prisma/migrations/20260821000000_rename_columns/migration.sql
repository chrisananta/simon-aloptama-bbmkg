ALTER TABLE "devices" RENAME COLUMN "id" TO "devicesId";
ALTER TABLE "devices" RENAME COLUMN "name" TO "site";
ALTER TABLE "devices" RENAME COLUMN "subCategory" TO "merk";
ALTER TABLE "devices" RENAME COLUMN "calibrationAgency" TO "timkalibrasi";

ALTER TABLE "upt_stations" RENAME COLUMN "code" TO "stationid";
ALTER INDEX IF EXISTS "upt_stations_code_key" RENAME TO "upt_stations_stationid_key";