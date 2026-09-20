import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// KONFIGURASI
// ============================================================================
const TAHUN = 2026;

// Taruh ke-9 file CSV ini di scripts/data/ dengan nama PERSIS seperti di
// bawah (atau sesuaikan filename-nya di sini kalau nama file Anda beda).
// category: 'PER_ROW' artinya kategori dibaca per-baris dari kolom "Merk"
// (khusus file AWOS Kat II & III yang menggabungkan 2 kategori sekaligus).
export const FILES: { filename: string; category: string | 'PER_ROW' }[] = [
  { filename: 'sla-ola-AWOS_KAT_I.csv', category: 'AWOS Kat. I' },
  { filename: 'sla-ola-ACCELEROGRAPH.csv', category: 'Accelerograph' },
  { filename: 'sla-ola-ARG.csv', category: 'ARG' },
  { filename: 'sla-ola-AWS.csv', category: 'AWS' },
  { filename: 'sla-ola-LIGHTNING_DETECTOR.csv', category: 'Lightning Detector' },
  { filename: 'sla-ola-RADAR.csv', category: 'Radar Cuaca' },
  { filename: 'sla-ola-SEISMO.csv', category: 'Seismometer' },
  { filename: 'sla-ola-SIRENE.csv', category: 'Sirine' },
  { filename: 'sla-ola-WRS_NG.csv', category: 'WRS NG' },
  { filename: 'sla-ola-AWOS_KAT_II_III.csv', category: 'PER_ROW' },
];

// Sub-kategori per-baris untuk file AWOS Kat II & III (kolom "Merk").
const SUBCATEGORY_MAP: Record<string, string> = {
  'AWOS KAT II': 'AWOS Kat. II',
  'AWOS KAT III': 'AWOS Kat. III',
};

const MONTH_NORMALIZE: Record<string, string> = {
  JANUARI: 'Januari', FEBRUARI: 'Februari', MARET: 'Maret', APRIL: 'April',
  MEI: 'Mei', JUNI: 'Juni', JULI: 'Juli', AGUSTUS: 'Agustus',
  SEPTEMBER: 'September', OKTOBER: 'Oktober', NOVEMBER: 'November', DESEMBER: 'Desember',
};

// Alias eksplisit: nama lokasi di CSV yang tidak persis sama dengan
// Device.site di master data (typo/ganti nama/beda urutan kata) -> devicesId
// yang benar. Dikonfirmasi manual satu-satu, JANGAN ditebak otomatis.
const LOCATION_TO_DEVICE_ID: Record<string, string> = {
  'Bandara Stevanus Rumbewas  - Serui': 'ALT0016',           // AWOS Kat. I, ganti nama -> "Stamet Sudjarwo Tjondronegoro - Serui"
  'ARG Arso 1': 'ALT0057',                                  // = "ARG Arso"
  'Stamet Jayapura': 'ALT0026',                              // AWOS Kat. III, typo -> "Stamet Sentani"
  'FKMPM (Wanggar, Nabire)': 'ALT0129',                      // typo -> "FKMPM (Kurik, Merauke)"
  'BPBD Nabire': 'ALT0162',                                  // = "BPBD  Kab. Nabire"
  'Mako Lantamal X': 'ALT0146',                              // = "BPBD Kab. Keerom ( Relokasi Ke lantamal X)"
  'AWS  Degrean (STR I )Stamet Tanah Merah': 'ALT0047',
  'AWS Stamet Tanah Merah': 'ALT0047',
  'AWS Degreane ( STR I ) Stamet Sarmi': 'ALT0056',
  'AWS Degreane (STR I )Stamet Manokwari': 'ALT0032',
  'AWS Stamet Manokwari Degreane': 'ALT0032',
  'AWS Mesonet Sorong': 'ALT0010',
  'AWS Staklim Jayapura IKRO': 'ALT0076',
  'AWS Stamet Fakfak': 'ALT0013',
  'AWS Stamet Kaimana': 'ALT0015',
  'AWS Stamet Manokwari Rekayasa': 'ALT0079',
};
// ============================================================================

// Normalisasi nama lokasi untuk matching: kumpulkan spasi ganda jadi satu,
// hapus spasi yang menempel di dalam/luar tanda kurung, lowercase.
export function normalizeName(s: string): string {
  return s
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)/g, ')')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cols.push(current); current = '';
    } else current += char;
  }
  cols.push(current);
  return cols;
}

interface ParsedValue { sla?: number; ola?: number }

/**
 * Parser untuk format "grid harian": tiap file berisi banyak section
 * (DATA SLA/OLA {KATEGORI} lalu BULAN {NAMA} 2026), masing-masing section
 * punya tabel harian ON/OFF (SLA) atau persen (OLA) per lokasi, ditutup
 * kolom "Persentase Aktif (%)" yang langsung kita pakai (tidak perlu
 * hitung ulang dari data harian).
 */
