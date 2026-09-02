import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import {
  serializeDeviceDates,
  parseDateOnly,
  formatDateOnly,
  getTodayDateOnlyWIT,
  diffDaysDateOnly,
} from '../utils/dateUtils.js';

// Batas maksimal mundur untuk pengisian SLA/OLA susulan (hari).
const MAX_BACKDATE_DAYS = 10;

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const saveSlaOlaInput = z.object({
  uptStation: z.string().trim().min(1, 'Stasiun UPT wajib diisi').max(200),
  category: z.string().trim().min(1, 'Kategori peralatan wajib diisi').max(100),
  deviceId: z.string().trim().min(1).max(64).optional().nullable(),
  kondisiSla: z.union([z.boolean(), z.enum(['true', 'false']), z.literal(1), z.literal(0), z.literal('1'), z.literal('0')]),
  kondisiOla: z.coerce.number().finite().min(0, 'Nilai OLA harus antara 0 sampai 100.').max(100, 'Nilai OLA harus antara 0 sampai 100.'),
  kendala: z.string().trim().max(2000).optional(),
  // Tanggal kondisi yang dilaporkan (opsional; default hari ini jika kosong).
  // Format "YYYY-MM-DD", dipakai untuk pengisian susulan/backdate.
  tanggal: z.string().trim().regex(DATE_ONLY_REGEX, 'Format tanggal wajib "YYYY-MM-DD".').optional(),
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

const updateSlaOlaLogInput = z.object({
  kondisiSla: z.union([z.boolean(), z.enum(['true', 'false']), z.literal(1), z.literal(0)]),
  kondisiOla: z.coerce.number().finite().min(0, 'Nilai OLA harus antara 0 sampai 100.').max(100, 'Nilai OLA harus antara 0 sampai 100.'),
  actor: z.string().trim().max(200).optional(),
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
      const { uptStation, category, deviceId, kondisiSla, kondisiOla, kendala, tanggal } = parsed.data;

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Sesi tidak valid.' });
      }

      // Validasi & resolusi tanggal laporan (mendukung pengisian susulan/backdate).
      const todayStr = getTodayDateOnlyWIT();
      const reportDateStr = tanggal || todayStr;

      if (reportDateStr > todayStr) {
        return res.status(400).json({ success: false, message: 'Tanggal laporan tidak boleh di masa depan.' });
      }
      const daysBack = diffDaysDateOnly(todayStr, reportDateStr);
      if (daysBack > MAX_BACKDATE_DAYS) {
        return res.status(400).json({
          success: false,
          message: `Tanggal laporan hanya boleh mundur maksimal ${MAX_BACKDATE_DAYS} hari dari hari ini.`,
        });
      }

      const reportDateObj = parseDateOnly(reportDateStr);
      const isLate = reportDateStr !== todayStr;

      const slaOn = kondisiSla === true || kondisiSla === 'true' || kondisiSla === 1 || kondisiSla === '1';
      const ola = kondisiOla;

      // Pemeriksaan Hak Akses (Otorisasi)
      // KaUPT/KaBBMKG tidak berwenang mengisi SLA/OLA sama sekali (read-only).
      if (req.user.role === 'KAUPT_KABBMKG') {
        return res.status(403).json({ success: false, message: 'Peran KaUPT/KaBBMKG tidak memiliki akses untuk mengisi SLA/OLA.' });
      }
      // Teknisi UPT hanya boleh mengisi untuk UPT sendiri. Admin Inskal &
      // Super Admin boleh mengisi untuk UPT mana pun.
      const isFullAccessRole = req.user.role === 'ADMIN_INSKAL' || req.user.role === 'SUPER_ADMIN';
      if (!isFullAccessRole && req.user.uptStation !== uptStation) {
        return res.status(403).json({ success: false, message: 'Anda hanya dapat mengisi SLA/OLA untuk UPT sendiri.' });
      }

      if (deviceId) {
        const targetDevice = await prisma.device.findUnique({ where: { devicesId: deviceId } });
        if (!targetDevice) {
          return res.status(404).json({ success: false, message: 'Perangkat tidak ditemukan.' });
        }
        if (!isFullAccessRole && targetDevice.uptStation !== req.user.uptStation) {
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

      // Perangkat hanya boleh diperbarui statusnya "hari ini" (live status)
      // oleh laporan yang tanggalnya sama atau lebih baru dari data yang
      // sudah tersimpan. Kalau ini pengisian susulan untuk tanggal lampau
      // sementara perangkat sudah punya laporan yang lebih baru, log historis
      // tetap dicatat tapi status live perangkat TIDAK ditimpa mundur.
      const shouldUpdateLiveStatus = (dev: { lastReportedDate: Date | null }) => {
        if (!dev.lastReportedDate) return true;
        const existingStr = formatDateOnly(dev.lastReportedDate)!;
        return reportDateStr >= existingStr;
      };

      // Eksekusi Transaksi Atomik Database
      const { log } = await prisma.$transaction(async (tx) => {
        // 1. Buat Log SLA/OLA (selalu tercatat sebagai riwayat per tanggal,
        //    terlepas dari apakah status live perangkat ikut diperbarui).
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
            reportDate: reportDateObj,
            isLate,
          },
        });

        let updatedDeviceName = '';
        let liveStatusSkipped = false;

        // 2. Perbarui Status Perangkat Terkait (hanya jika laporan ini bukan
        //    laporan yang lebih lama dari data terakhir yang sudah tersimpan).
        if (deviceId) {
          const dev = await tx.device.findUnique({ where: { devicesId: deviceId } });
          if (dev) {
            updatedDeviceName = dev.site;
            if (shouldUpdateLiveStatus(dev)) {
              await tx.device.update({
                where: { devicesId: deviceId },
                data: {
                  conditionStatus: newStatus,
                  slaScore: slaOn ? 100 : 0,
                  olaScore: ola,
                  issueDescription: kendala || (newStatus === 'NORMAL' ? null : 'Kendala operasional dilaporkan UPT'),
                  downtimeDuration: newStatus === 'NORMAL' ? null : newStatus === 'MATI' ? 'Mati Total (0%)' : 'Dalam Penanganan UPT',
                  lastReportedDate: reportDateObj,
                },
              });
            } else {
              liveStatusSkipped = true;
            }
          }
        } else {
          const matchingDevices = await tx.device.findMany({
            where: { uptStation, category },
          });

          for (const dev of matchingDevices) {
            updatedDeviceName = dev.site;
            if (shouldUpdateLiveStatus(dev)) {
              await tx.device.update({
                where: { devicesId: dev.devicesId },
                data: {
                  conditionStatus: newStatus,
                  slaScore: slaOn ? 100 : 0,
                  olaScore: ola,
                  issueDescription: kendala || (newStatus === 'NORMAL' ? null : 'Kendala operasional dilaporkan UPT'),
                  downtimeDuration: newStatus === 'NORMAL' ? null : newStatus === 'MATI' ? 'Mati Total (0%)' : 'Dalam Penanganan UPT',
                  lastReportedDate: reportDateObj,
                },
              });
            } else {
              liveStatusSkipped = true;
            }
          }
        }

        // 3. Catat Log Aktivitas (Audit Log), termasuk penanda susulan/terlambat.
        const tanggalIndo = formatDateOnly(reportDateObj);
        const lateNote = isLate
          ? ` [DIISI TERLAMBAT / SUSULAN — data untuk tanggal ${tanggalIndo}, dikirim pada ${todayStr}]`
          : '';
        const skippedNote = liveStatusSkipped
          ? ' Status terkini perangkat tidak diubah karena sudah ada laporan yang lebih baru.'
          : '';

        await tx.auditLog.create({
          data: {
            table: 'master_sla_ola',
            action: 'SIMPAN_SLA_OLA',
            recordId: deviceId || uptStation,
            recordName: updatedDeviceName || `${category} - ${uptStation}`,
            actor: actorName,
            details: `Pengisian SLA/OLA (tanggal ${tanggalIndo}): SLA=${slaOn ? 'ON (100%)' : 'OFF (0%)'}, OLA=${ola}%. Kendala: "${kendala || '-'}"${lateNote}${skippedNote}`,
          },
        });

        return { log: createdLog };
      });

      // Ambil Daftar Perangkat Terbaru
      const allDevices = await prisma.device.findMany({ orderBy: { site: 'asc' } });

      return res.json({
        success: true,
        message: isLate
          ? `Data SLA/OLA susulan untuk tanggal ${formatDateOnly(reportDateObj)} berhasil disimpan.`
          : 'Data SLA/OLA berhasil disimpan ke database.',
        data: { ...log, reportDate: formatDateOnly(log.reportDate) },
        isLate,
        tanggal: formatDateOnly(reportDateObj),
        devices: allDevices.map(serializeDeviceDates),
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
            // Rekap bulanan tidak punya tanggal harian spesifik; pakai
            // tanggal 15 bulan tsb sebagai representasi (sama seperti timestamp),
            // dan bukan bagian dari alur pengisian susulan harian.
            reportDate: targetTimestamp,
            isLate: false,
          },
        });

        // 2. Perbarui Perangkat Jika Mengedit Bulan Berjalan
        let updatedDeviceName = '';
        if (isCurrentMonth) {
          const dev = await tx.device.update({
            where: { devicesId: deviceId },
            data: {
              conditionStatus: newStatus,
              slaScore: slaOn ? 100 : 0,
              olaScore: olaNum,
              lastReportedDate: new Date(),
            },
          });
          updatedDeviceName = dev.site;
        } else {
          const dev = await tx.device.findUnique({ where: { devicesId: deviceId } });
          updatedDeviceName = dev?.site || deviceId;
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

      const allDevices = await prisma.device.findMany({ orderBy: { site: 'asc' } });

      return res.json({
        success: true,
        message: 'Data SLA/OLA bulanan berhasil disimpan ke database.',
        data: log,
        devices: allDevices.map(serializeDeviceDates),
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
   * Mengambil Riwayat Log SLA/OLA — untuk tabel monitoring pengisian di Admin.
   * Mendukung filter opsional bulan & tahun (berdasarkan reportDate), dan
   * menyertakan nama alat (site) hasil join ke tabel Device.
   */
  getSlaOlaLogs: async (req: AuthRequest, res: Response) => {
    const parsedQuery = z
      .object({
        bulan: z.coerce.number().int().min(1).max(12).optional(),
        tahun: z.coerce.number().int().min(2000).max(2100).optional(),
      })
      .safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ success: false, message: 'Query bulan/tahun tidak valid.' });
    }
    try {
      const { bulan, tahun } = parsedQuery.data;
      const where: any = {};

      if (bulan && tahun) {
        const start = new Date(tahun, bulan - 1, 1, 0, 0, 0);
        const end = new Date(tahun, bulan, 1, 0, 0, 0);
        where.reportDate = { gte: start, lt: end };
      }

      const logs = await prisma.slaOlaLog.findMany({
        where,
        orderBy: { reportDate: 'desc' },
        take: bulan && tahun ? undefined : 100,
        include: {
          device: { select: { devicesId: true, site: true } },
        },
      });

      const data = logs.map((log) => ({
        id: log.id,
        deviceId: log.deviceId,
        kodeAlat: log.device?.devicesId || log.deviceId || '-',
        namaAlat: log.device?.site || `${log.category} - ${log.uptStation}`,
        uptStation: log.uptStation,
        category: log.category,
        kondisiSla: log.kondisiSla,
        kondisiOla: log.kondisiOla,
        status: log.status,
        actor: log.actor,
        reportDate: formatDateOnly(log.reportDate),
        timestamp: log.timestamp,
        isLate: log.isLate,
      }));

      return res.json({ success: true, count: data.length, data });
    } catch (error) {
      console.warn('getSlaOlaLogs PostgreSQL note:', (error as any)?.message || error);
      return res.json({ success: true, count: 0, data: [], source: 'FALLBACK' });
    }
  },

  /**
   * Mengoreksi nilai SLA/OLA pada satu entri log (Admin, untuk memperbaiki
   * salah input UPT). Jika entri yang diedit adalah entri TERBARU untuk alat
   * tersebut, status live perangkat (Device) ikut disesuaikan.
   */
  updateSlaOlaLog: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const parsed = updateSlaOlaLogInput.safeParse(req.body);
    if (!parsed.success) return invalidSlaOla(res, parsed.error);

    try {
      const existingLog = await prisma.slaOlaLog.findUnique({ where: { id } });
      if (!existingLog) {
        return res.status(404).json({ success: false, message: 'Entri log SLA/OLA tidak ditemukan.' });
      }

      const { kondisiSla, kondisiOla, actor } = parsed.data;
      const slaOn = kondisiSla === true || kondisiSla === 'true' || kondisiSla === 1;
      const ola = kondisiOla;
      const actorName = actor || req.user?.name || 'Admin INSKAL';

      let newStatus: 'NORMAL' | 'GANGGUAN' | 'MATI' = 'NORMAL';
      if (!slaOn || ola === 0) {
        newStatus = 'MATI';
      } else if (ola >= 100) {
        newStatus = 'NORMAL';
      } else {
        newStatus = 'GANGGUAN';
      }

      await prisma.$transaction(async (tx) => {
        const updatedLog = await tx.slaOlaLog.update({
          where: { id },
          data: { kondisiSla: slaOn, kondisiOla: ola, status: newStatus },
        });

        // Jika ini entri PALING BARU untuk alat ini, sinkronkan status live Device.
        if (updatedLog.deviceId) {
          const latestLog = await tx.slaOlaLog.findFirst({
            where: { deviceId: updatedLog.deviceId },
            orderBy: [{ reportDate: 'desc' }, { timestamp: 'desc' }],
          });

          if (latestLog?.id === updatedLog.id) {
            await tx.device.update({
              where: { devicesId: updatedLog.deviceId },
              data: {
                conditionStatus: newStatus,
                slaScore: slaOn ? 100 : 0,
                olaScore: ola,
              },
            });
          }
        }

        await tx.auditLog.create({
          data: {
            table: 'master_sla_ola',
            action: 'EDIT',
            recordId: updatedLog.deviceId || updatedLog.id,
            recordName: `${updatedLog.category} - ${updatedLog.uptStation}`,
            actor: actorName,
            details: `Koreksi entri SLA/OLA tanggal ${formatDateOnly(updatedLog.reportDate)}: SLA=${slaOn ? 'ON (100%)' : 'OFF (0%)'}, OLA=${ola}%.`,
          },
        });
      });

      const allDevices = await prisma.device.findMany({ orderBy: { site: 'asc' } });
      return res.json({
        success: true,
        message: 'Entri SLA/OLA berhasil diperbarui.',
        devices: allDevices.map(serializeDeviceDates),
      });
    } catch (error) {
      console.error('Error updateSlaOlaLog:', error);
      return res.status(500).json({ success: false, message: 'Gagal memperbarui entri SLA/OLA.' });
    }
  },

  /**
   * Menghapus satu entri log SLA/OLA yang salah input (Admin). Setelah
   * dihapus, status live Device dihitung ulang dari entri terbaru yang
   * TERSISA — atau direset ke kondisi 'belum pernah lapor' jika tidak ada
   * entri tersisa sama sekali untuk alat itu.
   */
  deleteSlaOlaLog: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const actorName = (req.body?.actor as string) || req.user?.name || 'Admin INSKAL';

    try {
      const existingLog = await prisma.slaOlaLog.findUnique({ where: { id } });
      if (!existingLog) {
        return res.status(404).json({ success: false, message: 'Entri log SLA/OLA tidak ditemukan.' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.slaOlaLog.delete({ where: { id } });

        if (existingLog.deviceId) {
          const remainingLatest = await tx.slaOlaLog.findFirst({
            where: { deviceId: existingLog.deviceId },
            orderBy: [{ reportDate: 'desc' }, { timestamp: 'desc' }],
          });

          if (remainingLatest) {
            const slaOn = remainingLatest.kondisiSla;
            const ola = remainingLatest.kondisiOla;
            let status: 'NORMAL' | 'GANGGUAN' | 'MATI' = 'NORMAL';
            if (!slaOn || ola === 0) status = 'MATI';
            else if (ola < 100) status = 'GANGGUAN';

            await tx.device.update({
              where: { devicesId: existingLog.deviceId },
              data: {
                conditionStatus: status,
                slaScore: slaOn ? 100 : 0,
                olaScore: ola,
                lastReportedDate: remainingLatest.reportDate,
              },
            });
          } else {
            // Tidak ada entri tersisa sama sekali — reset ke kondisi belum pernah lapor.
            await tx.device.update({
              where: { devicesId: existingLog.deviceId },
              data: {
                conditionStatus: 'NORMAL',
                slaScore: null,
                olaScore: null,
                lastReportedDate: null,
                issueDescription: null,
                downtimeDuration: null,
              },
            });
          }
        }

        await tx.auditLog.create({
          data: {
            table: 'master_sla_ola',
            action: 'HAPUS',
            recordId: existingLog.deviceId || existingLog.id,
            recordName: `${existingLog.category} - ${existingLog.uptStation}`,
            actor: actorName,
            details: `Hapus entri SLA/OLA salah input tanggal ${formatDateOnly(existingLog.reportDate)} (SLA=${existingLog.kondisiSla ? 'ON' : 'OFF'}, OLA=${existingLog.kondisiOla}%).`,
          },
        });
      });

      const allDevices = await prisma.device.findMany({ orderBy: { site: 'asc' } });
      return res.json({
        success: true,
        message: 'Entri SLA/OLA berhasil dihapus.',
        devices: allDevices.map(serializeDeviceDates),
      });
    } catch (error) {
      console.error('Error deleteSlaOlaLog:', error);
      return res.status(500).json({ success: false, message: 'Gagal menghapus entri SLA/OLA.' });
    }
  },
};
