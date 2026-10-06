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

/**
 * Tanggal penanda untuk alat "Tidak Dikalibrasi" (mis. sirene). Kolom
 * lastCalibrated/calibrationValidUntil di tabel devices bisa masih NOT NULL di
 * database, jadi alat yang tidak dikalibrasi disimpan dengan tanggal penanda ini
 * dan diubah kembali menjadi null saat dikirim ke frontend (lihat serializeDeviceDates).
 */
export const NOT_CALIBRATED_DATE = '1970-01-01';

/** Date dari Prisma -> string "YYYY-MM-DD" untuk response API. */
export function formatDateOnly(value: Date | null | undefined): string | null {
  if (!value || isNaN(value.getTime())) return null;
  return value.toISOString().slice(0, 10);
}

/**
 * Tanggal "hari ini" (YYYY-MM-DD) menurut zona waktu BBMKG V, Asia/Jayapura
 * (WIT, UTC+9). Dipakai sebagai patokan validasi pengisian SLA/OLA susulan
 * (backdate) supaya konsisten dengan jam operasional UPT, bukan UTC server.
 */
export function getTodayDateOnlyWIT(): string {
  // en-CA locale menghasilkan format YYYY-MM-DD secara native.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' });
}

/** Selisih hari (bulat) antara dua string "YYYY-MM-DD". Positif jika `to` < `from`. */
export function diffDaysDateOnly(from: string, to: string): number {
  const fromDate = parseDateOnly(from);
  const toDate = parseDateOnly(to);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((fromDate.getTime() - toDate.getTime()) / msPerDay);
}

/**
 * Ubah objek Device dari Prisma (lastCalibrated/calibrationValidUntil/lastReportedDate
 * sebagai Date) balik ke bentuk string "YYYY-MM-DD" untuk response API, supaya
 * frontend yang mengonsumsi field ini sebagai string tidak perlu berubah.
 */
function formatCalibrationDate(value: Date | null | undefined): string | null {
  const formatted = formatDateOnly(value);
  return formatted === NOT_CALIBRATED_DATE ? null : formatted;
}

export function serializeDeviceDates<T extends { lastCalibrated: Date | null; calibrationValidUntil: Date | null; lastReportedDate: Date | null }>(
  device: T
) {
  return {
    ...device,
    lastCalibrated: formatCalibrationDate(device.lastCalibrated),
    calibrationValidUntil: formatCalibrationDate(device.calibrationValidUntil),
    lastReportedDate: formatDateOnly(device.lastReportedDate),
  };
}