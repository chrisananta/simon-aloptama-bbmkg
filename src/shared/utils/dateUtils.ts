export function formatDateIndo(dateStr?: string): string {
  if (!dateStr) return 'Belum Diisi';
  try {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    if (dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-');
      const monthIdx = parseInt(month, 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${parseInt(day, 10)} ${months[monthIdx]} ${year}`;
      }
    }
  } catch (e) {
    // Fallback if parsing fails
  }
  return dateStr;
}

export function getWitTimeString(): string {
  return new Date().toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jayapura',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + ' WIT';
}

/**
 * Tanggal "hari ini" (YYYY-MM-DD) menurut zona waktu BBMKG V, Asia/Jayapura
 * (WIT). Dipakai sebagai patokan default & batas maksimal/minimal pada field
 * tanggal pengisian SLA/OLA (termasuk pengisian susulan/backdate), supaya
 * konsisten dengan validasi yang sama di backend.
 */
export function getTodayIsoWIT(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' });
}

/** Tanggal ISO (YYYY-MM-DD) mundur `daysBack` hari dari hari ini (WIT). */
export function getIsoDaysAgoWIT(daysBack: number): string {
  const todayWitStr = getTodayIsoWIT();
  const d = new Date(`${todayWitStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - daysBack);
  return d.toISOString().slice(0, 10);
}
