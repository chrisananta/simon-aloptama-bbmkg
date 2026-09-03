import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, 'data', 'master-stasiun.csv');

// Koordinat perkiraan per kota (dipakai karena CSV tidak menyertakan lat/long).
// Silakan koreksi kalau ada yang kurang presisi.
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Sorong': { lat: -0.89, lng: 131.286 },
  'Fakfak': { lat: -2.555, lng: 132.526 },
  'Kaimana': { lat: -3.645, lng: 133.694 },
  'Serui': { lat: -1.83, lng: 136.064 },
  'Biak': { lat: -1.191, lng: 136.104 },
  'Kab. Jayapura': { lat: -2.576, lng: 140.518 },
  'Manokwari': { lat: -0.892, lng: 134.051 },
  'Timika': { lat: -4.53, lng: 136.893 },
  'Merauke': { lat: -8.515, lng: 140.415 },
  'Tanah Merah': { lat: -6.077, lng: 140.342 },
  'Enarotali': { lat: -3.927, lng: 136.353 },
  'Wamena': { lat: -4.102, lng: 138.958 },
  'Nabire': { lat: -3.361, lng: 135.492 },
  'Kab. Sarmi': { lat: -1.85, lng: 138.75 },
  'Jayapura': { lat: -2.532, lng: 140.708 },
};

// Kelompok wilayah/provinsi per kota
const REGION_GROUP: Record<string, string> = {
  'Sorong': 'Papua Barat Daya',
  'Fakfak': 'Papua Barat',
  'Kaimana': 'Papua Barat',
  'Serui': 'Papua',
  'Biak': 'Papua',
  'Kab. Jayapura': 'Papua',
  'Manokwari': 'Papua Barat',
  'Timika': 'Papua Tengah',
  'Merauke': 'Papua Selatan',
  'Tanah Merah': 'Papua Selatan',
  'Enarotali': 'Papua Tengah',
  'Wamena': 'Papua Pegunungan',
  'Nabire': 'Papua Tengah',
  'Kab. Sarmi': 'Papua',
  'Jayapura': 'Papua',
};

interface CsvRow {
  ID_STASIUN: string;
  NAMA_STASIUN: string;
  JENIS_STASIUN: string;
  KOTA: string;
}

// Pemisah baris CSV yang paham tanda kutip: koma DI DALAM tanda kutip ganda
// tidak akan ikut dianggap sebagai pemisah kolom (mis. "Kota, Provinsi").
function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
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

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ File CSV tidak ditemukan di: ${CSV_PATH}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8').replace(/^\uFEFF/, '');
  const rows = parseCsv(csvContent);
  console.log(`📄 ${rows.length} baris stasiun ditemukan di CSV.\n`);

  let created = 0;
  let updated = 0;
  const missingCityCoords = new Set<string>();

  for (const row of rows) {
    const code = row.ID_STASIUN.trim();
    const city = row.KOTA.trim();
    const coords = CITY_COORDS[city];
    const regionGroup = REGION_GROUP[city] || 'Papua';

    if (!coords) {
      missingCityCoords.add(city);
    }

    const data = {
      stationid: code,
      name: row.NAMA_STASIUN.trim(),
      regionGroup,
      location: city,
      latitude: coords?.lat ?? -2.5,
      longitude: coords?.lng ?? 138.0,
    };

    const existing = await prisma.uptStation.findUnique({ where: { stationid: code } });

    if (existing) {
      await prisma.uptStation.update({ where: { stationid: code }, data });
      updated++;
      console.log(`  ↻ ${code} - ${data.name} (diperbarui)`);
    } else {
      await prisma.uptStation.create({ data });
      created++;
      console.log(`  ✓ ${code} - ${data.name} (baru)`);
    }
  }

  console.log('\n════════════════════════════════════════════════');
  console.log('📊 RINGKASAN IMPORT STASIUN');
  console.log('════════════════════════════════════════════════');
  console.log(`✅ Stasiun baru dibuat : ${created}`);
  console.log(`↻  Stasiun diperbarui  : ${updated}`);
  if (missingCityCoords.size > 0) {
    console.log(`\n⚠️  Kota berikut belum ada koordinat perkiraan, dipakai default (-2.5, 138.0):`);
    missingCityCoords.forEach((c) => console.log(`   - "${c}"`));
    console.log('   Sesuaikan koordinatnya manual nanti lewat form Edit Stasiun.');
  }
  console.log('════════════════════════════════════════════════');
  console.log('\n➡️  Sekarang jalankan: npx tsx scripts/import-devices-from-csv.ts');
  console.log('    untuk mengimpor alat yang sebelumnya terlewat.\n');
}

main()
  .catch((err) => {
    console.error('❌ Gagal import:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
  