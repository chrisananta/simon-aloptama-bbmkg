import { AloptamaDevice, YearlyScoreMap, MonthlyDeviceScore } from '../types';

// Kategori resmi sesuai field `category` di database (lihat dropdown di
// AdminMasterView.tsx). Pencocokan exact-match (bukan substring) supaya
// "AWOS Kat.I", "AWOS Kat.II", dan "AWOS Kat.III" tidak pernah saling tertukar.
export const normalizeCategory = (s: string) => (s || '').toLowerCase().replace(/[.\s]/g, '');

export const CATEGORY_DEFS = [
  { no: 1, key: 'AWOS Kat.I', tableName: 'AWOS KAT. I', chartName: 'AWOS Kat I' },
  { no: 2, key: 'AWOS Kat.II', tableName: 'AWOS KAT II', chartName: 'AWOS Kat II' },
  { no: 3, key: 'AWOS Kat.III', tableName: 'AWOS KAT III', chartName: 'AWOS Kat III' },
  { no: 4, key: 'Radar Cuaca', tableName: 'RADAR CUACA', chartName: 'Radar Cuaca' },
  { no: 5, key: 'AWS', tableName: 'AWS', chartName: 'AWS' },
  { no: 6, key: 'ARG', tableName: 'ARG', chartName: 'ARG' },
  { no: 7, key: 'Seismometer', tableName: 'SEISMOMETER', chartName: 'Seismometer' },
  { no: 8, key: 'Lightning Detector', tableName: 'LIGHTNING DETECTOR', chartName: 'Lightning' },
  { no: 9, key: 'Accelerograph', tableName: 'ACCELEROGRAPH NC', chartName: 'Accelerograph' },
  { no: 10, key: 'WRS NG', tableName: 'WRS NEW GENERATION', chartName: 'WRS NG' },
  { no: 11, key: 'Sirene', tableName: 'SIRENE', chartName: 'Sirene' },
];

export const isInCategory = (d: AloptamaDevice, categoryKey: string) =>
  normalizeCategory(d.category) === normalizeCategory(categoryKey);

// Nilai bulanan satu alat dari data setahun (undefined = belum ada log bulan itu).
export const pickScore = (
  scores: YearlyScoreMap,
  deviceId: string,
  monthNum: number
): MonthlyDeviceScore | undefined => scores[deviceId]?.[String(monthNum)];


/**
 * Persentase SLA/OLA per JENIS alat untuk satu bulan (dibulatkan 1 desimal, sama dengan tabel rekap).
 * Alat yang belum punya nilai di bulan itu tetap ada di pembagi (jumlah lokasi) sebagai 0%.
 * Dipakai bersama oleh tabel, kartu bulanan, dan grafik tren supaya angkanya selalu sama.
 */
export const categoryPercentsForMonth = (
  devices: AloptamaDevice[],
  yearlyScores: Parameters<typeof pickScore>[0],
  monthNum: number
) => {
  return CATEGORY_DEFS.map((cat) => {
    const catDevs = devices.filter((d) => isInCategory(d, cat.key));
    const jumlahLokasi = catDevs.length;
    let totalSla = 0;
    let totalOla = 0;
    let withData = 0;
    for (const d of catDevs) {
      const sc = pickScore(yearlyScores, d.devicesId, monthNum);
      if (!sc) continue;
      withData += 1;
      totalSla += sc.sla;
      totalOla += sc.ola;
    }
    return {
      jumlahLokasi,
      withData,
      sla: jumlahLokasi > 0 ? Number((totalSla / jumlahLokasi).toFixed(1)) : 0,
      ola: jumlahLokasi > 0 ? Number((totalOla / jumlahLokasi).toFixed(1)) : 0,
    };
  });
};