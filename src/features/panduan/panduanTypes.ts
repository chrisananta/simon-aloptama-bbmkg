// Tipe data Panduan Pemeliharaan Peralatan (sumber: Perka BMKG No. 7 Tahun 2014, Lampiran I).

export interface PanduanNode {
  text: string;
  children?: PanduanNode[];
}

export interface PanduanTab {
  id: string;
  label: string;
  kind: 'berkala' | 'perbaikan';
  /** Perkiraan waktu pelaksanaan, mis. "1 (satu) jam". */
  durasi?: string;
  /** Kalimat "catat seluruh aktivitas di log book" dari aturan. */
  catatan?: string;
  /** Daftar peralatan yang disiapkan untuk tab ini. */
  persiapan?: PanduanNode[];
  /** Dipakai bila label jadwal di daftar persiapan tidak cocok dengan jadwal pemeliharaan di aturan. */
  persiapanGrup?: { label: string; items: PanduanNode[] }[];
  persiapanCatatan?: string;
  /** Jenis kerusakan dan tindakannya (khusus tab Perbaikan). */
  kerusakan?: PanduanNode[];
  langkah: PanduanNode[];
}

export interface PanduanKetentuan {
  judul: string;
  isi: PanduanNode[];
}

export type PanduanSimonKategori =
  | 'AWOS'
  | 'AWS'
  | 'ARG'
  | 'Radar Cuaca'
  | 'Seismometer'
  | 'Accelerograph'
  | 'Lightning Detector';

export interface PanduanAlat {
  id: string;
  nama: string;
  kelompokAlat: 'Meteorologi' | 'Klimatologi' | 'Kualitas Udara' | 'Geofisika';
  kelompokKode: 'A' | 'B' | 'C' | 'D';
  jenis: string;
  caraKerja: string;
  hlmMulai: number;
  hlmSelesai: number;
  /** Kategori alat di SIMON yang sesuai dengan alat ini (null = tidak ada padanannya di SIMON). */
  simon: PanduanSimonKategori | null;
  /** Batas waktu perbaikan, mis. "3 × 24 jam". */
  batasPerbaikan: string | null;
  /** Ringkasan jadwal pemeliharaan berkala (Bagian VII aturan). */
  jadwalRingkas: string[];
  /** Penggantian komponen secara berkala (Bagian VI). */
  gantiKomponen: PanduanNode[];
  /** Komponen alat (Bagian IV). */
  komponen: PanduanNode[];
  /** Bagian XI–XV: modifikasi, peralatan cadangan, suku cadang, keamanan, lingkungan. */
  ketentuanLain: PanduanKetentuan[];
  tabs: PanduanTab[];
  catatanSumber?: string;
}
