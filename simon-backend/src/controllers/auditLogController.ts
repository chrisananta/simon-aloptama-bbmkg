import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

// Nilai-nilai ini harus sinkron dengan enum LogTable & LogAction di schema.prisma.
// Divalidasi di sini supaya request dengan nilai di luar enum langsung ditolak 400
// dengan pesan jelas, bukan gagal diam-diam di Prisma lalu direspons "sukses" ke client.
const createAuditLogInput = z.object({
  table: z.enum([
    'master_stasiun',
    'master_alat',
    'master_sla_ola',
    'master_akun',
    'master_petugas',
    'kalibrasi',
    'sistem',
    'pengaturan',
    'autentikasi',
  ]),
  action: z.enum([
    'TAMBAH',
    'EDIT',
    'HAPUS',
    'SIMPAN_SLA_OLA',
    'SIMPAN_KALIBRASI',
    'SYNC_SERVER',
    'RESET_DATA',
    'EXPORT_DATA',
    'LOGIN',
    'LOGOUT',
    'REFRESH_TOKEN',
  ]),
  recordId: z.string().trim().min(1).max(200),
  recordName: z.string().trim().min(1).max(300),
  details: z.string().trim().min(1).max(3000),
  status: z.string().trim().max(50).optional(),
});

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
    const parsed = createAuditLogInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Data audit log tidak valid.', errors: z.flattenError(parsed.error).fieldErrors });
    }
    try {
      const { table, action, recordId, recordName, details, status } = parsed.data;

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
      // Ini benar-benar error database (mis. koneksi terputus), bukan lagi error validasi
      // input - jadi jujur kirim 503, bukan pura-pura "berhasil" seperti sebelumnya.
      console.error('createAuditLog PostgreSQL error:', (error as any)?.message || error);
      return res.status(503).json({ success: false, message: 'Gagal menyimpan audit log ke database.' });
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
