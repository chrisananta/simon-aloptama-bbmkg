import { AloptamaDevice, CalibrationRecord, UPTStation } from '../../shared/types';

export type { CalibrationRecord };

export interface CalibrationPageProps {
  devices: AloptamaDevice[];
  calibrationLogs: CalibrationRecord[];
  onOpenAddCalibrationModal: () => void;
}

export interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: AloptamaDevice[];
  /** Daftar stasiun untuk dropdown Nama Stasiun UPT. */
  stations?: UPTStation[];
  onAddCalibrationRecord: (record: Omit<CalibrationRecord, 'id' | 'createdAt'> & { yearCreated?: string }) => void | Promise<void>;
}