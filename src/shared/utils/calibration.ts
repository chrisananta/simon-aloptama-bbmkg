import type { AloptamaDevice, CalibrationStatus } from '../types';
import { getTodayIsoWIT } from './dateUtils';

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

/**
 * Status kalibrasi OTOMATIS dari masa berlaku sertifikat ("Berlaku Sampai"):
 *  - sudah lewat hari ini                  -> KADALUWARSA
 *  - sisa <= CALIBRATION_WARNING_DAYS hari -> SEGERA_DIKALIBRASI (30 hari sebelum kedaluwarsa)
 *  - selebihnya                            -> VALID
 * Aturan yang sama dengan backend (computeCalibrationStatus di simon-backend/src/utils/dateUtils.ts).
 */
export const CALIBRATION_WARNING_DAYS = 30;

/** Mengembalikan null kalau tanggal kosong/tidak valid. */
export function computeCalibrationStatus(
  validUntil?: string | null,
  today: string = getTodayIsoWIT()
): Exclude<CalibrationStatus, 'TIDAK_DIKALIBRASI'> | null {
  if (!validUntil || !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  const until = Date.parse(`${validUntil}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(until) || Number.isNaN(now)) return null;
  const remainingDays = Math.round((until - now) / msPerDay); // positif = masih berlaku
  if (remainingDays < 0) return 'KADALUWARSA';
  if (remainingDays <= CALIBRATION_WARNING_DAYS) return 'SEGERA_DIKALIBRASI';
  return 'VALID';
}

/** Status kalibrasi efektif sebuah alat: "Tidak Dikalibrasi" tetap, selain itu dihitung dari masa berlaku. */
export function resolveCalibrationStatus(
  device: Partial<Pick<AloptamaDevice, 'picKalibrasi' | 'calibrationStatus' | 'calibrationValidUntil'>>
): CalibrationStatus {
  if (isNotCalibrated(device)) return 'TIDAK_DIKALIBRASI';
  return computeCalibrationStatus(device.calibrationValidUntil) ?? device.calibrationStatus ?? 'VALID';
}

/** Salinan alat dengan calibrationStatus yang sudah dihitung otomatis (objek yang sama bila tidak berubah). */
export function withAutoCalibrationStatus<T extends AloptamaDevice>(device: T): T {
  const status = resolveCalibrationStatus(device);
  return status === device.calibrationStatus ? device : { ...device, calibrationStatus: status };
}