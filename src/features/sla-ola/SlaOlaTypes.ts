import { AloptamaDevice } from '../../shared/types';

export interface SlaOlaPageProps {
  devices: AloptamaDevice[];
}

export interface SlaOlaModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: AloptamaDevice[];
  onSaveSlaOla: (data: {
    uptStation: string;
    category: string;
    deviceId: string;
    kondisiSla: boolean;
    kondisiOla: number;
    kendala: string;
  }) => void;
}
