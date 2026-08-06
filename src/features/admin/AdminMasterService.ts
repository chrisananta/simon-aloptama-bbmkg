import { apiClient } from '../../shared/api';
import { UPTStation, AloptamaDevice } from '../../shared/types';

export const AdminMasterService = {
  getStations: (): UPTStation[] => apiClient.stations.getAll(),
  getDevices: (): AloptamaDevice[] => apiClient.devices.getAll(),
  getChangeLogs: () => apiClient.auditLogs.getAll(),
  addStation: async (station: UPTStation, actor = 'Admin INSKAL') => {
    return await apiClient.stations.add(station, actor);
  },
  updateStation: async (station: UPTStation, details: string, actor = 'Admin INSKAL') => {
    return await apiClient.stations.update(station, details, actor);
  },
  deleteStation: async (id: string, name: string, actor = 'Admin INSKAL') => {
    return await apiClient.stations.delete(id, name, actor);
  },
  addDevice: async (device: AloptamaDevice, actor = 'Admin INSKAL') => {
    return await apiClient.devices.add(device, actor);
  },
  updateDevice: async (device: AloptamaDevice, details: string, actor = 'Admin INSKAL') => {
    return await apiClient.devices.update(device, details, actor);
  },
  deleteDevice: async (id: string, name: string, actor = 'Admin INSKAL') => {
    return await apiClient.devices.delete(id, name, actor);
  },
};
