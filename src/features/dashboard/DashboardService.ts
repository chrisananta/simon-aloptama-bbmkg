import { apiClient } from '../../shared/api';
import { AloptamaDevice } from '../../shared/types';

export const DashboardService = {
  getDevices: (): AloptamaDevice[] => {
    return apiClient.devices.getAll();
  },
  syncServerData: async (actor = 'Operator Dashboard') => {
    return await apiClient.server.sync(actor);
  }
};
