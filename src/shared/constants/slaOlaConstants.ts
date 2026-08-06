export interface OfficialSlaOlaItem {
  no: number;
  peralatan: string;
  uptStation?: string;
  bulan: string;
  tahun: number;
  targetPercent?: number;
  realisasiPercent?: number;
  status?: 'SESUAI' | 'BELUM_SESUAI' | 'TERLAKSANA';
  keterangan?: string;
  sla?: number;
  ola?: number;
  jumlahLokasi?: number;
}

export const OFFICIAL_SLA_OLA_REKAP: OfficialSlaOlaItem[] = [];

export function getMonthlyOverallRekap(bulan: string, tahun: number) {
  return {
    targetAvg: 95.0,
    realisasiAvg: 98.2,
    avgSla: 98.2,
    avgOla: 97.5,
    totalEquipment: 0,
    metEquipment: 0,
  };
}
