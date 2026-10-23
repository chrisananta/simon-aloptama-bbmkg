import { AloptamaDevice, CalibrationRecord, UPTStation } from '../../shared/types';

export type { CalibrationRecord };

export interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: AloptamaDevice[];
  /** Daftar stasiun, untuk menampilkan nama stasiun dari stationId alat. */
  stations: UPTStation[];
  onAddCalibrationRecord: (record: Omit<CalibrationRecord, 'id' | 'createdAt'> & { yearCreated?: string }) => void;
}