import { UPTStation, AloptamaDevice, ChangeLog } from '../../shared/types';

export interface AdminMasterPageProps {
  stations: UPTStation[];
  devices: AloptamaDevice[];
  changeLogs: ChangeLog[];
  onAddStation: (station: UPTStation, actor: string) => void;
  onUpdateStation: (station: UPTStation, changesDetail: string, actor: string) => void;
  onDeleteStation: (stationId: string, stationName: string, actor: string) => void;
  onAddDevice: (device: AloptamaDevice, actor: string) => void;
  onUpdateDevice: (device: AloptamaDevice, changesDetail: string, actor: string) => void;
  onDeleteDevice: (deviceId: string, deviceName: string, actor: string) => void;
  onClearLogs?: () => void;
}
