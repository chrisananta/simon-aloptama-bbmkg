import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';

export const stationController = {
  // Get all UPT Stations
  getAllStations: async (req: Request, res: Response) => {
    try {
      const stations = await prisma.uptStation.findMany({
        orderBy: { code: 'asc' },
      });
      return res.json({ success: true, count: stations.length, data: stations, stations });
    } catch (error) {
      console.warn('getAllStations PostgreSQL connection note:', (error as any)?.message || error);
      return res.json({ success: true, count: 0, data: [], stations: [] });
    }
  },

  // Create UPT Station
  createStation: async (req: Request, res: Response) => {
    try {
      const body = req.body;
      const station = await prisma.uptStation.create({
        data: {
          code: body.code,
          name: body.name,
          regionGroup: body.regionGroup || 'Papua',
          location: body.location || body.name,
          latitude: Number(body.latitude) || -2.54,
          longitude: Number(body.longitude) || 140.7,
        },
      });

      await prisma.auditLog.create({
        data: {
          table: 'master_stasiun',
          action: 'TAMBAH',
          recordId: station.code,
          recordName: station.name,
          actor: body.actor || 'Admin INSKAL',
          details: `Penambahan stasiun UPT baru: ${station.name} (${station.regionGroup}).`,
        },
      });

      return res.status(201).json({ success: true, data: station });
    } catch (error) {
      console.error('Error createStation:', error);
      return res.status(500).json({ success: false, message: 'Gagal menambahkan stasiun UPT.' });
    }
  },

  // Update UPT Station
  updateStation: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const body = req.body;

      const station = await prisma.uptStation.update({
        where: { id },
        data: {
          code: body.code,
          name: body.name,
          regionGroup: body.regionGroup,
          location: body.location,
          latitude: body.latitude !== undefined ? Number(body.latitude) : undefined,
          longitude: body.longitude !== undefined ? Number(body.longitude) : undefined,
        },
      });

      await prisma.auditLog.create({
        data: {
          table: 'master_stasiun',
          action: 'EDIT',
          recordId: station.code,
          recordName: station.name,
          actor: body.actor || 'Admin INSKAL',
          details: body.details || `Pembaruan data stasiun UPT ${station.name}.`,
        },
      });

      return res.json({ success: true, data: station });
    } catch (error) {
      console.error('Error updateStation:', error);
      return res.status(500).json({ success: false, message: 'Gagal memperbarui stasiun UPT.' });
    }
  },

  // Delete UPT Station
  deleteStation: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const station = await prisma.uptStation.findUnique({ where: { id } });

      if (!station) {
        return res.status(404).json({ success: false, message: 'Stasiun tidak ditemukan.' });
      }

      await prisma.uptStation.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          table: 'master_stasiun',
          action: 'HAPUS',
          recordId: station.code,
          recordName: station.name,
          actor: (req.body && req.body.actor) || 'Admin INSKAL',
          details: `Penghapusan stasiun UPT ${station.name}.`,
        },
      });

      return res.json({ success: true, message: 'Stasiun UPT berhasil dihapus.' });
    } catch (error) {
      console.error('Error deleteStation:', error);
      return res.status(500).json({ success: false, message: 'Gagal menghapus stasiun UPT.' });
    }
  },
};
