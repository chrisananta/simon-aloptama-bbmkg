import { Response } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

const deviceInput = z.object({
  id: z.string().trim().min(1).max(64).optional(),
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  subCategory: z.string().trim().max(100).nullable().optional(),
  uptStation: z.string().trim().min(1).max(200),
  picKalibrasi: z.string().trim().max(200).optional(),
  locationName: z.string().trim().max(200).optional(),
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
  conditionStatus: z.enum(['NORMAL', 'GANGGUAN', 'MATI']).optional(),
  calibrationStatus: z.enum(['VALID', 'SEGERA_DIKALIBRASI', 'KADALUWARSA']).optional(),
  lastCalibrated: z.string().trim().min(1).max(20).optional(),
  calibrationValidUntil: z.string().trim().min(1).max(20).optional(),
  calibrationAgency: z.string().trim().min(1).max(200).optional(),
  issueDescription: z.string().trim().max(2000).nullable().optional(),
  downtimeDuration: z.string().trim().max(200).nullable().optional(),
  slaScore: z.coerce.number().finite().min(0).max(100).optional(),
  olaScore: z.coerce.number().finite().min(0).max(100).optional(),
});

const deviceUpdate = deviceInput.partial().omit({ id: true });
const actorName = (req: AuthRequest) => req.user?.name || 'System';

function badInput(res: Response, error: z.ZodError) {
  return res.status(400).json({ success: false, message: 'Data perangkat tidak valid.', errors: z.flattenError(error).fieldErrors });
}

function databaseError(res: Response, error: unknown, fallback: string) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  if (code === 'P2002') return res.status(409).json({ success: false, message: 'ID perangkat sudah digunakan.' });
  if (code === 'P2025') return res.status(404).json({ success: false, message: 'Perangkat tidak ditemukan.' });
  return res.status(500).json({ success: false, message: fallback });
}

export const deviceController = {
  getAllDevices: async (_req: AuthRequest, res: Response) => {
    try {
      const devices = await prisma.device.findMany({ orderBy: { name: 'asc' } });
      return res.json({ success: true, count: devices.length, data: devices, devices, totalDevices: devices.length, source: 'POSTGRESQL_PRISMA_STORAGE', lastUpdate: new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jayapura' }) + ' WIT' });
    } catch (error) {
      console.error('getAllDevices PostgreSQL error:', error);
      return res.status(503).json({ success: false, message: 'Database tidak tersedia. Data perangkat tidak dapat dimuat.' });
    }
  },

  getDeviceById: async (req: AuthRequest, res: Response) => {
    try {
      const device = await prisma.device.findUnique({ where: { id: req.params.id }, include: { slaOlaLogs: true, calibrationRecords: true } });
      if (!device) return res.status(404).json({ success: false, message: 'Perangkat tidak ditemukan.' });
      return res.json({ success: true, data: device });
    } catch (error) {
      console.error('Error getDeviceById:', error);
      return res.status(500).json({ success: false, message: 'Gagal mengambil detail perangkat.' });
    }
  },

  createDevice: async (req: AuthRequest, res: Response) => {
    const parsed = deviceInput.safeParse(req.body);
    if (!parsed.success) return badInput(res, parsed.error);
    try {
      const body = parsed.data;
      const station = await prisma.uptStation.findFirst({ where: { name: body.uptStation } });
      if (!station) return res.status(400).json({ success: false, message: 'Stasiun UPT tidak ditemukan. Buat atau pilih stasiun yang terdaftar.' });
      const today = new Date().toISOString().slice(0, 10);
      const newDevice = await prisma.$transaction(async (tx) => {
        const created = await tx.device.create({ data: { ...body, id: body.id || `ALT-${randomUUID()}`, subCategory: body.subCategory || null, picKalibrasi: body.picKalibrasi || 'Balai', locationName: body.locationName || body.uptStation, conditionStatus: body.conditionStatus || 'NORMAL', calibrationStatus: body.calibrationStatus || 'VALID', lastCalibrated: body.lastCalibrated || today, calibrationValidUntil: body.calibrationValidUntil || today, calibrationAgency: body.calibrationAgency || 'INSKAL BBMKG V', issueDescription: body.issueDescription || null, downtimeDuration: body.downtimeDuration || null, stationId: station.id } });
        await tx.auditLog.create({ data: { table: 'master_alat', action: 'TAMBAH', recordId: created.id, recordName: `${created.name} (${created.category})`, actor: actorName(req), details: `Penambahan unit aloptama baru di Stasiun ${created.uptStation}.` } });
        return created;
      });
      return res.status(201).json({ success: true, data: newDevice });
    } catch (error) {
      console.error('Error createDevice:', error);
      return databaseError(res, error, 'Gagal menambahkan perangkat baru.');
    }
  },

  updateDevice: async (req: AuthRequest, res: Response) => {
    const parsed = deviceUpdate.safeParse(req.body);
    if (!parsed.success) return badInput(res, parsed.error);
    if (Object.keys(parsed.data).length === 0) return res.status(400).json({ success: false, message: 'Tidak ada data yang dapat diperbarui.' });
    try {
      const body = parsed.data;
      const station = body.uptStation ? await prisma.uptStation.findFirst({ where: { name: body.uptStation } }) : null;
      if (body.uptStation && !station) return res.status(400).json({ success: false, message: 'Stasiun UPT tidak ditemukan.' });
      const updated = await prisma.$transaction(async (tx) => {
        const device = await tx.device.update({ where: { id: req.params.id }, data: { ...body, stationId: station?.id } });
        await tx.auditLog.create({ data: { table: 'master_alat', action: 'EDIT', recordId: device.id, recordName: `${device.name} (${device.category})`, actor: actorName(req), details: `Pembaruan data master aloptama ${device.name}.` } });
        return device;
      });
      return res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updateDevice:', error);
      return databaseError(res, error, 'Gagal memperbarui data perangkat.');
    }
  },

  deleteDevice: async (req: AuthRequest, res: Response) => {
    try {
      const device = await prisma.device.findUnique({ where: { id: req.params.id } });
      if (!device) return res.status(404).json({ success: false, message: 'Perangkat tidak ditemukan.' });
      await prisma.$transaction(async (tx) => {
        await tx.device.delete({ where: { id: device.id } });
        await tx.auditLog.create({ data: { table: 'master_alat', action: 'HAPUS', recordId: device.id, recordName: device.name, actor: actorName(req), details: `Penghapusan data master aloptama ${device.name} (${device.category}).` } });
      });
      return res.json({ success: true, message: 'Perangkat berhasil dihapus.' });
    } catch (error) {
      console.error('Error deleteDevice:', error);
      return databaseError(res, error, 'Gagal menghapus data perangkat.');
    }
  },
};
