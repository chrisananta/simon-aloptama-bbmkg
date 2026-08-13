import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';

export const deviceController = {
  // Get all devices
  getAllDevices: async (req: Request, res: Response) => {
    try {
      const devices = await prisma.device.findMany({
        orderBy: { name: 'asc' },
      });
      return res.json({
        success: true,
        count: devices.length,
        data: devices,
        devices,
        totalDevices: devices.length,
        source: 'POSTGRESQL_PRISMA_STORAGE',
        lastUpdate: new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jayapura' }) + ' WIT',
      });
    } catch (error) {
      console.warn('getAllDevices PostgreSQL connection note:', (error as any)?.message || error);
      return res.json({
        success: true,
        count: 0,
        data: [],
        devices: [],
        totalDevices: 0,
        source: 'POSTGRESQL_PRISMA_STORAGE',
        lastUpdate: new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jayapura' }) + ' WIT',
      });
    }
  },

  // Get device by ID
  getDeviceById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const device = await prisma.device.findUnique({
        where: { id },
        include: { slaOlaLogs: true, calibrationRecords: true },
      });
      if (!device) {
        return res.status(404).json({ success: false, message: 'Perangkat tidak ditemukan.' });
      }
      return res.json({ success: true, data: device });
    } catch (error) {
      console.error('Error getDeviceById:', error);
      return res.status(500).json({ success: false, message: 'Gagal mengambil detail perangkat.' });
    }
  },

  // Create new device
  createDevice: async (req: Request, res: Response) => {
    try {
      const body = req.body;
      const newDevice = await prisma.device.create({
        data: {
          id: body.id || `ALT${Math.floor(1000 + Math.random() * 9000)}`,
          name: body.name,
          category: body.category,
          subCategory: body.subCategory || null,
          uptStation: body.uptStation,
          picKalibrasi: body.picKalibrasi || 'Balai',
          locationName: body.locationName || body.uptStation,
          latitude: Number(body.latitude) || -2.54,
          longitude: Number(body.longitude) || 140.7,
          conditionStatus: body.conditionStatus || 'NORMAL',
          calibrationStatus: body.calibrationStatus || 'VALID',
          lastCalibrated: body.lastCalibrated || new Date().toISOString().split('T')[0],
          calibrationValidUntil: body.calibrationValidUntil || new Date().toISOString().split('T')[0],
          calibrationAgency: body.calibrationAgency || 'INSKAL BBMKG V',
          issueDescription: body.issueDescription || null,
          downtimeDuration: body.downtimeDuration || null,
        },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          table: 'master_alat',
          action: 'TAMBAH',
          recordId: newDevice.id,
          recordName: `${newDevice.name} (${newDevice.category})`,
          actor: body.actor || 'Admin INSKAL',
          details: `Penambahan unit aloptama baru di Stasiun ${newDevice.uptStation}.`,
        },
      });

      return res.status(201).json({ success: true, data: newDevice });
    } catch (error) {
      console.error('Error createDevice:', error);
      return res.status(500).json({ success: false, message: 'Gagal menambahkan perangkat baru.' });
    }
  },

  // Update device
  updateDevice: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const body = req.body;

      const updated = await prisma.device.update({
        where: { id },
        data: {
          name: body.name,
          category: body.category,
          subCategory: body.subCategory,
          uptStation: body.uptStation,
          picKalibrasi: body.picKalibrasi || 'Balai',
          locationName: body.locationName,
          latitude: body.latitude !== undefined ? Number(body.latitude) : undefined,
          longitude: body.longitude !== undefined ? Number(body.longitude) : undefined,
          conditionStatus: body.conditionStatus,
          calibrationStatus: body.calibrationStatus,
          lastCalibrated: body.lastCalibrated,
          calibrationValidUntil: body.calibrationValidUntil,
          calibrationAgency: body.calibrationAgency,
          issueDescription: body.issueDescription,
          downtimeDuration: body.downtimeDuration,
          slaScore: body.slaScore !== undefined ? Number(body.slaScore) : undefined,
          olaScore: body.olaScore !== undefined ? Number(body.olaScore) : undefined,
        },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          table: 'master_alat',
          action: 'EDIT',
          recordId: updated.id,
          recordName: `${updated.name} (${updated.category})`,
          actor: body.actor || 'Admin INSKAL',
          details: body.details || `Pembaruan data master aloptama ${updated.name}.`,
        },
      });

      return res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updateDevice:', error);
      return res.status(500).json({ success: false, message: 'Gagal memperbarui data perangkat.' });
    }
  },

  // Delete device
  deleteDevice: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const device = await prisma.device.findUnique({ where: { id } });

      if (!device) {
        return res.status(404).json({ success: false, message: 'Perangkat tidak ditemukan.' });
      }

      await prisma.device.delete({ where: { id } });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          table: 'master_alat',
          action: 'HAPUS',
          recordId: id,
          recordName: device.name,
          actor: (req.body && req.body.actor) || 'Admin INSKAL',
          details: `Penghapusan data master aloptama ${device.name} (${device.category}).`,
        },
      });

      return res.json({ success: true, message: 'Perangkat berhasil dihapus.' });
    } catch (error) {
      console.error('Error deleteDevice:', error);
      return res.status(500).json({ success: false, message: 'Gagal menghapus data perangkat.' });
    }
  },
};
