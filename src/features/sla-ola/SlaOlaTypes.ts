import { AloptamaDevice } from '../../shared/types';

export interface SlaOlaModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: AloptamaDevice[];
  onSaveSlaOla: (data: {
    stationId: string;
    category: string;
    deviceId: string;
    kondisiSla: boolean;
    kondisiOla: number;
    kendala: string;
    tanggal: string;
  }) => void;
}