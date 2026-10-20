import { prisma } from '../db/prisma.js';
import { loadAdminActorSet } from './adminActors.js';
import { pickLatestReportDates } from './slaOlaMonthly.js';

/** Satu query agregat (deviceId x actor) + daftar admin; ringan karena hasilnya kecil. */
export async function loadLatestReportDates(): Promise<Map<string, Date>> {
  const [rows, adminActors] = await Promise.all([
    prisma.slaOlaLog.groupBy({
      by: ['deviceId', 'actor'],
      where: { deviceId: { not: null } },
      _max: { reportDate: true },
    }),
    loadAdminActorSet(),
  ]);
  return pickLatestReportDates(rows, adminActors);
}