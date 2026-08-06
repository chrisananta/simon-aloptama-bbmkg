import { AloptamaDevice, CalibrationRecord } from '../../shared/types';

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
  onAddCalibrationRecord: (record: Omit<CalibrationRecord, 'id' | 'createdAt'> & { yearCreated?: string }) => void;
}
