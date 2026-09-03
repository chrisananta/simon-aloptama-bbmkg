import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { parseDateOnly, formatDateOnly } from '../utils/dateUtils.js';

const gensetInput = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  jam: z.string().min(1),
  gedung: z.enum(['Operasional', 'Administrasi']),
  petugasList: z.array(z.string()).min(1, 'Minimal 1 petugas diisi'),
  checklistData: z.object({
    bahanBakar: z.record(z.string(), z.enum(['Baik', 'Buruk'])),
    pelumasan: z.record(z.string(), z.enum(['Baik', 'Buruk'])),
    pendinginan: z.record(z.string(), z.enum(['Baik', 'Buruk'])),
    baterai: z.record(z.string(), z.enum(['Baik', 'Buruk'])),
    pemanasan: z.record(z.string(), z.enum(['Baik', 'Buruk'])),
    ats: z.record(z.string(), z.enum(['Baik', 'Buruk'])),
  }).optional(),
  kesimpulan: z.string().min(1),
  catatan: z.string().optional().nullable(),
});

export const gensetController = {
  getAll: async (_req: AuthRequest, res: Response) => {
    try {
      const records = await prisma.gensetMonitoring.findMany({ orderBy: [{ tanggal: 'desc' }, { createdAt: 'desc' }] });
      const data = records.map(r => ({
        ...r,
        tanggal: formatDateOnly(r.tanggal),
        petugasList: typeof r.petugasList === 'string' ? JSON.parse(r.petugasList) : r.petugasList,
        checklistData: typeof r.checklistData === 'string' ? JSON.parse(r.checklistData) : r.checklistData,
      }));
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal mengambil data.' });
    }
  },

  create: async (req: AuthRequest, res: Response) => {
    const parsed = gensetInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Data tidak valid', errors: parsed.error.format() });
    try {
      const { tanggal, petugasList, ...rest } = parsed.data;
      const combinedPetugas = petugasList.join(', ');

      const created = await prisma.gensetMonitoring.create({
        data: {
          ...rest,
          tanggal: parseDateOnly(tanggal),
          petugasList,
          petugas: combinedPetugas,
        }
      });
      return res.status(201).json({
        success: true,
        data: {
          ...created,
          tanggal: formatDateOnly(created.tanggal),
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal menyimpan data.' });
    }
  },

  delete: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await prisma.gensetMonitoring.findUnique({ where: { id } });
      
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Data monitoring genset tidak ditemukan.' });
      }

      await prisma.gensetMonitoring.delete({ where: { id } });

      return res.json({
        success: true,
        message: 'Data monitoring genset berhasil dihapus.'
      });
    } catch (err) {
      console.error('Error delete genset:', err);
      return res.status(500).json({ success: false, message: 'Gagal menghapus data monitoring genset.' });
    }
  }
};