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

  // === FITUR INPUT SLA/OLA BULANAN (Admin Master View) ===
  // Beda dari saveSlaOla di atas cuma soal KAPAN datanya berlaku: di sini
  // admin bisa pilih bulan & tahun secara eksplisit (bukan otomatis "hari
  // ini"), lalu disimpan dengan timestamp yang merepresentasikan bulan itu.
  // SLA tetap ON/OFF (boolean) seperti flow UPT biasa - OLA tetap persentase
  // bebas. Tidak ada perubahan struktur tabel sama sekali.
  //
  // Dengan ini, riwayat per-bulan tersimpan permanen di database (bukan cuma
  // di memori browser yang hilang saat refresh seperti sebelumnya).

  // Simpan/perbarui nilai SLA & OLA untuk 1 alat pada bulan & tahun tertentu
  saveMonthlySlaOla: async (req: Request, res: Response) => {
    try {
      const { deviceId, uptStation, category, kondisiSla, ola, bulan, tahun, actor } = req.body;

      if (!deviceId || !bulan || !tahun) {
        return res.status(400).json({ success: false, message: 'deviceId, bulan, dan tahun wajib diisi.' });
      }

      const slaOn = Boolean(kondisiSla);
      const olaNum = Math.min(100, Math.max(0, Number(ola) || 0));
      const bulanNum = Number(bulan); // 1-12
      const tahunNum = Number(tahun);

      let newStatus: 'NORMAL' | 'GANGGUAN' | 'MATI' = 'NORMAL';
      if (!slaOn || olaNum === 0) {
        newStatus = 'MATI';
      } else if (olaNum < 100) {
        newStatus = 'GANGGUAN';
      }

      // Tanggal 15 tengah hari dipakai supaya aman dari pergeseran zona waktu
      // (tidak akan pernah "terdorong" ke bulan sebelum/sesudahnya).
      const targetTimestamp = new Date(tahunNum, bulanNum - 1, 15, 12, 0, 0);

      const log = await prisma.slaOlaLog.create({
        data: {
          uptStation: uptStation || '',
          category: category || '',
          deviceId,
          kondisiSla: slaOn,
          kondisiOla: olaNum,
          status: newStatus,
          actor: actor || 'Admin INSKAL',
          timestamp: targetTimestamp,
        },
      });

      // Field slaScore/olaScore di tabel devices merepresentasikan status
      // TERKINI alat (dipakai dashboard, laporan mingguan, dll). Supaya edit
      // data bulan lampau/depan tidak diam-diam mengubah status "sekarang",
      // field ini hanya ikut di-update kalau bulan yang diedit memang bulan
      // berjalan saat ini.
      const now = new Date();
      const isCurrentMonth = bulanNum === now.getMonth() + 1 && tahunNum === now.getFullYear();

      let updatedDeviceName = '';
      if (isCurrentMonth) {
        const dev = await prisma.device.update({
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
        const dev = await prisma.device.findUnique({ where: { id: deviceId } });
        updatedDeviceName = dev?.name || deviceId;
      }

      await prisma.auditLog.create({
        data: {
          table: 'master_sla_ola',
          action: 'SIMPAN_SLA_OLA',
          recordId: deviceId,
          recordName: updatedDeviceName,
          actor: actor || 'Admin INSKAL',
          details: `Input SLA/OLA bulanan [${bulanNum}/${tahunNum}] pada alat "${updatedDeviceName}": SLA=${slaOn ? 'ON (100%)' : 'OFF (0%)'}, OLA ${olaNum}% (Status ${newStatus})`,
        },
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

  // Ambil nilai SLA & OLA terakhir per alat untuk bulan & tahun tertentu
  getMonthlySlaOla: async (req: Request, res: Response) => {
    try {
      const bulanNum = Number(req.query.bulan);
      const tahunNum = Number(req.query.tahun);

      if (!bulanNum || !tahunNum) {
        return res.status(400).json({ success: false, message: 'Query bulan dan tahun wajib diisi.' });
      }

      const start = new Date(tahunNum, bulanNum - 1, 1, 0, 0, 0);
      const end = new Date(tahunNum, bulanNum, 1, 0, 0, 0); // awal bulan berikutnya (eksklusif)

      const logs = await prisma.slaOlaLog.findMany({
        where: {
          deviceId: { not: null },
          timestamp: { gte: start, lt: end },
        },
        orderBy: { timestamp: 'desc' },
      });

      // Kalau 1 alat diedit berkali-kali dalam bulan yang sama, ambil yang
      // paling baru saja (logs sudah urut desc, jadi entri pertama per
      // deviceId yang ditemukan otomatis yang terbaru).
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