export function parseDailyGridCsv(
  content: string,
  defaultCategory: string | 'PER_ROW'
): { combined: Map<string, ParsedValue>; deviceIdByKey: Map<string, string> } {
  const rows = content.split(/\r?\n/).map((l) => splitCsvLine(l));
  const n = rows.length;
  const MONTHS = Object.keys(MONTH_NORMALIZE);

  // key: "kategori|bulan|lokasiMentah" -> {sla, ola}
  const combined = new Map<string, ParsedValue>();
  const deviceIdByKey = new Map<string, string>(); // kalau lokasi match via alias devicesId langsung

  let i = 0;
  while (i < n) {
    const cell0 = (rows[i][0] || '').trim().toUpperCase();
    if (cell0.startsWith('DATA ')) {
      // Cari nama bulan di baris berikutnya ("BULAN ... 2026")
      let bulan: string | null = null;
      if (rows[i + 1] && (rows[i + 1][0] || '').trim().toUpperCase().startsWith('BULAN')) {
        const line = rows[i + 1][0].toUpperCase();
        for (const m of MONTHS) {
          if (line.includes(m)) { bulan = MONTH_NORMALIZE[m]; break; }
        }
      }

      // Cari baris header: cari baris yang punya kolom "status/kondisi" DAN
      // "persentase" sekaligus — lebih fleksibel daripada cek cell pertama
      // persis "No" (beberapa file pakai "Jenis" di kolom pertama header).
      let headerIdx = -1;
      for (let j = i + 1; j < Math.min(i + 8, n); j++) {
        const row = rows[j];
        if (!row) continue;
        const hasStatus = row.some((c) => {
          const cl = (c || '').trim().toLowerCase();
          return cl.includes('status') || cl.includes('kondisi');
        });
        const hasPersentase = row.some((c) => (c || '').trim().toLowerCase().includes('persentase'));
        if (hasStatus && hasPersentase) { headerIdx = j; break; }
      }
      if (headerIdx === -1 || !bulan) { i++; continue; }

      const header = rows[headerIdx];
      const isPerRow = defaultCategory === 'PER_ROW';
      const locIdx = isPerRow ? 2 : 1;
      const catIdx = isPerRow ? 1 : -1;

      let pctIdx = -1;
      let dailyStartIdx = -1;
      header.forEach((h, idx) => {
        const hl = (h || '').trim().toLowerCase();
        if (pctIdx === -1 && hl.includes('persentase')) pctIdx = idx;
        if (dailyStartIdx === -1 && (hl.includes('status') || hl.includes('kondisi'))) dailyStartIdx = idx;
      });
      if (pctIdx === -1 || dailyStartIdx === -1) { i = headerIdx + 1; continue; }

      // Baris data dimulai setelah header (lewati 1 baris index angka 1..31 kalau ada)
      let k = headerIdx + 1;
      if (rows[k] && (rows[k][0] || '').trim() === '') k++;

      while (k < n) {
        const r = rows[k];
        if (!r || !(r[0] || '').trim()) break;
        const first = r[0].trim();
        // Baris data valid: nomor urut (1,2,3,...) ATAU label "SLA"/"OLA" di
        // kolom pertama, tergantung format file. Berhenti kalau ketemu
        // penanda TOTAL/DATA/BULAN section berikutnya.
        if (/^(TOTAL|DATA|BULAN)/i.test(first)) break;
        if (!/^\d+$/.test(first) && !/^(SLA|OLA)$/i.test(first)) break;

        const lokasi = (r[locIdx] || '').trim();
        if (!lokasi) { k++; continue; }

        let kategori = defaultCategory;
        if (isPerRow) {
          const raw = (r[catIdx] || '').trim().toUpperCase();
          kategori = SUBCATEGORY_MAP[raw] || raw;
        }

        const firstDailyVal = (r[dailyStartIdx] || '').trim().toUpperCase();
        const jenis: 'sla' | 'ola' = firstDailyVal === 'ON' || firstDailyVal === 'OFF' ? 'sla' : 'ola';

        const pctStr = (r[pctIdx] || '').replace('%', '').trim();
        const pct = parseFloat(pctStr);

        const key = `${kategori}|${bulan}|${lokasi}`;
        if (!isNaN(pct)) {
          const entry = combined.get(key) || {};
          entry[jenis] = pct;
          combined.set(key, entry);
        }

        if (LOCATION_TO_DEVICE_ID[lokasi]) {
          deviceIdByKey.set(key, LOCATION_TO_DEVICE_ID[lokasi]);
        }

        k++;
      }
      i = k;
    } else {
      i++;
    }
  }

  return { combined, deviceIdByKey };
}

interface DeviceLite {
  devicesId: string;
  site: string;
  category: string;
}

