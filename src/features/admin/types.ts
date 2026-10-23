// Tipe bersama untuk fitur "Monitoring Pengisian SLA/OLA" (tabel per-entri log).
// Dipakai oleh AdminMasterView.tsx, MonitoringSlaOlaTab.tsx, EditSlaOlaLogModal.tsx,
// dan DeleteSlaOlaLogModal.tsx — didefinisikan sekali di sini supaya bentuknya
// selalu konsisten di semua tempat (hindari duplikasi interface yang bisa
// diam-diam berbeda field-nya).
export interface SlaOlaLogRow {
  id: string;
  deviceId: string | null;
  kodeAlat: string;
  namaAlat: string;
  uptStation: string;
  category: string;
  kondisiSla: boolean;
  kondisiOla: number;
  status: string;
  actor: string;
  reportDate: string | null;
  timestamp: string;
  isLate: boolean;
}
