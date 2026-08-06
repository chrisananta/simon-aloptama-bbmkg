import { ChangeLog } from '../../shared/types';

export interface AuditLogPageProps {
  changeLogs: ChangeLog[];
  onClearLogs?: () => void;
}
