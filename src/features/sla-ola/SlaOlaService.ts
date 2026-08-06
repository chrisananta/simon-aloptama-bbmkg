import { apiClient } from '../../shared/api';

export const SlaOlaService = {
  saveSlaOla: async (data: {
    uptStation: string;
    category: string;
    deviceId: string;
    kondisiSla: boolean;
    kondisiOla: number;
    kendala: string;
    actor?: string;
  }) => {
    return await apiClient.devices.saveSlaOla({
      ...data,
      actor: data.actor || 'Operator UPT SIMON',
    });
  }
};
