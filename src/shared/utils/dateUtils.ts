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
