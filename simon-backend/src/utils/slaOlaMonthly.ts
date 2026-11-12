/**
 * Resolusi nilai SLA/OLA BULANAN per alat dari tabel sla_ola_logs.
 *
 * Aturan:
 *  1. Nilai bulanan = rata-rata dari isian harian (log) pada bulan itu. Kalau alat
 *     diisi lebih dari sekali pada tanggal laporan yang sama, hanya isian TERAKHIR
 *     di tanggal itu yang dihitung (satu nilai per hari).
 *  2. Tidak ada lagi "input admin" yang diprioritaskan. Admin tidak mengisi SLA/OLA;
 *     admin hanya mengoreksi/menghapus log lewat Database Master. Semua log diperlakukan
 *     sama, siapa pun `actor`-nya.
 *  3. Kalau tidak ada log sama sekali di bulan itu, alat tidak punya nilai
 *     (bukan 0) — pemanggil yang memutuskan cara menghitungnya.
 *
 * Pengelompokan bulan memakai `reportDate` (tanggal kondisi yang dilaporkan),
 * bukan `timestamp` (waktu submit), supaya pengisian susulan masuk bulan yang
 * benar. Pemanggil bertanggung jawab memfilter log ke SATU tahun.
 */

export interface MonthlyLogInput {
  id: string;
  deviceId: string | null;
  kondisiSla: boolean;
  kondisiOla: number;
  /** Kolom @db.Date -> Date pada 00:00 UTC. */
  reportDate: Date;
  timestamp: Date;
}

export interface MonthlyScore {
  sla: number;
  ola: number;
  /** Jumlah hari yang punya isian (satu nilai per tanggal laporan). */
  jumlahLog: number;
}

/** deviceId -> nomor bulan (1-12) -> nilai bulanan. */
export type MonthlyScoreMap = Record<string, Record<number, MonthlyScore>>;

const round2 = (n: number) => Math.round(n * 100) / 100;

function isNewer(a: MonthlyLogInput, b: MonthlyLogInput): boolean {
  const byReport = a.reportDate.getTime() - b.reportDate.getTime();
  if (byReport !== 0) return byReport > 0;
  const byTime = a.timestamp.getTime() - b.timestamp.getTime();
  if (byTime !== 0) return byTime > 0;
  // id jadi pemutus seri supaya hasilnya selalu deterministik.
  return a.id > b.id;
}

export function resolveMonthlyScores(logs: MonthlyLogInput[]): MonthlyScoreMap {
  // deviceId|bulan -> (tanggal laporan -> isian terakhir pada tanggal itu)
  const buckets = new Map<string, Map<string, MonthlyLogInput>>();

  for (const log of logs) {
    if (!log.deviceId) continue;
    const month = log.reportDate.getUTCMonth() + 1;
    const key = `${log.deviceId}|${month}`;
    let perDay = buckets.get(key);
    if (!perDay) {
      perDay = new Map();
      buckets.set(key, perDay);
    }
    const day = log.reportDate.toISOString().slice(0, 10);
    const existing = perDay.get(day);
    if (!existing || isNewer(log, existing)) perDay.set(day, log);
  }

  const result: MonthlyScoreMap = {};

  for (const [key, perDay] of buckets) {
    const [deviceId, monthStr] = key.split('|');
    const month = Number(monthStr);
    const days = Array.from(perDay.values());
    if (days.length === 0) continue;

    const totalSla = days.reduce((sum, l) => sum + (l.kondisiSla ? 100 : 0), 0);
    const totalOla = days.reduce((sum, l) => sum + l.kondisiOla, 0);

    if (!result[deviceId]) result[deviceId] = {};
    result[deviceId][month] = {
      sla: round2(totalSla / days.length),
      ola: round2(totalOla / days.length),
      jumlahLog: days.length,
    };
  }

  return result;
}

/** Satu baris hasil groupBy(deviceId) pada tabel sla_ola_logs. */
export interface LatestReportRow {
  deviceId: string | null;
  _max: { reportDate: Date | null };
}

/**
 * Tanggal pengisian SLA/OLA TERAKHIR per alat, dari tabel sla_ola_logs (sumber kebenaran).
 *
 *  - Yang dipakai `reportDate` (tanggal laporan) TERBARU — sama dengan arti `lastReportedDate`
 *    di aplikasi (pengisian susulan untuk tanggal lama tidak memundurkan tanggal terakhir).
 *  - Alat tanpa log pengisian tidak ada di hasil (pemanggil menampilkannya sebagai "belum lapor").
 */
export function pickLatestReportDates(rows: ReadonlyArray<LatestReportRow>): Map<string, Date> {
  const latest = new Map<string, Date>();
  for (const row of rows) {
    if (!row.deviceId || !row._max.reportDate) continue;
    const current = latest.get(row.deviceId);
    if (!current || row._max.reportDate.getTime() > current.getTime()) {
      latest.set(row.deviceId, row._max.reportDate);
    }
  }
  return latest;
}

export type ConditionStatus = 'NORMAL' | 'GANGGUAN' | 'MATI';

/**
 * Kondisi dari nilai SLA & OLA (0–100). SAMA PERSIS dengan `classifyScore` di halaman
 * SLA & OLA (SlaOlaView.tsx) dan rumus status di saveSlaOla / skrip import:
 *  - SLA atau OLA 0  -> MATI
 *  - keduanya 100    -> NORMAL
 *  - selainnya       -> GANGGUAN
 */
export function classifyCondition(sla: number, ola: number): ConditionStatus {
  if (sla <= 0 || ola <= 0) return 'MATI';
  if (sla >= 100 && ola >= 100) return 'NORMAL';
  return 'GANGGUAN';
}

/** Satu log pengisian harian (kolom yang dibutuhkan untuk menentukan kondisi terakhir). */
export interface LatestConditionLog {
  id: string;
  deviceId: string | null;
  kondisiSla: boolean;
  kondisiOla: number;
  reportDate: Date;
  timestamp: Date;
}

/**
 * Kondisi TERAKHIR tiap alat = kondisi dari log pengisian harian terbaru alat itu.
 *
 *  - "Terbaru" = reportDate terbesar; bila sama, timestamp (waktu submit) terbesar; bila masih
 *    sama, id terbesar — hasilnya selalu pasti (tidak bergantung urutan data).
 *  - Alat tanpa log pengisian tidak ada di hasil; pemanggil memakai kondisi tersimpannya.
 */
export function pickLatestConditions(logs: ReadonlyArray<LatestConditionLog>): Map<string, ConditionStatus> {
  const newest = new Map<string, LatestConditionLog>();
  for (const log of logs) {
    if (!log.deviceId) continue;
    const cur = newest.get(log.deviceId);
    if (!cur || isNewerLog(log, cur)) newest.set(log.deviceId, log);
  }
  const result = new Map<string, ConditionStatus>();
  for (const [deviceId, log] of newest) {
    result.set(deviceId, classifyCondition(log.kondisiSla ? 100 : 0, log.kondisiOla));
  }
  return result;
}

function isNewerLog(a: LatestConditionLog, b: LatestConditionLog): boolean {
  const byDate = a.reportDate.getTime() - b.reportDate.getTime();
  if (byDate !== 0) return byDate > 0;
  const byTime = a.timestamp.getTime() - b.timestamp.getTime();
  if (byTime !== 0) return byTime > 0;
  return a.id > b.id;
}