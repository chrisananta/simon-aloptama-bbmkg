import type { AloptamaDevice } from '../types';

/** Nilai PIC Kalibrasi untuk alat yang memang tidak dikalibrasi (mis. sirene). */
export const PIC_TIDAK_DIKALIBRASI = 'Tidak Dikalibrasi';

/** True jika alat ditandai tidak dikalibrasi (PIC atau status). */
export function isNotCalibrated(
  device: Partial<Pick<AloptamaDevice, 'picKalibrasi' | 'calibrationStatus'>>
): boolean {
  const pic = (device.picKalibrasi || '').trim().toLowerCase();
  return pic === PIC_TIDAK_DIKALIBRASI.toLowerCase() || device.calibrationStatus === 'TIDAK_DIKALIBRASI';
}