/**
 * Resolusi nilai SLA/OLA BULANAN per alat dari tabel sla_ola_logs.
 *
 * Aturan (sesuai keputusan pemilik sistem):
 *  1. Kalau untuk alat + bulan itu ada log yang `actor`-nya Admin
 *     (Super Admin / Admin Inskal), nilai admin itulah yang dipakai. Input admin
 *     dianggap sudah merupakan nilai rata-rata bulan tersebut untuk alat itu.
 *  2. Kalau tidak ada log admin, nilai bulanan = rata-rata dari log pengisian
 *     UPT. Kalau alat diisi lebih dari sekali pada tanggal laporan yang sama,
 *     hanya isian TERAKHIR di tanggal itu yang dihitung (satu nilai per hari).
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
  actor: string;
  /** Kolom @db.Date -> Date pada 00:00 UTC. */
  reportDate: Date;
  timestamp: Date;
}

export interface MonthlyScore {
  sla: number;
  ola: number;
  source: 'ADMIN' | 'UPT';
  /** Jumlah log yang dipakai: 1+ untuk admin (jika ada duplikat), jumlah hari untuk UPT. */
  jumlahLog: number;
}

/** deviceId -> nomor bulan (1-12) -> nilai bulanan. */
export type MonthlyScoreMap = Record<string, Record<number, MonthlyScore>>;

/**
 * Nama aktor cadangan yang selalu dianggap Admin, kalau akunnya sudah
 * dihapus/diganti namanya sehingga tidak ketemu lagi di tabel users.
 */
export const ADMIN_ACTOR_FALLBACK = ['super admin', 'admin inskal', 'chrisananta'];

export function normalizeActor(actor: string | null | undefined): string {
  return (actor || '').trim().toLowerCase();
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function isNewer(a: MonthlyLogInput, b: MonthlyLogInput): boolean {
  const byReport = a.reportDate.getTime() - b.reportDate.getTime();
  if (byReport !== 0) return byReport > 0;
  const byTime = a.timestamp.getTime() - b.timestamp.getTime();
  if (byTime !== 0) return byTime > 0;
  // Log rekap bulanan admin punya timestamp yang sama persis; id jadi
  // pemutus seri supaya hasilnya selalu deterministik.
  return a.id > b.id;
}

export function resolveMonthlyScores(
  logs: MonthlyLogInput[],
  adminActors: Set<string>
): MonthlyScoreMap {
  const buckets = new Map<string, { admin: MonthlyLogInput[]; upt: MonthlyLogInput[] }>();

  for (const log of logs) {
    if (!log.deviceId) continue;
    const month = log.reportDate.getUTCMonth() + 1;
    const key = `${log.deviceId}|${month}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { admin: [], upt: [] };
      buckets.set(key, bucket);
    }
    if (adminActors.has(normalizeActor(log.actor))) bucket.admin.push(log);
    else bucket.upt.push(log);
  }

  const result: MonthlyScoreMap = {};

  for (const [key, bucket] of buckets) {
    const [deviceId, monthStr] = key.split('|');
    const month = Number(monthStr);
    let score: MonthlyScore | null = null;

    if (bucket.admin.length > 0) {
      const chosen = bucket.admin.reduce((best, cur) => (isNewer(cur, best) ? cur : best));
      score = {
        sla: chosen.kondisiSla ? 100 : 0,
        ola: round2(chosen.kondisiOla),
        source: 'ADMIN',
        jumlahLog: bucket.admin.length,
      };
    } else if (bucket.upt.length > 0) {
      const perDay = new Map<string, MonthlyLogInput>();
      for (const log of bucket.upt) {
        const day = log.reportDate.toISOString().slice(0, 10);
        const existing = perDay.get(day);
        if (!existing || isNewer(log, existing)) perDay.set(day, log);
      }
      const days = Array.from(perDay.values());
      const totalSla = days.reduce((sum, l) => sum + (l.kondisiSla ? 100 : 0), 0);
      const totalOla = days.reduce((sum, l) => sum + l.kondisiOla, 0);
      score = {
        sla: round2(totalSla / days.length),
        ola: round2(totalOla / days.length),
        source: 'UPT',
        jumlahLog: days.length,
      };
    }

    if (score) {
      if (!result[deviceId]) result[deviceId] = {};
      result[deviceId][month] = score;
    }
  }

  return result;
}