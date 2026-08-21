import { Response } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { parseDateOnly, formatDateOnly, serializeDeviceDates } from '../utils/dateUtils.js';

const dateOnlyString = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal wajib "YYYY-MM-DD".');

const deviceInput = z.object({
  devicesId: z.string().trim().min(1).max(64).optional(),
  id: z.string().trim().min(1).max(64).optional(), // Alias kompatibilitas
  site: z.string().trim().min(1).max(200).optional(),
  name: z.string().trim().min(1).max(200).optional(), // Alias kompatibilitas
  category: z.string().trim().min(1).max(100),
  merk: z.string().trim().max(100).nullable().optional(),
  subCategory: z.string().trim().max(100).nullable().optional(), // Alias kompatibilitas
  uptStation: z.string().trim().min(1).max(200),
  picKalibrasi: z.string().trim().max(200).optional(),
  locationName: z.string().trim().max(200).optional(),
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
  conditionStatus: z.enum(['NORMAL', 'GANGGUAN', 'MATI']).optional(),
  calibrationStatus: z.enum(['VALID', 'SEGERA_DIKALIBRASI', 'KADALUWARSA']).optional(),
  lastCalibrated: dateOnlyString.optional(),
  calibrationValidUntil: dateOnlyString.optional(),
  timkalibrasi: z.string().trim().min(1).max(200).optional(),
  calibrationAgency: z.string().trim().min(1).max(200).optional(), // Alias kompatibilitas
  issueDescription: z.string().trim().max(2000).nullable().optional(),
  downtimeDuration: z.string().trim().max(200).nullable().optional(),
  slaScore: z.coerce.number().finite().min(0).max(100).optional(),
  olaScore: z.coerce.number().finite().min(0).max(100).optional(),
});

const deviceUpdate = deviceInput.partial().omit({ devicesId: true, id: true });
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

const serializeDevice = serializeDeviceDates;

export const deviceController = {
  getAllDevices: async (_req: AuthRequest, res: Response) => {
    try {
      const devices = await prisma.device.findMany({ orderBy: { site: 'asc' } });
      const serialized = devices.map(serializeDevice);
      return res.json({
        success: true,
        count: serialized.length,
        data: serialized,
        devices: serialized,
        totalDevices: serialized.length,
        source: 'POSTGRESQL_PRISMA_STORAGE',
        lastUpdate: new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jayapura' }) + ' WIT'
      });
    } catch (error) {
      console.error('getAllDevices PostgreSQL error:', error);
      return res.status(503).json({ success: false, message: 'Database tidak tersedia. Data perangkat tidak dapat dimuat.' });
    }
  },

  getDeviceById: async (req: AuthRequest, res: Response) => {
    try {
      const device = await prisma.device.findUnique({
        where: { devicesId: req.params.id },
        include: { slaOlaLogs: true, calibrationRecords: true }
      });
      if (!device) return res.status(404).json({ success: false, message: 'Perangkat tidak ditemukan.' });
      const serializedRecords = device.calibrationRecords.map((r) => ({
        ...r,
        lastCalibrated: formatDateOnly(r.lastCalibrated),
        calibrationValidUntil: formatDateOnly(r.calibrationValidUntil),
      }));
      return res.json({ success: true, data: { ...serializeDevice(device), calibrationRecords: serializedRecords } });
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
      const devicesId = body.devicesId || body.id || `ALT-${randomUUID()}`;
      const site = body.site || body.name || '';
      const merk = body.merk !== undefined ? body.merk : (body.subCategory || null);
      const timkalibrasi = body.timkalibrasi || body.calibrationAgency || 'INSKAL BBMKG V';

      const newDevice = await prisma.$transaction(async (tx) => {
        const created = await tx.device.create({
          data: {
            devicesId,
            site,
            category: body.category,
            merk,
            uptStation: body.uptStation,
            picKalibrasi: body.picKalibrasi || 'Balai',
            locationName: body.locationName || body.uptStation,
            latitude: body.latitude,
            longitude: body.longitude,
            conditionStatus: body.conditionStatus || 'NORMAL',
            calibrationStatus: body.calibrationStatus || 'VALID',
            lastCalibrated: parseDateOnly(body.lastCalibrated || today),
            calibrationValidUntil: parseDateOnly(body.calibrationValidUntil || today),
            timkalibrasi,
            issueDescription: body.issueDescription || null,
            downtimeDuration: body.downtimeDuration || null,
            slaScore: body.slaScore,
            olaScore: body.olaScore,
            stationId: station.id,
          }
        });
        await tx.auditLog.create({
          data: {
            table: 'master_alat',
            action: 'TAMBAH',
            recordId: created.devicesId,
            recordName: `${created.site} (${created.category})`,
            actor: actorName(req),
            details: `Penambahan unit aloptama baru di Stasiun ${created.uptStation}.`
          }
        });
        return created;
      });
      return res.status(201).json({ success: true, data: serializeDevice(newDevice) });
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

      const site = body.site !== undefined ? body.site : body.name;
      const merk = body.merk !== undefined ? body.merk : body.subCategory;
      const timkalibrasi = body.timkalibrasi !== undefined ? body.timkalibrasi : body.calibrationAgency;

      const updated = await prisma.$transaction(async (tx) => {
        const device = await tx.device.update({
          where: { devicesId: req.params.id },
          data: {
            site: site !== undefined ? site : undefined,
            category: body.category,
            merk: merk !== undefined ? merk : undefined,
            uptStation: body.uptStation,
            picKalibrasi: body.picKalibrasi,
            locationName: body.locationName,
            latitude: body.latitude,
            longitude: body.longitude,
            conditionStatus: body.conditionStatus,
            calibrationStatus: body.calibrationStatus,
            lastCalibrated: body.lastCalibrated ? parseDateOnly(body.lastCalibrated) : undefined,
            calibrationValidUntil: body.calibrationValidUntil ? parseDateOnly(body.calibrationValidUntil) : undefined,
            timkalibrasi: timkalibrasi !== undefined ? timkalibrasi : undefined,
            issueDescription: body.issueDescription,
            downtimeDuration: body.downtimeDuration,
            slaScore: body.slaScore,
            olaScore: body.olaScore,
            stationId: station?.id,
          },
        });
        await tx.auditLog.create({
          data: {
            table: 'master_alat',
            action: 'EDIT',
            recordId: device.devicesId,
            recordName: `${device.site} (${device.category})`,
            actor: actorName(req),
            details: `Pembaruan data master aloptama ${device.site}.`
          }
        });
        return device;
      });
      return res.json({ success: true, data: serializeDevice(updated) });
    } catch (error) {
      console.error('Error updateDevice:', error);
      return databaseError(res, error, 'Gagal memperbarui data perangkat.');
    }
  },

  deleteDevice: async (req: AuthRequest, res: Response) => {
    try {
      const device = await prisma.device.findUnique({ where: { devicesId: req.params.id } });
      if (!device) return res.status(404).json({ success: false, message: 'Perangkat tidak ditemukan.' });
      await prisma.$transaction(async (tx) => {
        await tx.device.delete({ where: { devicesId: device.devicesId } });
        await tx.auditLog.create({
          data: {
            table: 'master_alat',
            action: 'HAPUS',
            recordId: device.devicesId,
            recordName: device.site,
            actor: actorName(req),
            details: `Penghapusan data master aloptama ${device.site} (${device.category}).`
          }
        });
      });
      return res.json({ success: true, message: 'Perangkat berhasil dihapus.' });
    } catch (error) {
      console.error('Error deleteDevice:', error);
      return databaseError(res, error, 'Gagal menghapus data perangkat.');
    }
  },
};
