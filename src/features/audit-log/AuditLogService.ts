import { apiClient } from '../../shared/api';
import { ChangeLog } from '../../shared/types';

export const AuditLogService = {
  getAll: (): ChangeLog[] => apiClient.auditLogs.getAll(),
  clearAll: async (actor = 'Admin') => apiClient.auditLogs.clear(actor),
};
