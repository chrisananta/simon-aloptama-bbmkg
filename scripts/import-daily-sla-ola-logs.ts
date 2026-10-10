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

// Actor KHUSUS untuk baris hasil import script ini — sengaja BUKAN nama
// admin apa pun (lihat loadAdminActorSet di slaOlaController.ts), supaya
// baris ini selalu masuk jalur "rata-rata UPT" (resolveMonthlyScores aturan
// #2), bukan jalur "admin override" (aturan #1).
const IMPORT_ACTOR = 'Import Historis (CSV)';

const FILES: { filename: string; category: string | 'PER_ROW' }[] = [
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

const SUBCATEGORY_MAP: Record<string, string> = {
  'AWOS KAT II': 'AWOS Kat. II',
  'AWOS KAT III': 'AWOS Kat. III',
};

const MONTH_NUMBER: Record<string, number> = {
  JANUARI: 1, FEBRUARI: 2, MARET: 3, APRIL: 4, MEI: 5, JUNI: 6,
  JULI: 7, AGUSTUS: 8, SEPTEMBER: 9, OKTOBER: 10, NOVEMBER: 11, DESEMBER: 12,
};

// Sama seperti script sebelumnya — dikonfirmasi manual satu-satu.
const LOCATION_TO_DEVICE_ID: Record<string, string> = {
  'Bandara Stevanus Rumbewas  - Serui': 'ALT0016',
  'ARG Arso 1': 'ALT0057',
  'Stamet Jayapura': 'ALT0026',
  'FKMPM (Wanggar, Nabire)': 'ALT0129',
  'BPBD Nabire': 'ALT0162',
  'AWS  Degrean (STR I )Stamet Tanah Merah': 'ALT0047',
  'AWS Stamet Tanah Merah': 'ALT0047',
  'AWS Degreane ( STR I ) Stamet Sarmi': 'ALT0056',
  'AWS Degreane (STR I )Stamet Manokwari': 'ALT0032',
  'AWS Stamet Manokwari Degreane': 'ALT0032',
  'AWS Mesonet Sorong': 'ALT0010',
  'AWS Staklim Jayapura IKRO': 'ALT0076',
  'AWS Stamet Fakfak': 'ALT0013',
  'AWS Stamet Kaimana': 'ALT0015',
  'AWS Stamet Manokwari Rekayasa': 'ALT0033', // = "AWS Rekayasa Stamet Manokwari" (urutan kata beda); sebelumnya salah ke ALT0079
  'Mako Lantamal X': 'ALT0146',
  // Nama di CSV yang tidak ketemu di Master Alat database (ID dari master-peralatan.csv):
  'AWS Nimboran.Staklim Papua': 'ALT0072',
  'AWS Manokwari Selatan Rekayasa': 'ALT0079',
  'AWS Raisei': 'ALT0082',
  'AWS Stamet DIgi Enarotali': 'ALT0050',
  'AWS Mesonet (STR I ) Sorong': 'ALT0010',
  'AWS Stamet Digi Timika': 'ALT0038',
  'BPBD Kab. Keerom ( Relokasi Ke lantamal X)': 'ALT0146',
  'BPBD Kab. Keerom (Relokasi Ke lantamalX)': 'ALT0146',
  // Nama di AWS.csv versi baru:
  'AWS Nimboran Staklim Papua': 'ALT0072',
  'AWS IKRO Staklim Papua': 'ALT0076',
  'AWS IKRO Staklim Papua Barat': 'ALT0081',
  'AWS IKRO Staklim Tanah Miring': 'ALT0094',
  'AWS Digi Stamet Enarotali': 'ALT0050',
  'AWS Mesonet (STR I) Kab. Sorong': 'ALT0010',
  'AWS Digi Stamet Timika': 'ALT0038',
};
// ============================================================================

const AWOS_II_III = 'AWOS Kat. II & III';

// Bandingkan kategori tanpa peduli spasi/titik/huruf besar-kecil
// ("AWOS Kat. I" = "AWOS Kat.I" = "AWOS KAT I") dan sinonim penulisan.
function catKey(c: string): string {
  const k = (c || '').toLowerCase().replace(/[.\s]/g, '');
  if (k === 'sirine') return 'sirene';
  if (k === 'seismo') return 'seismometer';
  return k;
}
function categoryMatches(dbCategory: string, scriptCategory: string): boolean {
  if (scriptCategory === AWOS_II_III) return catKey(dbCategory).startsWith('awoskatii'); // II dan III
  return catKey(dbCategory) === catKey(scriptCategory);
}

function normalizeName(s: string): string {
  return s
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)/g, ')')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Parser CSV penuh: aman untuk sel berkutip yang berisi baris baru
 * (kolom KETERANGAN sering diisi multi-baris). Parser lama memecah per baris
 * dulu, sehingga sel multi-baris memotong tabel dan sisa lokasi di bulan
 * itu ikut terbuang.
 */