async function main() {
  console.log(`🔍 Mengambil semua alat dari database...`);
  const allDevices = (await prisma.device.findMany()) as unknown as DeviceLite[];
  const deviceById = new Map<string, DeviceLite>(allDevices.map((d) => [d.devicesId, d]));

  // Utamakan cocokkan berdasarkan NAMA LOKASI SAJA (sudah terbukti akurat
  // lewat validasi manual) — kategori cuma dipakai sebagai disambiguator
  // kalau ada 2+ device beda kategori kebetulan punya nama site yang sama.
  // Ini supaya import tetap jalan meski teks kategori di database ternyata
  // beda dari yang diasumsikan script (mis. "AWOS KAT I" vs "AWOS Kat. I").
  const devicesByName = new Map<string, DeviceLite[]>();
  for (const d of allDevices) {
    const key = normalizeName(d.site);
    if (!devicesByName.has(key)) devicesByName.set(key, []);
    devicesByName.get(key)!.push(d);
  }

  console.log(`✅ ${allDevices.length} alat ditemukan di database.\n`);

  let totalSaved = 0;
  let totalIncomplete = 0;
  const globalNotFound = new Map<string, Set<string>>(); // kategori -> lokasi
  const categoryMismatchWarnings = new Set<string>();

  for (const { filename, category } of FILES) {
    const csvPath = path.join(__dirname, 'data', filename);
    if (!fs.existsSync(csvPath)) {
      console.log(`⏭️  Lewati "${filename}" (file belum ada di scripts/data/).`);
      continue;
    }

    const content = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '');
    const { combined, deviceIdByKey } = parseDailyGridCsv(content, category);

    let saved = 0;
    let incomplete = 0;

    for (const [key, val] of combined) {
      const [kategori, bulan, lokasi] = key.split('|');

      if (val.sla === undefined || val.ola === undefined) {
        incomplete++;
        continue;
      }

      // 1) Alias devicesId eksplisit (paling pasti)
      const explicitId = deviceIdByKey.get(key);
      let device = explicitId ? deviceById.get(explicitId) : undefined;

      // 2) Cocokkan by nama lokasi. Kalau nama itu cuma dipunyai 1 device,
      //    langsung pakai (kategori di DB boleh beda teks, tidak masalah).
      //    Kalau nama dipunyai 2+ device, baru pakai kategori utk milih.
      if (!device) {
        const candidates = devicesByName.get(normalizeName(lokasi)) || [];
        if (candidates.length === 1) {
          device = candidates[0];
          if (device.category !== kategori) {
            categoryMismatchWarnings.add(`"${kategori}" (skrip) vs "${device.category}" (database) — lokasi "${lokasi}"`);
          }
        } else if (candidates.length > 1) {
          device = candidates.find((d) => d.category === kategori) || candidates[0];
        }
      }

      if (!device) {
        if (!globalNotFound.has(kategori)) globalNotFound.set(kategori, new Set());
        globalNotFound.get(kategori)!.add(lokasi);
        continue;
      }

      await prisma.deviceMonthlyScore.upsert({
        where: { deviceId_month_year: { deviceId: device.devicesId, month: bulan, year: TAHUN } },
        update: { sla: val.sla, ola: val.ola, actor: 'Import Script (rekap bulanan)' },
        create: {
          deviceId: device.devicesId,
          month: bulan,
          year: TAHUN,
          sla: val.sla,
          ola: val.ola,
          actor: 'Import Script (rekap bulanan)',
        },
      });
      saved++;
    }

    console.log(`📄 ${filename} → ✅ ${saved} disimpan, ⚠️ ${incomplete} tidak lengkap (SLA/OLA tidak berpasangan)`);
    totalSaved += saved;
    totalIncomplete += incomplete;
  }

  console.log('\n════════════════════════════════════════════════');
  console.log('📊 RINGKASAN IMPORT REKAP SLA/OLA BULANAN (10 kategori)');
  console.log('════════════════════════════════════════════════');
  console.log(`✅ Total berhasil disimpan : ${totalSaved} record`);
  console.log(`⚠️  Total tidak lengkap     : ${totalIncomplete} (device hanya punya SLA atau OLA saja bulan itu)`);

  if (categoryMismatchWarnings.size > 0) {
    console.log(`\nℹ️  ${categoryMismatchWarnings.size} device tersimpan meski teks kategori di database beda dari skrip (tidak masalah, sudah otomatis dicocokkan lewat nama lokasi):`);
    categoryMismatchWarnings.forEach((w) => console.log(`   - ${w}`));
  }

  if (globalNotFound.size > 0) {
    const totalNotFound = [...globalNotFound.values()].reduce((a, s) => a + s.size, 0);
    console.log(`\n⚠️  ${totalNotFound} nama lokasi TIDAK DITEMUKAN di Master Alat (dilewati semua bulannya):`);
    for (const [kat, locs] of globalNotFound) {
      console.log(`   [${kat}]`);
      locs.forEach((l) => console.log(`      - "${l}"`));
    }
    console.log('\n   Tambahkan alias-nya (nama -> devicesId) di LOCATION_TO_DEVICE_ID');
    console.log('   pada bagian atas script ini, lalu jalankan ulang (aman diulang).');
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