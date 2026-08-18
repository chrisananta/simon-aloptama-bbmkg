/**
 * Import data alat ASLI dari file CSV (scripts/data/master-peralatan.csv)
 * ke database, mengikuti stasiun UPT yang SUDAH ADA di database kamu.
 *
 * Jalankan dengan:
 *   npx tsx scripts/import-devices-from-csv.ts
 *
 * Cara kerja:
 * 1. Baca daftar stasiun yang BENERAN ada di database kamu (dicocokkan lewat kode, mis. MET001)
 * 2. Baca setiap baris di CSV, cocokkan ID_STASIUN dengan kode stasiun di database
 * 3. Baris yang kodenya COCOK -> alat dibuat/di-update di database
 * 4. Baris yang kodenya TIDAK ditemukan -> DILEWATI, dicatat di laporan akhir
 *    (supaya kamu tahu persis stasiun mana yang perlu ditambahkan dulu)
 *
 * Aman dijalankan berkali-kali: kalau ID_ALAT sudah ada, datanya di-UPDATE
 * (bukan bikin duplikat).
 */

import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, 'data', 'master-peralatan.csv');

// Pemetaan JENIS_PERALATAN di CSV -> nama kategori yang dipakai aplikasi SIMON.
// Kalau ada jenis baru yang tidak dikenali, tambahkan pemetaannya di sini.
const CATEGORY_MAP: Record<string, string> = {
  'AWOS KAT I': 'AWOS Kat. I',
  'AWOS KAT II': 'AWOS Kat. II',
  'AWOS KAT III': 'AWOS Kat. III',
  'AWS': 'AWS',
  'ARG': 'ARG',
  'RADAR CUACA': 'Radar Cuaca',
  'LIGHTNING DETECTOR': 'Lightning Detector',
  'SEISMO': 'Seismometer',
  'ACCELEROGRAPH': 'Accelerograph',
  'WRS NG': 'WRS NG',
  'SIRENE': 'Sirine',
};

interface CsvRow {
  ID_ALAT: string;
  ID_STASIUN: string;
  JENIS_PERALATAN: string;
  NAMA_PERALATAN: string;
  MERK: string;
  LATITUDE: string;
  LONGITUDE: string;
}

// Pemisah baris CSV yang paham tanda kutip: koma DI DALAM tanda kutip ganda
// (mis. "MTJPI (MuaraTami, Jayapura)") tidak akan ikut dianggap sebagai
// pemisah kolom. Tanpa ini, baris seperti itu bakal pecah ke kolom yang salah.
function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // tanda kutip ganda literal ("") di dalam field yang dikutip
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cols.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cols.push(current);
  return cols;
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const row: any = {};
    header.forEach((h, idx) => {
      row[h] = (cols[idx] ?? '').trim();
    });
    rows.push(row as CsvRow);
  }
  return rows;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ File CSV tidak ditemukan di: ${CSV_PATH}`);
    console.error('   Pastikan file "master-peralatan.csv" ada di folder scripts/data/');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8').replace(/^\uFEFF/, ''); // strip BOM kalau ada
  const rows = parseCsv(csvContent);
  console.log(`📄 ${rows.length} baris alat ditemukan di CSV.\n`);

  console.log('🔍 Mengambil daftar stasiun dari database...');
  const stations = await prisma.uptStation.findMany();
  const stationByCode = new Map(stations.map((s) => [s.code.trim().toUpperCase(), s]));
  console.log(`✅ Ditemukan ${stations.length} stasiun di database.\n`);

  const now = new Date();
  const lastCalibrated = new Date(now);
  lastCalibrated.setMonth(lastCalibrated.getMonth() - 6);
  const validUntil = new Date(now);
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  let created = 0;
  let updated = 0;
  const skippedByMissingStation: Record<string, number> = {};
  const unknownCategories = new Set<string>();

  for (const row of rows) {
    const stationCode = row.ID_STASIUN.trim().toUpperCase();
    const station = stationByCode.get(stationCode);

    if (!station) {
      skippedByMissingStation[stationCode] = (skippedByMissingStation[stationCode] || 0) + 1;
      continue;
    }

    const rawCategory = row.JENIS_PERALATAN.trim().toUpperCase();
    const category = CATEGORY_MAP[rawCategory];
    if (!category) {
      unknownCategories.add(row.JENIS_PERALATAN);
    }
    const finalCategory = category || row.JENIS_PERALATAN;

    const lat = row.LATITUDE ? parseFloat(row.LATITUDE) : station.latitude;
    const lng = row.LONGITUDE ? parseFloat(row.LONGITUDE) : station.longitude;

    const deviceId = row.ID_ALAT.trim();
    const deviceName = row.NAMA_PERALATAN.trim() || `${finalCategory} ${station.name}`;

    const existing = await prisma.device.findUnique({ where: { id: deviceId } });

    const data = {
      name: deviceName,
      category: finalCategory,
      subCategory: row.MERK && row.MERK !== '-' ? row.MERK : '',
      uptStation: station.name,
      locationName: station.location || station.name,
      latitude: isNaN(lat) ? station.latitude : lat,
      longitude: isNaN(lng) ? station.longitude : lng,
      conditionStatus: 'NORMAL' as const,
      calibrationStatus: 'VALID' as const,
      lastCalibrated: formatDate(lastCalibrated),
      calibrationValidUntil: formatDate(validUntil),
      calibrationAgency: 'Tim INSKAL BBMKG Wilayah V',
    };

    if (existing) {
      await prisma.device.update({ where: { id: deviceId }, data });
      updated++;
      console.log(`  ↻ [${station.name}] ${deviceName} (${deviceId}) - diperbarui`);
    } else {
      await prisma.device.create({ data: { id: deviceId, ...data } });
      created++;
      console.log(`  ✓ [${station.name}] ${deviceName} (${deviceId}) - baru`);
    }
  }

  console.log('\n════════════════════════════════════════════════');
  console.log('📊 RINGKASAN IMPORT');
  console.log('════════════════════════════════════════════════');
  console.log(`✅ Alat baru dibuat   : ${created}`);
  console.log(`↻  Alat diperbarui    : ${updated}`);

  const totalSkipped = Object.values(skippedByMissingStation).reduce((a, b) => a + b, 0);
  if (totalSkipped > 0) {
    console.log(`\n⚠️  ${totalSkipped} baris DILEWATI karena kode stasiun belum ada di database:`);
    Object.entries(skippedByMissingStation)
      .sort((a, b) => b[1] - a[1])
      .forEach(([code, count]) => {
        console.log(`   - ${code}: ${count} alat`);
      });
    console.log('\n   Tambahkan stasiun-stasiun di atas lewat Master Stasiun (pastikan');
    console.log('   kode-nya PERSIS SAMA, mis. "MET013"), lalu jalankan ulang script ini');
    console.log('   untuk mengimpor alat-alat yang tadi terlewat.');
  }

  if (unknownCategories.size > 0) {
    console.log(`\n⚠️  Ada jenis peralatan yang tidak dikenali (tetap diimpor apa adanya):`);
    unknownCategories.forEach((c) => console.log(`   - "${c}"`));
  }

  console.log('════════════════════════════════════════════════\n');
}

main()
  .catch((err) => {
    console.error('❌ Gagal import:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