function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cur); cur = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && content[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      rows.push(row); row = [];
    } else cur += ch;
  }
  if (cur !== '' || row.length > 0) { row.push(cur); rows.push(row); }
  return rows;
}

interface DayEntry {
  category: string;
  bulanNama: string; // "JANUARI" dst — masih uppercase, dikonversi ke angka belakangan
  lokasi: string;
  hari: number; // 1-31
  jenis: 'sla' | 'ola';
  value: string; // "ON"/"OFF" atau "83%" mentah
}

/**
 * Parser: ekstrak SEMUA nilai harian (bukan cuma kolom ringkasan
 * "Persentase Aktif") dari format grid-harian.
 */
function parseDailyEntries(content: string, defaultCategory: string | 'PER_ROW'): {
  entries: DayEntry[];
  deviceIdByLocation: Map<string, string>;
} {
  const rows = parseCsv(content);
  const n = rows.length;
  const MONTHS = Object.keys(MONTH_NUMBER);
  const entries: DayEntry[] = [];
  const deviceIdByLocation = new Map<string, string>();

  let i = 0;
  while (i < n) {
    const cell0 = (rows[i][0] || '').trim().toUpperCase();
    if (cell0.startsWith('DATA ') || cell0.includes('MONITORING') || cell0.includes('AGREEMENT')) {
      let bulan: string | null = null;
      if (rows[i + 1] && (rows[i + 1][0] || '').trim().toUpperCase().startsWith('BULAN')) {
        const line = rows[i + 1][0].toUpperCase();
        for (const m of MONTHS) if (line.includes(m)) { bulan = m; break; }
      }

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
      // File AWOS II & III: format lama punya kolom kategori (No, Merk, Lokasi, Status...),
      // format baru tidak (No, Stasiun, Status/Kondisi...) -> kategori ditandai AWOS_II_III
      // dan dipilih lewat Master Alat (AWOS Kat. II atau III).
      const hasCatCol = isPerRow && String(header[1] || '').toLowerCase().includes('merk');
      const locIdx = hasCatCol ? 2 : 1;
      const catIdx = hasCatCol ? 1 : -1;

      let pctIdx = -1;
      let dailyStartIdx = -1;
      header.forEach((h, idx) => {
        const hl = (h || '').trim().toLowerCase();
        if (pctIdx === -1 && hl.includes('persentase')) pctIdx = idx;
        if (dailyStartIdx === -1 && (hl.includes('status') || hl.includes('kondisi'))) dailyStartIdx = idx;
      });
      if (pctIdx === -1 || dailyStartIdx === -1) { i = headerIdx + 1; continue; }

      let k = headerIdx + 1;
      if (rows[k] && (rows[k][0] || '').trim() === '') k++;

      while (k < n) {
        const r = rows[k];
        if (!r) break;
        const first = (r[0] || '').trim();
        const lokasiCell = (r[locIdx] || '').trim();
        if (/^(TOTAL|DATA|BULAN|OPERATIONAL|SERVICE)/i.test(first)) break;
        // Tabel berakhir di baris tanpa lokasi (baris kosong/penutup). Kolom
        // "No" sengaja TIDAK dipakai sebagai syarat: sering kosong atau salah
        // ketik (mis. "m" alih-alih "24"), dan itu dulu memotong sisa tabel.
        if (!lokasiCell) break;

        const lokasi = lokasiCell;
        if (!lokasi) { k++; continue; }

        let kategori = defaultCategory;
        if (isPerRow) {
          if (hasCatCol) {
            const raw = (r[catIdx] || '').trim().toUpperCase();
            kategori = SUBCATEGORY_MAP[raw] || raw;
          } else {
            kategori = AWOS_II_III;
          }
        }

        // Deteksi jenis (SLA/OLA) dari isi kolom hari pertama yang terisi.
        let jenis: 'sla' | 'ola' | null = null;
        for (let d = dailyStartIdx; d < pctIdx; d++) {
          const v = (r[d] || '').trim().toUpperCase();
          if (v === 'ON' || v === 'OFF') { jenis = 'sla'; break; }
          if (v.endsWith('%') || /^\d+(\.\d+)?$/.test(v)) { jenis = 'ola'; break; }
        }
        if (!jenis) { k++; continue; }

        if (LOCATION_TO_DEVICE_ID[lokasi]) {
          deviceIdByLocation.set(lokasi, LOCATION_TO_DEVICE_ID[lokasi]);
        }

        // Ambil SEMUA nilai harian (hari 1 s.d. jumlah kolom sebelum kolom persentase)
        for (let d = dailyStartIdx; d < pctIdx; d++) {
          const hari = d - dailyStartIdx + 1;
          const raw = (r[d] || '').trim();
          if (!raw) continue; // hari tidak ada di bulan itu (mis. 30 Feb) — lewati
          entries.push({ category: kategori, bulanNama: bulan!, lokasi, hari, jenis, value: raw });
        }

        k++;
      }
      i = k;
    } else {
      i++;
    }
  }

  return { entries, deviceIdByLocation };
}

