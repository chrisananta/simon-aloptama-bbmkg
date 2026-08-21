import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { parseDateOnly, formatDateOnly, serializeDeviceDates } from '../utils/dateUtils.js';

const dateOnlyString = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal wajib "YYYY-MM-DD".');

const calibrationInput = z.object({
  deviceId: z.string().trim().min(1),
  deviceName: z.string().trim().max(200).optional(),
  uptStation: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  lastCalibrated: dateOnlyString,
  calibrationValidUntil: dateOnlyString,
  calibrationAgency: z.string().trim().min(1).max(200).optional(),
  calibrationStatus: z.enum(['VALID', 'SEGERA_DIKALIBRASI', 'KADALUWARSA']).optional(),
  certificateNumber: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(3000).nullable().optional(),
});

function serializeRecord<T extends { lastCalibrated: Date; calibrationValidUntil: Date }>(record: T) {
  return {
    ...record,
    lastCalibrated: formatDateOnly(record.lastCalibrated),
    calibrationValidUntil: formatDateOnly(record.calibrationValidUntil),
  };
}

export const calibrationController = {
  saveCalibration: async (req: AuthRequest, res: Response) => {
    const parsed = calibrationInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Data kalibrasi tidak valid.', errors: z.flattenError(parsed.error).fieldErrors });
    try {
      const body = parsed.data;
      const device = await prisma.device.findUnique({ where: { devicesId: body.deviceId } });
      if (!device) return res.status(404).json({ success: false, message: 'Perangkat tidak ditemukan.' });
      
      const lastCalibratedDate = parseDateOnly(body.lastCalibrated);
      const calibrationValidUntilDate = parseDateOnly(body.calibrationValidUntil);
      
      const record = await prisma.$transaction(async (tx) => {
        const created = await tx.calibrationRecord.create({
          data: {
            deviceId: device.devicesId,
            deviceName: body.deviceName || device.site,
            uptStation: body.uptStation || device.uptStation,
            category: body.category || device.category,
            lastCalibrated: lastCalibratedDate,
            calibrationValidUntil: calibrationValidUntilDate,
            calibrationAgency: body.calibrationAgency || 'INSKAL BBMKG Wilayah V Jayapura',
            calibrationStatus: body.calibrationStatus || 'VALID',
            certificateNumber: body.certificateNumber || null,
            notes: body.notes || null,
          },
        });
        
        await tx.device.update({
          where: { devicesId: device.devicesId },
          data: {
            lastCalibrated: lastCalibratedDate,
            calibrationValidUntil: calibrationValidUntilDate,
            timkalibrasi: body.calibrationAgency || 'INSKAL BBMKG Wilayah V Jayapura',
            calibrationStatus: body.calibrationStatus || 'VALID',
          },
        });
        
        await tx.auditLog.create({
          data: {
            table: 'kalibrasi',
            action: 'SIMPAN_KALIBRASI',
            recordId: device.devicesId,
            recordName: device.site,
            actor: req.user?.name || 'System',
            details: `Pembaruan Kalibrasi: Status=${body.calibrationStatus || 'VALID'}, Berlaku s/d ${body.calibrationValidUntil}. Sertifikat: "${body.certificateNumber || '-'}"`,
          },
        });
        
        return created;
      });

      const devices = await prisma.device.findMany({ orderBy: { site: 'asc' } });
      const serializedDevices = devices.map(serializeDeviceDates);
      return res.json({ success: true, message: 'Data kalibrasi berhasil disimpan.', data: serializeRecord(record), devices: serializedDevices });
    } catch (error) {
      console.error('Error saveCalibration:', error);
      return res.status(500).json({ success: false, message: 'Gagal menyimpan data kalibrasi.' });
    }
  },

  getCalibrationRecords: async (_req: AuthRequest, res: Response) => {
    try {
      const records = await prisma.calibrationRecord.findMany({ orderBy: { createdAt: 'desc' } });
      return res.json({ success: true, count: records.length, data: records.map(serializeRecord) });
    } catch (error) {
      console.error('getCalibrationRecords PostgreSQL error:', error);
      return res.status(503).json({ success: false, message: 'Database tidak tersedia. Riwayat kalibrasi tidak dapat dimuat.' });
    }
  },
};
