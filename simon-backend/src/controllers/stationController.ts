import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

const stationInput = z.object({
  stationid: z.string().trim().min(1).max(30).optional(),
  code: z.string().trim().min(1).max(30).optional(), // Alias kompatibilitas
  name: z.string().trim().min(1).max(200),
  regionGroup: z.string().trim().min(1).max(100).optional(),
  location: z.string().trim().min(1).max(300).optional(),
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
});
const stationUpdate = stationInput.partial();
const actorName = (req: AuthRequest) => req.user?.name || 'System';

function invalid(res: Response, error: z.ZodError) {
  return res.status(400).json({ success: false, message: 'Data stasiun tidak valid.', errors: z.flattenError(error).fieldErrors });
}

export const stationController = {
  getAllStations: async (_req: AuthRequest, res: Response) => {
    try {
      const stations = await prisma.uptStation.findMany({ orderBy: { stationid: 'asc' } });
      return res.json({ success: true, count: stations.length, data: stations, stations });
    } catch (error) {
      console.error('getAllStations PostgreSQL error:', error);
      return res.status(503).json({ success: false, message: 'Database tidak tersedia. Data stasiun tidak dapat dimuat.' });
    }
  },

  createStation: async (req: AuthRequest, res: Response) => {
    const parsed = stationInput.safeParse(req.body);
    if (!parsed.success) return invalid(res, parsed.error);
    try {
      const body = parsed.data;
      const stationid = body.stationid || body.code;
      if (!stationid) {
        return res.status(400).json({ success: false, message: 'Kode Stasiun (stationid) wajib diisi.' });
      }

      const station = await prisma.$transaction(async (tx) => {
        const created = await tx.uptStation.create({
          data: {
            stationid,
            name: body.name,
            regionGroup: body.regionGroup || 'Papua',
            location: body.location || body.name,
            latitude: body.latitude,
            longitude: body.longitude,
          },
        });
        await tx.auditLog.create({
          data: {
            table: 'master_stasiun',
            action: 'TAMBAH',
            recordId: created.stationid,
            recordName: created.name,
            actor: actorName(req),
            details: `Penambahan stasiun UPT baru: ${created.name} (${created.regionGroup}).`,
          },
        });
        return created;
      });
      return res.status(201).json({ success: true, data: station });
    } catch (error) {
      console.error('Error createStation:', error);
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        return res.status(409).json({ success: false, message: 'Kode stasiun (stationid) sudah digunakan.' });
      }
      return res.status(500).json({ success: false, message: 'Gagal menambahkan stasiun UPT.' });
    }
  },

  updateStation: async (req: AuthRequest, res: Response) => {
    const parsed = stationUpdate.safeParse(req.body);
    if (!parsed.success) return invalid(res, parsed.error);
    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang dapat diperbarui.' });
    }
    try {
      const body = parsed.data;
      const stationid = body.stationid || body.code;

      const updateData: any = {
        name: body.name,
        regionGroup: body.regionGroup,
        location: body.location,
        latitude: body.latitude,
        longitude: body.longitude,
      };
      if (stationid) {
        updateData.stationid = stationid;
      }

      const station = await prisma.$transaction(async (tx) => {
        const updated = await tx.uptStation.update({
          where: { id: req.params.id },
          data: updateData,
        });
        await tx.auditLog.create({
          data: {
            table: 'master_stasiun',
            action: 'EDIT',
            recordId: updated.stationid,
            recordName: updated.name,
            actor: actorName(req),
            details: `Pembaruan data stasiun UPT ${updated.name}.`,
          },
        });
        return updated;
      });
      return res.json({ success: true, data: station });
    } catch (error) {
      console.error('Error updateStation:', error);
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
      if (code === 'P2002') return res.status(409).json({ success: false, message: 'Kode stasiun (stationid) sudah digunakan.' });
      if (code === 'P2025') return res.status(404).json({ success: false, message: 'Stasiun tidak ditemukan.' });
      return res.status(500).json({ success: false, message: 'Gagal memperbarui stasiun UPT.' });
    }
  },

  deleteStation: async (req: AuthRequest, res: Response) => {
    try {
      const station = await prisma.uptStation.findUnique({ where: { id: req.params.id } });
      if (!station) return res.status(404).json({ success: false, message: 'Stasiun tidak ditemukan.' });
      const deviceCount = await prisma.device.count({ where: { OR: [{ stationId: station.id }, { uptStation: station.name }] } });
      if (deviceCount > 0) {
        return res.status(409).json({
          success: false,
          message: `Stasiun tidak dapat dihapus karena masih memiliki ${deviceCount} perangkat. Pindahkan atau hapus perangkat terlebih dahulu.`,
        });
      }
      await prisma.$transaction(async (tx) => {
        await tx.uptStation.delete({ where: { id: station.id } });
        await tx.auditLog.create({
          data: {
            table: 'master_stasiun',
            action: 'HAPUS',
            recordId: station.stationid,
            recordName: station.name,
            actor: actorName(req),
            details: `Penghapusan stasiun UPT ${station.name}.`,
          },
        });
      });
      return res.json({ success: true, message: 'Stasiun UPT berhasil dihapus.' });
    } catch (error) {
      console.error('Error deleteStation:', error);
      return res.status(500).json({ success: false, message: 'Gagal menghapus stasiun UPT.' });
    }
  },
};
