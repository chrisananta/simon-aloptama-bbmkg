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
  devicesId: string;       // Sebelumnya: id
  site: string;            // Sebelumnya: name
  category: EquipmentCategory;
  merk?: string;           // Sebelumnya: subCategory
  uptStation: string;
  locationName: string;
  latitude: number;
  longitude: number;
  picKalibrasi?: string; 
  conditionStatus: EquipmentStatus;
  calibrationStatus: CalibrationStatus;
  lastCalibrated: string;
  lastReportedDate?: string;
  calibrationValidUntil: string;
  timkalibrasi: string;    // Sebelumnya: calibrationAgency
  downtimeDuration?: string;
  issueDescription?: string;
  slaScore?: number;
  olaScore?: number;
}
export interface UPTStation {
  id: string;
  stationid: string;       // Sebelumnya: code
  name: string;
  regionGroup: string;
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
