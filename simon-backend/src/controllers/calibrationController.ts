import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

const calibrationInput = z.object({
  deviceId: z.string().trim().min(1),
  deviceName: z.string().trim().max(200).optional(),
  uptStation: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  lastCalibrated: z.string().trim().min(1).max(20),
  calibrationValidUntil: z.string().trim().min(1).max(20),
  calibrationAgency: z.string().trim().min(1).max(200).optional(),
  calibrationStatus: z.enum(['VALID', 'SEGERA_DIKALIBRASI', 'KADALUWARSA']).optional(),
  certificateNumber: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(3000).nullable().optional(),
});

export const calibrationController = {
  saveCalibration: async (req: AuthRequest, res: Response) => {
    const parsed = calibrationInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Data kalibrasi tidak valid.', errors: z.flattenError(parsed.error).fieldErrors });
    try {
      const body = parsed.data;
      const device = await prisma.device.findUnique({ where: { id: body.deviceId } });
      if (!device) return res.status(404).json({ success: false, message: 'Perangkat tidak ditemukan.' });
      const record = await prisma.$transaction(async (tx) => {
        const created = await tx.calibrationRecord.create({ data: { deviceId: device.id, deviceName: body.deviceName || device.name, uptStation: body.uptStation || device.uptStation, category: body.category || device.category, lastCalibrated: body.lastCalibrated, calibrationValidUntil: body.calibrationValidUntil, calibrationAgency: body.calibrationAgency || 'INSKAL BBMKG Wilayah V Jayapura', calibrationStatus: body.calibrationStatus || 'VALID', certificateNumber: body.certificateNumber || null, notes: body.notes || null } });
        await tx.device.update({ where: { id: device.id }, data: { lastCalibrated: body.lastCalibrated, calibrationValidUntil: body.calibrationValidUntil, calibrationAgency: body.calibrationAgency || 'INSKAL BBMKG Wilayah V Jayapura', calibrationStatus: body.calibrationStatus || 'VALID' } });
        await tx.auditLog.create({ data: { table: 'kalibrasi', action: 'SIMPAN_KALIBRASI', recordId: device.id, recordName: device.name, actor: req.user?.name || 'System', details: `Pembaruan Kalibrasi: Status=${body.calibrationStatus || 'VALID'}, Berlaku s/d ${body.calibrationValidUntil}. Sertifikat: "${body.certificateNumber || '-'}"` } });
        return created;
      });
      const devices = await prisma.device.findMany({ orderBy: { name: 'asc' } });
      return res.json({ success: true, message: 'Data kalibrasi berhasil disimpan.', data: record, devices });
    } catch (error) {
      console.error('Error saveCalibration:', error);
      return res.status(500).json({ success: false, message: 'Gagal menyimpan data kalibrasi.' });
    }
  },

  getCalibrationRecords: async (_req: AuthRequest, res: Response) => {
    try {
      const records = await prisma.calibrationRecord.findMany({ orderBy: { createdAt: 'desc' } });
      return res.json({ success: true, count: records.length, data: records });
    } catch (error) {
      console.error('getCalibrationRecords PostgreSQL error:', error);
      return res.status(503).json({ success: false, message: 'Database tidak tersedia. Riwayat kalibrasi tidak dapat dimuat.' });
    }
  },
};
