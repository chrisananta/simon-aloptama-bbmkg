/**
 * Rumus "TOTAL PERSENTASE" SLA & OLA (tabel rekap, kartu bulanan, grafik tren, laporan).
 *
 * Total = jumlah persentase tiap JENIS alat dibagi banyaknya jenis alat (rata-rata sederhana).
 * Contoh 11 jenis alat: (91,7 + 100 + 75 + ... + 100) / 11.
 *
 */
export interface CategoryPercent {
  jumlahLokasi: number;
  /** Persentase jenis alat (sudah dibulatkan 1 desimal seperti yang tampil di tabel). */
  value: number;
}

export function averageOfCategories(rows: ReadonlyArray<CategoryPercent>): number {
  const counted = rows.filter((r) => r.jumlahLokasi > 0);
  if (counted.length === 0) return 0;
  const sum = counted.reduce((acc, r) => acc + r.value, 0);
  return Number((sum / counted.length).toFixed(1));
}