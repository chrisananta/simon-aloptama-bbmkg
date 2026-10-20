import { prisma } from '../db/prisma.js';
import { loadAdminActorSet } from './adminActors.js';
import {
  pickLatestConditions,
  pickLatestReportDates,
  type ConditionStatus,
} from './slaOlaMonthly.js';

/**
 * Data TERAKHIR tiap alat dari tabel sla_ola_logs (sumber kebenaran), dipakai untuk daftar alat:
 *  - reportDates : tanggal pengisian terakhir (tampil sebagai "Updated" di popup peta, laporan WA)
 *  - conditions  : kondisi (NORMAL/GANGGUAN/MATI) dari log pengisian terakhir -> warna peta
 *                  dan hitungan Normal/Gangguan/Mati di Dashboard
 * Alat tanpa log pengisian tidak ada di kedua map (pemanggil memakai nilai tersimpan alat).
 * Aturan lengkap ada di utils/slaOlaMonthly.ts (pickLatestReportDates, pickLatestConditions).
 */
export interface LatestReportSnapshot {
  reportDates: Map<string, Date>;
  conditions: Map<string, ConditionStatus>;
}

export async function loadLatestReportSnapshot(): Promise<LatestReportSnapshot> {
  // Query 1 (agregat kecil): tanggal laporan terbaru per (alat, operator).
  const [rows, adminActors] = await Promise.all([
    prisma.slaOlaLog.groupBy({
      by: ['deviceId', 'actor'],
      where: { deviceId: { not: null } },
      _max: { reportDate: true },
    }),
    loadAdminActorSet(),
  ]);
  const reportDates = pickLatestReportDates(rows, adminActors);
  if (reportDates.size === 0) return { reportDates, conditions: new Map() };

  // Query 2: hanya log pada tanggal-tanggal terakhir tadi (biasanya satu/dua tanggal x ~190 alat).
  const distinctDates = Array.from(new Set(Array.from(reportDates.values()).map((d) => d.getTime()))).map(
    (t) => new Date(t)
  );
  const logs = await prisma.slaOlaLog.findMany({
    where: { deviceId: { not: null }, reportDate: { in: distinctDates } },
    select: {
      id: true,
      deviceId: true,
      kondisiSla: true,
      kondisiOla: true,
      actor: true,
      reportDate: true,
      timestamp: true,
    },
  });
  return { reportDates, conditions: pickLatestConditions(logs, adminActors) };
}