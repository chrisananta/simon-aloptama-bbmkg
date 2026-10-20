/**
 * Util tanggal untuk nilai bawaan form laporan (tanpa tanggal "hardcode").
 * Semua perhitungan memakai komponen tanggal LOKAL (bukan toISOString/UTC) supaya
 * tidak bergeser sehari di zona waktu Indonesia.
 */
const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Date -> "YYYY-MM-DD" berdasarkan tanggal lokal. */
export function toIsoDateLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** "YYYY-MM-DD" -> "15 Juni 2026". Input tidak valid dikembalikan apa adanya. */
export function formatIsoDateId(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  const month = MONTHS_ID[Number(m[2]) - 1];
  if (!month) return iso;
  return `${Number(m[3])} ${month} ${m[1]}`;
}

/**
 * Minggu kerja (Senin–Jumat) TERAKHIR yang sudah selesai.
 * Jumat dihitung selesai hanya setelah hari Jumat berlalu, jadi:
 *  - Sabtu/Minggu  -> Senin–Jumat minggu yang baru lewat (Jumat kemarin / 2 hari lalu)
 *  - Senin–Jumat   -> Senin–Jumat minggu sebelumnya
 */
export function getLastWorkWeek(today: Date = new Date()): { startIso: string; endIso: string } {
  const y = today.getFullYear();
  const mo = today.getMonth();
  const d = today.getDate();
  // Hari sejak Jumat terakhir; jika hari ini Jumat -> 7 (Jumat pekan lalu).
  const daysSinceFriday = ((today.getDay() - 5 + 7) % 7) || 7;
  const friday = new Date(y, mo, d - daysSinceFriday);
  const monday = new Date(friday.getFullYear(), friday.getMonth(), friday.getDate() - 4);
  return { startIso: toIsoDateLocal(monday), endIso: toIsoDateLocal(friday) };
}