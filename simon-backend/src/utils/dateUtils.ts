/**
 * Helper konversi tanggal antara format Postgres DATE (Date object di Prisma)
 * dan string "YYYY-MM-DD" yang dipakai kontrak API (supaya frontend, yang
 * memakai <input type="date"> dan format string ini di puluhan tempat, tidak
 * perlu berubah sama sekali setelah kolom database dinormalisasi ke DATE asli).
 */

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * String "YYYY-MM-DD" dari client -> Date untuk disimpan Prisma (kolom @db.Date).
 * Melempar error kalau format tidak sesuai (idealnya sudah divalidasi Zod
 * duluan di controller, ini lapis kedua supaya tidak ada tanggal "ajaib").
 */
export function parseDateOnly(value: string): Date {
  if (!DATE_ONLY_REGEX.test(value)) {
    throw new Error(`Format tanggal tidak valid: "${value}". Wajib "YYYY-MM-DD".`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Tanggal tidak valid: "${value}".`);
  }
  return date;
}

/** Sama seperti parseDateOnly, tapi mengembalikan null untuk input kosong/undefined. */
export function parseDateOnlyOptional(value: string | null | undefined): Date | null {
  if (!value) return null;
  return parseDateOnly(value);
}

/** Date dari Prisma -> string "YYYY-MM-DD" untuk response API. */
export function formatDateOnly(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

/**
 * Ubah objek Device dari Prisma (lastCalibrated/calibrationValidUntil/lastReportedDate
 * sebagai Date) balik ke bentuk string "YYYY-MM-DD" untuk response API, supaya
 * frontend yang mengonsumsi field ini sebagai string tidak perlu berubah.
 */
export function serializeDeviceDates<T extends { lastCalibrated: Date; calibrationValidUntil: Date; lastReportedDate: Date | null }>(
  device: T
) {
  return {
    ...device,
    lastCalibrated: formatDateOnly(device.lastCalibrated),
    calibrationValidUntil: formatDateOnly(device.calibrationValidUntil),
    lastReportedDate: formatDateOnly(device.lastReportedDate),
  };
}
