import { apiClient } from '../../shared/api';
import { CalibrationRecord } from './CalibrationTypes';

export const CalibrationService = {
  getAll: (): CalibrationRecord[] => {
    return apiClient.calibration.getAll();
  },
  add: async (record: Omit<CalibrationRecord, 'id' | 'createdAt'>, actor = 'Tim INSKAL BBMKG V') => {
    return await apiClient.calibration.add(record, actor);
  }
};
