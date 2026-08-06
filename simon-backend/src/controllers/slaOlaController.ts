import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';

export const slaOlaController = {
  // Save SLA OLA entry and update matching device status
  saveSlaOla: async (req: Request, res: Response) => {
    try {
      const { uptStation, category, deviceId, kondisiSla, kondisiOla, kendala, actor } = req.body;

      // Determine new status
      let newStatus: 'NORMAL' | 'GANGGUAN' | 'MATI' = 'NORMAL';
      if (!kondisiSla || Number(kondisiOla) === 0) {
        newStatus = 'MATI';
      } else if (Number(kondisiOla) >= 100) {
        newStatus = 'NORMAL';
      } else {
        newStatus = 'GANGGUAN';
      }

      // 1. Create SlaOlaLog entry
      const log = await prisma.slaOlaLog.create({
        data: {
          uptStation,
          category,
          deviceId: deviceId || null,
          kondisiSla: Boolean(kondisiSla),
          kondisiOla: Number(kondisiOla) || 0,
          kendala: kendala || '',
          status: newStatus,
          actor: actor || 'Operator UPT',
        },
      });

      // 2. Update matching device status if deviceId provided, or by uptStation & category
      let updatedDeviceName = '';
      let targetDevices = [];

      if (deviceId) {
        const dev = await prisma.device.findUnique({ where: { id: deviceId } });
        if (dev) {
          updatedDeviceName = dev.name;
          await prisma.device.update({
            where: { id: deviceId },
            data: {
              conditionStatus: newStatus,
              slaScore: kondisiSla ? 100 : 0,
              olaScore: Number(kondisiOla),
              issueDescription: kendala || (newStatus === 'NORMAL' ? null : 'Kendala operasional dilaporkan UPT'),
              downtimeDuration: newStatus === 'NORMAL' ? null : newStatus === 'MATI' ? 'Mati Total (0%)' : 'Dalam Penanganan UPT',
              lastReportedDate: new Date().toISOString().split('T')[0],
            },
          });
        }
      } else {
        const matchingDevices = await prisma.device.findMany({
          where: { uptStation, category },
        });

        for (const dev of matchingDevices) {
          updatedDeviceName = dev.name;
          await prisma.device.update({
            where: { id: dev.id },
            data: {
              conditionStatus: newStatus,
              slaScore: kondisiSla ? 100 : 0,
              olaScore: Number(kondisiOla),
              issueDescription: kendala || (newStatus === 'NORMAL' ? null : 'Kendala operasional dilaporkan UPT'),
              downtimeDuration: newStatus === 'NORMAL' ? null : newStatus === 'MATI' ? 'Mati Total (0%)' : 'Dalam Penanganan UPT',
              lastReportedDate: new Date().toISOString().split('T')[0],
            },
          });
        }
      }

      // 3. Audit Log
      await prisma.auditLog.create({
        data: {
          table: 'master_sla_ola',
          action: 'SIMPAN_SLA_OLA',
          recordId: deviceId || uptStation,
          recordName: updatedDeviceName || `${category} - ${uptStation}`,
          actor: actor || 'Operator UPT BMKG',
          details: `Pengisian SLA/OLA: SLA=${kondisiSla ? 'ON (100%)' : 'OFF (0%)'}, OLA=${kondisiOla}%. Kendala: "${kendala || '-'}"`,
        },
      });

      // Fetch all updated devices for response
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

  // Get SLA/OLA history logs
  getSlaOlaLogs: async (req: Request, res: Response) => {
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
