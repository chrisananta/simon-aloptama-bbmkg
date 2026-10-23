import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { formatDateOnly } from '../utils/dateUtils.js';

export const historyController = {
  getHistoryLogs: async (req: Request, res: Response) => {
    try {
      const { year, type, upt } = req.query;

      const [slaLogs, calRecords] = await Promise.all([
        prisma.slaOlaLog.findMany({ orderBy: { timestamp: 'desc' } }),
        prisma.calibrationRecord.findMany({ orderBy: { createdAt: 'desc' } }),
      ]);

      const formattedSla = slaLogs.map((log) => {
        const yearStr = log.timestamp ? new Date(log.timestamp).getFullYear().toString() : '2026';
        return {
          id: log.id,
          type: 'SLA_OLA' as const,
          year: yearStr,
          timestamp: log.timestamp ? log.timestamp.toISOString() : new Date().toISOString(),
          uptStation: log.uptStation,
          deviceId: log.deviceId || undefined,
          category: log.category,
          details: {
            kondisiSla: log.kondisiSla,
            kondisiOla: log.kondisiOla,
            kendala: log.kendala,
            status: log.status,
            actor: log.actor,
          },
        };
      });

      const formattedCal = calRecords.map((rec) => {
        // lastCalibrated sekarang objek Date (kolom DATE di Postgres), bukan
        // string lagi - ambil tahun langsung dari Date, dan format ulang jadi
        // "YYYY-MM-DD" untuk kontrak API yang tetap sama seperti sebelumnya.
        const yearStr = rec.lastCalibrated ? rec.lastCalibrated.getFullYear().toString() : '2026';
        return {
          id: rec.id,
          type: 'KALIBRASI' as const,
          year: yearStr,
          timestamp: rec.createdAt ? rec.createdAt.toISOString() : new Date().toISOString(),
          uptStation: rec.uptStation,
          deviceId: rec.deviceId,
          deviceName: rec.deviceName,
          category: rec.category,
          details: {
            lastCalibrated: formatDateOnly(rec.lastCalibrated),
            calibrationValidUntil: formatDateOnly(rec.calibrationValidUntil),
            calibrationAgency: rec.calibrationAgency,
            status: rec.calibrationStatus,
            certificateNumber: rec.certificateNumber,
            notes: rec.notes,
          },
        };
      });

      let combined = [...formattedSla, ...formattedCal].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      if (year && typeof year === 'string' && year !== 'ALL') {
        combined = combined.filter((h) => h.year === year);
      }
      if (type && typeof type === 'string' && type !== 'ALL') {
        combined = combined.filter((h) => h.type === type);
      }
      if (upt && typeof upt === 'string' && upt !== 'ALL') {
        combined = combined.filter((h) => h.uptStation.toLowerCase().includes((upt as string).toLowerCase()));
      }

      return res.json({
        status: 'success',
        type: 'HISTORICAL_RECORDS',
        source: 'POSTGRESQL_PRISMA_STORAGE',
        totalRecords: combined.length,
        historyLogs: combined,
      });
    } catch (error) {
      console.warn('getHistoryLogs PostgreSQL note:', (error as any)?.message || error);
      return res.json({
        status: 'success',
        type: 'HISTORICAL_RECORDS',
        source: 'FALLBACK',
        totalRecords: 0,
        historyLogs: [],
      });
    }
  },
};