interface DeviceLite { devicesId: string; site: string; category: string; uptStation: string }

async function main() {
  console.log('🔍 Mengambil semua alat dari database...');
  const allDevices = (await prisma.device.findMany()) as unknown as DeviceLite[];
  const deviceById = new Map<string, DeviceLite>(allDevices.map((d) => [d.devicesId, d]));
  const devicesByName = new Map<string, DeviceLite[]>();
  for (const d of allDevices) {
    const key = normalizeName(d.site);
    if (!devicesByName.has(key)) devicesByName.set(key, []);
    devicesByName.get(key)!.push(d);
  }
  console.log(`✅ ${allDevices.length} alat ditemukan di database.\n`);

  // deviceId|YYYY-MM-DD -> { sla?: boolean, ola?: number }
  const merged = new Map<string, { deviceId: string; date: string; sla?: boolean; ola?: number }>();
  const notFound = new Map<string, Set<string>>();
  const categoryMismatch = new Set<string>();

  for (const { filename, category } of FILES) {
    const csvPath = path.join(__dirname, 'data', filename);
    if (!fs.existsSync(csvPath)) {
      console.log(`⏭️  Lewati "${filename}" (belum ada di scripts/data/).`);
      continue;
    }
    const content = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '');
    const { entries, deviceIdByLocation } = parseDailyEntries(content, category);

    let matchedCount = 0;
    for (const e of entries) {
      const explicitId = deviceIdByLocation.get(e.lokasi);
      let device = explicitId ? deviceById.get(explicitId) : undefined;
      if (!device) {
        const candidates = devicesByName.get(normalizeName(e.lokasi)) || [];
        // Utamakan alat yang kategorinya cocok (nama yang sama bisa dipakai
        // beberapa alat di satu stasiun, mis. "Stamet Biak" = AWOS, Radar, Lightning).
        const sameCategory = candidates.filter((d) => categoryMatches(d.category, e.category));
        if (sameCategory.length >= 1) {
          device = sameCategory[0];
        } else if (candidates.length === 1) {
          // Nama unik, hanya teks kategori yang beda -> aman dipakai.
          device = candidates[0];
          categoryMismatch.add(`"${e.category}" vs "${device.category}" — "${e.lokasi}"`);
        }
        // Nama ambigu & tidak ada yang kategorinya cocok -> sengaja TIDAK ditebak
        // (jatuh ke daftar "tidak ditemukan") supaya data tidak masuk ke alat yang salah.
      }

      if (!device) {
        if (!notFound.has(e.category)) notFound.set(e.category, new Set());
        notFound.get(e.category)!.add(e.lokasi);
        continue;
      }

      const monthNum = MONTH_NUMBER[e.bulanNama];
      const dateStr = `${TAHUN}-${String(monthNum).padStart(2, '0')}-${String(e.hari).padStart(2, '0')}`;
      // Lewati tanggal yang tidak valid (mis. 30 Februari) kalau kebetulan lolos.
      const d = new Date(`${dateStr}T00:00:00.000Z`);
      if (isNaN(d.getTime()) || d.getUTCMonth() + 1 !== monthNum) continue;

      const key = `${device.devicesId}|${dateStr}`;
      const entry = merged.get(key) || { deviceId: device.devicesId, date: dateStr };
      if (e.jenis === 'sla') entry.sla = e.value.toUpperCase() === 'ON';
      else entry.ola = parseFloat(e.value.replace('%', '').trim());
      merged.set(key, entry);
      matchedCount++;
    }
    console.log(`📄 ${filename} → ${entries.length} nilai harian dibaca, ${matchedCount} berhasil dicocokkan ke alat.`);
  }

  let complete = 0;
  let incomplete = 0;
  const rowsToInsert: {
    deviceId: string;
    uptStation: string;
    category: string;
    kondisiSla: boolean;
    kondisiOla: number;
    status: string;
    actor: string;
    timestamp: Date;
    reportDate: Date;
    isLate: boolean;
  }[] = [];

  for (const entry of merged.values()) {
    if (entry.sla === undefined || entry.ola === undefined || isNaN(entry.ola)) {
      incomplete++;
      continue;
    }
    const device = deviceById.get(entry.deviceId)!;
    const status = !entry.sla || entry.ola === 0 ? 'MATI' : entry.sla && entry.ola === 100 ? 'NORMAL' : 'GANGGUAN';
    const reportDate = new Date(`${entry.date}T00:00:00.000Z`);
    rowsToInsert.push({
      deviceId: entry.deviceId,
      uptStation: device.uptStation,
      category: device.category,
      kondisiSla: entry.sla,
      kondisiOla: entry.ola,
      status,
      actor: IMPORT_ACTOR,
      timestamp: reportDate,
      reportDate,
      isLate: true,
    });
    complete++;
  }

  console.log(`\n🔗 ${complete} baris harian siap diimpor (SLA+OLA lengkap), ${incomplete} dilewati (tidak lengkap).`);

  console.log(`\n🧹 Menghapus baris hasil import lama (actor="${IMPORT_ACTOR}", tahun ${TAHUN}) supaya aman diulang...`);
  const deleted = await prisma.slaOlaLog.deleteMany({
    where: {
      actor: IMPORT_ACTOR,
      reportDate: { gte: new Date(`${TAHUN}-01-01T00:00:00.000Z`), lt: new Date(`${TAHUN + 1}-01-01T00:00:00.000Z`) },
    },
  });
  console.log(`   ${deleted.count} baris lama dihapus.`);

  console.log(`\n💾 Menyimpan ${rowsToInsert.length} baris baru (batch 1000)...`);
  const BATCH = 1000;
  for (let i = 0; i < rowsToInsert.length; i += BATCH) {
    const batch = rowsToInsert.slice(i, i + BATCH);
    await prisma.slaOlaLog.createMany({ data: batch });
    console.log(`   ✓ ${Math.min(i + BATCH, rowsToInsert.length)}/${rowsToInsert.length}`);
  }

  console.log('\n════════════════════════════════════════════════');
  console.log('📊 RINGKASAN IMPORT DATA HARIAN SLA/OLA');
  console.log('════════════════════════════════════════════════');
  console.log(`✅ Total baris harian tersimpan : ${rowsToInsert.length}`);
  console.log(`⚠️  Tidak lengkap (dilewati)     : ${incomplete}`);

  if (categoryMismatch.size > 0) {
    console.log(`\nℹ️  ${categoryMismatch.size} device tersimpan meski teks kategori di database beda dari skrip (tidak masalah):`);
    categoryMismatch.forEach((w) => console.log(`   - ${w}`));
  }

  if (notFound.size > 0) {
    const total = [...notFound.values()].reduce((a, s) => a + s.size, 0);
    console.log(`\n⚠️  ${total} nama lokasi TIDAK DITEMUKAN di Master Alat:`);
    for (const [kat, locs] of notFound) {
      console.log(`   [${kat}]`);
      locs.forEach((l) => console.log(`      - "${l}"`));
    }
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