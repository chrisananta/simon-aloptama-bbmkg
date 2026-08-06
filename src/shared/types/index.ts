export type EquipmentStatus = 'NORMAL' | 'GANGGUAN' | 'MATI';
export type CalibrationStatus = 'VALID' | 'SEGERA_DIKALIBRASI' | 'KADALUWARSA';

export type EquipmentCategory = 
  | 'AWOS' 
  | 'AWS' 
  | 'ARG' 
  | 'Radar Cuaca' 
  | 'Lightning Detector' 
  | 'Seismometer' 
  | 'Accelerograph' 
  | 'WRS NG'
  | string;

export interface AloptamaDevice {
  id: string;
  name: string;
  category: EquipmentCategory;
  subCategory?: string;
  uptStation: string;
  locationName: string;
  latitude: number;
  longitude: number;
  conditionStatus: EquipmentStatus;
  calibrationStatus: CalibrationStatus;
  lastCalibrated: string;
  lastReportedDate?: string;
  calibrationValidUntil: string;
  calibrationAgency: string;
  downtimeDuration?: string;
  issueDescription?: string;
  slaScore?: number; // percentage e.g. 98.5
  olaScore?: number; // percentage e.g. 96.0
}

export interface UPTStation {
  id: string;
  code: string;
  name: string;
  regionGroup: string; // e.g. Papua, Papua Barat, Papua Tengah, Papua Selatan, Papua Pegunungan
  location: string;
  latitude: number;
  longitude: number;
}

export interface FilterState {
  searchQuery: string;
  selectedUpt: string;
  selectedCategory: string;
  selectedConditionStatus: string;
  selectedCalibrationStatus: string;
  month: string;
  year: string;
}

export type ActiveNavMenu = 'dashboard' | 'sla-ola' | 'kalibrasi' | 'sertifikat' | 'admin-master' | 'audit-log';

export type LogAction = 'TAMBAH' | 'EDIT' | 'HAPUS' | 'SIMPAN_SLA_OLA' | 'SIMPAN_KALIBRASI' | 'SYNC_SERVER' | 'RESET_DATA' | 'EXPORT_DATA' | 'LOGIN' | 'LOGOUT' | 'REFRESH_TOKEN';
export type LogTable = 'master_stasiun' | 'master_alat' | 'master_sla_ola' | 'master_petugas' | 'master_akun' | 'kalibrasi' | 'sistem' | 'pengaturan' | 'autentikasi';

export interface ChangeLog {
  id: string;
  timestamp: string;
  table: LogTable;
  action: LogAction;
  recordId: string;
  recordName: string;
  actor: string;
  details: string;
  status?: 'SUCCESS' | 'WARNING' | 'FAILED';
  ipOrSource?: string;
}

export interface CalibrationRecord {
  id: string;
  deviceId: string;
  deviceName: string;
  uptStation: string;
  category: string;
  lastCalibrated: string;
  calibrationValidUntil: string;
  calibrationAgency: string;
  certificateNumber?: string;
  calibrationStatus: CalibrationStatus;
  notes?: string;
  createdAt: string;
}
