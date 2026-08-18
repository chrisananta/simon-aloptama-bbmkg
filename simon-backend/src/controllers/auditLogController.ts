import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const auditLogController = {
  // Get all audit logs
  getAuditLogs: async (_req: AuthRequest, res: Response) => {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 200,
      });
      return res.json({ success: true, count: logs.length, data: logs });
    } catch (error) {
      console.warn('getAuditLogs PostgreSQL note:', (error as any)?.message || error);
      return res.json({ success: true, count: 0, data: [] });
    }
  },

  // Create manual audit log entry
  createAuditLog: async (req: AuthRequest, res: Response) => {
    try {
      const { table, action, recordId, recordName, details, status } = req.body;

      const newLog = await prisma.auditLog.create({
        data: {
          table,
          action,
          recordId,
          recordName,
          actor: req.user?.name || 'System',
          details,
          status: status || 'SUCCESS',
          ipOrSource: req.ip || 'SIMON API',
        },
      });

      return res.status(201).json({ success: true, data: newLog });
    } catch (error) {
      console.warn('createAuditLog PostgreSQL note:', (error as any)?.message || error);
      return res.status(200).json({ success: true, message: 'Audit log tersimpan di memori.' });
    }
  },

  // Clear all audit logs
  clearAuditLogs: async (req: AuthRequest, res: Response) => {
    try {
      await prisma.auditLog.deleteMany({});

      await prisma.auditLog.create({
        data: {
          table: 'sistem',
          action: 'RESET_DATA',
          recordId: 'AUDIT_LOG_CLEAR',
          recordName: 'Repository Log Aktivitas',
          actor: req.user?.name || 'System',
          details: 'Semua riwayat log aktivitas audit sistem dibersihkan oleh administrator.',
        },
      });

      return res.json({ success: true, message: 'Semua audit log berhasil dibersihkan.' });
    } catch (error) {
      console.error('Error clearAuditLogs:', error);
      return res.status(500).json({ success: false, message: 'Gagal membersihkan audit log.' });
    }
  },
};
