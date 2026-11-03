import { AloptamaDevice } from '../types';
import { getYesterdayIsoWIT } from './dateUtils';

/**
 * Periode aktif alat. `aktifSejak` = bulan pertama alat dihitung di rekap (alat baru),
 * `aktifSampai` = bulan terakhir alat dihitung (alat dihentikan). Keduanya "YYYY-MM"
 * dan inklusif; null/kosong = tidak dibatasi (alat lama tetap dihitung di semua bulan).
 * Riwayat nilai alat tidak pernah dihapus: bulan di luar periode hanya tidak ikut dihitung.
 */
type ActivePeriod = Pick<AloptamaDevice, 'aktifSejak' | 'aktifSampai'>;

export const monthKey = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, '0')}`;

export const isDeviceActiveInMonth = (d: ActivePeriod, ym: string): boolean => {
  if (d.aktifSejak && ym < d.aktifSejak) return false;
  if (d.aktifSampai && ym > d.aktifSampai) return false;
  return true;
};

/**
 * Alat yang masih perlu dilaporkan sekarang. Pengisian hari ini adalah untuk kondisi
 * KEMARIN, jadi yang dipakai adalah bulan dari tanggal kemarin (WIT): alat yang
 * dihentikan bulan lalu masih bisa dilaporkan untuk tanggal terakhir bulan itu.
 */
export const isDeviceActiveForReporting = (d: ActivePeriod): boolean =>
  isDeviceActiveInMonth(d, getYesterdayIsoWIT().slice(0, 7));

/** Alat yang dihitung pada bulan `month` (1-12) tahun `year`. */
export const devicesActiveInMonth = <T extends ActivePeriod>(
  devices: T[],
  year: number,
  month: number
): T[] => {
  const ym = monthKey(year, month);
  return devices.filter((d) => isDeviceActiveInMonth(d, ym));
};