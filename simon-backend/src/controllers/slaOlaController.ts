import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

const saveSlaOlaInput = z.object({
  uptStation: z.string().trim().min(1, 'Stasiun UPT wajib diisi').max(200),
  category: z.string().trim().min(1, 'Kategori peralatan wajib diisi').max(100),
  deviceId: z.string().trim().min(1).max(64).optional().nullable(),
  kondisiSla: z.union([z.boolean(), z.enum(['true', 'false']), z.literal(1), z.literal(0), z.literal('1'), z.literal('0')]),
  kondisiOla: z.coerce.number().finite().min(0, 'Nilai OLA harus antara 0 sampai 100.').max(100, 'Nilai OLA harus antara 0 sampai 100.'),
  kendala: z.string().trim().max(2000).optional(),
});

const saveMonthlySlaOlaInput = z.object({
  deviceId: z.string().trim().min(1, 'deviceId wajib diisi').max(64),
  uptStation: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  kondisiSla: z.union([z.boolean(), z.enum(['true', 'false']), z.literal(1), z.literal(0)]).optional(),
  ola: z.coerce.number().finite().min(0).max(100).optional(),
  bulan: z.coerce.number().int().min(1, 'bulan wajib diisi').max(12, 'bulan tidak valid'),
  tahun: z.coerce.number().int().min(2000, 'tahun wajib diisi').max(2100, 'tahun tidak valid'),
});

function invalidSlaOla(res: Response, error: z.ZodError) {
  return res.status(400).json({ success: false, message: 'Data SLA/OLA tidak valid.', errors: z.flattenError(error).fieldErrors });
}

