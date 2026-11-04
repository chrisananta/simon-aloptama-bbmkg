import type { AloptamaDevice } from '../types';

/** Nilai PIC Kalibrasi untuk alat yang memang tidak dikalibrasi (mis. sirene). */
export const PIC_TIDAK_DIKALIBRASI = 'Tidak Dikalibrasi';

/** Nilai PIC Kalibrasi untuk alat yang dikalibrasi oleh pihak ketiga (rekanan/vendor). */
export const PIC_REKANAN = 'Rekanan';

/** Nama instansi/tim kalibrasi (timkalibrasi) default untuk tiap pilihan PIC Kalibrasi. */
export function agencyNameForPic(pic?: string | null): string {
  const p = (pic || '').trim().toLowerCase();
  if (p === 'pusat') return 'BMKG Pusat';
  if (p === PIC_REKANAN.toLowerCase()) return 'Rekanan';
  return 'Balai Besar MKG Wilayah V';
}

/** Turunkan pilihan PIC (Balai/Pusat/Rekanan) dari nama instansi kalibrasi. */
export function picFromAgency(agency?: string | null): 'Balai' | 'Pusat' | 'Rekanan' {
  const a = (agency || '').toLowerCase();
  if (a.includes('pusat')) return 'Pusat';
  if (a.includes('rekanan')) return 'Rekanan';
  return 'Balai';
}

/** True jika alat ditandai tidak dikalibrasi (PIC atau status). */
export function isNotCalibrated(
  device: Partial<Pick<AloptamaDevice, 'picKalibrasi' | 'calibrationStatus'>>
): boolean {
  const pic = (device.picKalibrasi || '').trim().toLowerCase();
  return pic === PIC_TIDAK_DIKALIBRASI.toLowerCase() || device.calibrationStatus === 'TIDAK_DIKALIBRASI';
}