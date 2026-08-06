import { AloptamaDevice } from '../../shared/types';

export interface DashboardPageProps {
  devices: AloptamaDevice[];
  lastUpdate?: string;
}

export interface DashboardSummaryStats {
  totalCount: number;
  normalCount: number;
  gangguanCount: number;
  matiCount: number;
}