export const slaOlaController = {
  /**
   * Menyimpan entri SLA/OLA dan memperbarui status perangkat secara atomik.
   */
  saveSlaOla: async (req: AuthRequest, res: Response) => {
    const parsed = saveSlaOlaInput.safeParse(req.body);
    if (!parsed.success) return invalidSlaOla(res, parsed.error);
    try {
      const { uptStation, category, deviceId, kondisiSla, kondisiOla, kendala } = parsed.data;

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Sesi tidak valid.' });
      }

      const slaOn = kondisiSla === true || kondisiSla === 'true' || kondisiSla === 1 || kondisiSla === '1';
      const ola = kondisiOla;

      // Pemeriksaan Hak Akses (Otorisasi)
      if (req.user.role !== 'ADMIN' && req.user.uptStation !== uptStation) {
        return res.status(403).json({ success: false, message: 'Anda hanya dapat mengisi SLA/OLA untuk UPT sendiri.' });
      }

      if (deviceId) {
        const targetDevice = await prisma.device.findUnique({ where: { id: deviceId } });
        if (!targetDevice) {
          return res.status(404).json({ success: false, message: 'Perangkat tidak ditemukan.' });
        }
        if (req.user.role !== 'ADMIN' && targetDevice.uptStation !== req.user.uptStation) {
          return res.status(403).json({ success: false, message: 'Perangkat bukan milik UPT Anda.' });
        }
      }

      // Penentuan Status Operasional Perangkat
      let newStatus: 'NORMAL' | 'GANGGUAN' | 'MATI' = 'NORMAL';
      if (!slaOn || ola === 0) {
        newStatus = 'MATI';
      } else if (ola >= 100) {
        newStatus = 'NORMAL';
      } else {
        newStatus = 'GANGGUAN';
      }

      const actorName = req.user.name || 'System';

      // Eksekusi Transaksi Atomik Database
      const { log } = await prisma.$transaction(async (tx) => {
        // 1. Buat Log SLA/OLA
        const createdLog = await tx.slaOlaLog.create({
          data: {
            uptStation,
            category,
            deviceId: deviceId || null,
            kondisiSla: slaOn,
            kondisiOla: ola,
            kendala: kendala || '',
            status: newStatus,
            actor: actorName,
          },
        });

        let updatedDeviceName = '';

        // 2. Perbarui Status Perangkat Terkait
        if (deviceId) {
          const dev = await tx.device.findUnique({ where: { id: deviceId } });
          if (dev) {
            updatedDeviceName = dev.name;
            await tx.device.update({
              where: { id: deviceId },
              data: {
                conditionStatus: newStatus,
                slaScore: slaOn ? 100 : 0,
                olaScore: ola,
                issueDescription: kendala || (newStatus === 'NORMAL' ? null : 'Kendala operasional dilaporkan UPT'),
                downtimeDuration: newStatus === 'NORMAL' ? null : newStatus === 'MATI' ? 'Mati Total (0%)' : 'Dalam Penanganan UPT',
                lastReportedDate: new Date().toISOString().split('T')[0],
              },
            });
          }
        } else {
          const matchingDevices = await tx.device.findMany({
            where: { uptStation, category },
          });

          for (const dev of matchingDevices) {
            updatedDeviceName = dev.name;
            await tx.device.update({
              where: { id: dev.id },
              data: {
                conditionStatus: newStatus,
                slaScore: slaOn ? 100 : 0,
                olaScore: ola,
                issueDescription: kendala || (newStatus === 'NORMAL' ? null : 'Kendala operasional dilaporkan UPT'),
                downtimeDuration: newStatus === 'NORMAL' ? null : newStatus === 'MATI' ? 'Mati Total (0%)' : 'Dalam Penanganan UPT',
                lastReportedDate: new Date().toISOString().split('T')[0],
              },
            });
          }
        }

        // 3. Catat Log Aktivitas (Audit Log)
        await tx.auditLog.create({
          data: {
            table: 'master_sla_ola',
            action: 'SIMPAN_SLA_OLA',
            recordId: deviceId || uptStation,
            recordName: updatedDeviceName || `${category} - ${uptStation}`,
            actor: actorName,
            details: `Pengisian SLA/OLA: SLA=${slaOn ? 'ON (100%)' : 'OFF (0%)'}, OLA=${ola}%. Kendala: "${kendala || '-'}"`,
          },
        });

        return { log: createdLog };
      });

      // Ambil Daftar Perangkat Terbaru
      const allDevices = await prisma.device.findMany({ orderBy: { name: 'asc' } });

      return res.json({
        success: true,
        message: 'Data SLA/OLA berhasil disimpan ke database.',
        data: log,
        devices: allDevices,
        lastSync: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jayapura' }),
      });
    } catch (error) {
      console.error('Error saveSlaOla:', error);
      return res.status(500).json({ success: false, message: 'Gagal menyimpan data SLA/OLA.' });
    }
  },

  /**
   * Menyimpan Data SLA/OLA Bulanan Secara Eksplisit (Tampilan Admin Master).
   */
  saveMonthlySlaOla: async (req: AuthRequest, res: Response) => {
    const parsed = saveMonthlySlaOlaInput.safeParse(req.body);
    if (!parsed.success) return invalidSlaOla(res, parsed.error);
    try {
      const { deviceId, uptStation, category, kondisiSla, ola, bulan, tahun } = parsed.data;

      const slaOn = Boolean(kondisiSla);
      const olaNum = Math.min(100, Math.max(0, ola ?? 0));
      const bulanNum = bulan;
      const tahunNum = tahun;

      let newStatus: 'NORMAL' | 'GANGGUAN' | 'MATI' = 'NORMAL';
      if (!slaOn || olaNum === 0) {
        newStatus = 'MATI';
      } else if (olaNum < 100) {
        newStatus = 'GANGGUAN';
      }

      const targetTimestamp = new Date(tahunNum, bulanNum - 1, 15, 12, 0, 0);
      const now = new Date();
      const isCurrentMonth = bulanNum === now.getMonth() + 1 && tahunNum === now.getFullYear();
      const actorName = req.user?.name || 'System';

      // Eksekusi Transaksi Atomik Database
      const { log } = await prisma.$transaction(async (tx) => {
        // 1. Buat Log SLA/OLA Bulanan
        const createdLog = await tx.slaOlaLog.create({
          data: {
            uptStation: uptStation || '',
            category: category || '',
            deviceId,
            kondisiSla: slaOn,
            kondisiOla: olaNum,
            status: newStatus,
            actor: actorName,
            timestamp: targetTimestamp,
          },
        });

        // 2. Perbarui Perangkat Jika Mengedit Bulan Berjalan
        let updatedDeviceName = '';
        if (isCurrentMonth) {
          const dev = await tx.device.update({
            where: { id: deviceId },
            data: {
              conditionStatus: newStatus,
              slaScore: slaOn ? 100 : 0,
              olaScore: olaNum,
              lastReportedDate: new Date().toISOString().split('T')[0],
            },
          });
          updatedDeviceName = dev.name;
        } else {
          const dev = await tx.device.findUnique({ where: { id: deviceId } });
          updatedDeviceName = dev?.name || deviceId;
        }

        // 3. Catat Log Aktivitas (Audit Log)
        await tx.auditLog.create({
          data: {
            table: 'master_sla_ola',
            action: 'SIMPAN_SLA_OLA',
            recordId: deviceId,
            recordName: updatedDeviceName,
            actor: actorName,
            details: `Input SLA/OLA bulanan [${bulanNum}/${tahunNum}] pada alat "${updatedDeviceName}": SLA=${slaOn ? 'ON (100%)' : 'OFF (0%)'}, OLA ${olaNum}% (Status ${newStatus})`,
          },
        });

        return { log: createdLog };
      });

      const allDevices = await prisma.device.findMany({ orderBy: { name: 'asc' } });

      return res.json({
        success: true,
        message: 'Data SLA/OLA bulanan berhasil disimpan ke database.',
        data: log,
        devices: allDevices,
      });
    } catch (error) {
      console.error('Error saveMonthlySlaOla:', error);
      return res.status(500).json({ success: false, message: 'Gagal menyimpan data SLA/OLA bulanan.' });
    }
  },

  /**
   * Mengambil Data SLA/OLA Terakhir Per Perangkat Berdasarkan Bulan & Tahun.
   */
  getMonthlySlaOla: async (req: AuthRequest, res: Response) => {
    const parsedQuery = z
      .object({
        bulan: z.coerce.number().int().min(1).max(12),
        tahun: z.coerce.number().int().min(2000).max(2100),
      })
      .safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ success: false, message: 'Query bulan dan tahun wajib diisi dengan benar.' });
    }
    try {
      const bulanNum = parsedQuery.data.bulan;
      const tahunNum = parsedQuery.data.tahun;

      const start = new Date(tahunNum, bulanNum - 1, 1, 0, 0, 0);
      const end = new Date(tahunNum, bulanNum, 1, 0, 0, 0);

      const logs = await prisma.slaOlaLog.findMany({
        where: {
          deviceId: { not: null },
          timestamp: { gte: start, lt: end },
        },
        orderBy: { timestamp: 'desc' },
      });

      const latestPerDevice: Record<string, { sla: number; ola: number }> = {};
      for (const log of logs) {
        if (!log.deviceId) continue;
        if (latestPerDevice[log.deviceId]) continue;
        latestPerDevice[log.deviceId] = {
          sla: log.kondisiSla ? 100 : 0,
          ola: log.kondisiOla,
        };
      }

      return res.json({ success: true, data: latestPerDevice });
    } catch (error) {
      console.error('Error getMonthlySlaOla:', error);
      return res.status(500).json({ success: false, message: 'Gagal mengambil data SLA/OLA bulanan.' });
    }
  },

  /**
   * Mengambil Riwayat Log SLA/OLA.
   */
  getSlaOlaLogs: async (_req: AuthRequest, res: Response) => {
    try {
      const logs = await prisma.slaOlaLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 100,
      });
      return res.json({ success: true, count: logs.length, data: logs });
    } catch (error) {
      console.warn('getSlaOlaLogs PostgreSQL note:', (error as any)?.message || error);
      return res.json({ success: true, count: 0, data: [], source: 'FALLBACK' });
    }
  },
};