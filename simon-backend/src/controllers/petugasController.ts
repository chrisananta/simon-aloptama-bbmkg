import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';

export const petugasController = {
  getAll: async (req: Request, res: Response) => {
    try {
      // Auto-seed 3 petugas default HANYA kalau tabel benar-benar kosong,
      // dan HANYA sekali (bukan tiap request) - beda dari bug sebelumnya
      // yang nyimpen di variabel memori dan reset tiap server restart.
      const count = await prisma.petugas.count();
      if (count === 0) {
        await prisma.petugas.createMany({
          data: [
            { name: 'Asrul Sani Arifin, S.Tr', nip: '19950312 201801 1 001', jabatan: 'Staf Inskal & Kalibrasi' },
            { name: 'M. Rizky R, S.Tr', nip: '19960724 201902 1 002', jabatan: 'Staf Operasional Aloptama' },
            { name: 'Fajar Nur, M.T.', nip: '19850412 201012 1 001', jabatan: 'Admin INSKAL BMKG V' },
          ],
        });
      }

      const petugasList = await prisma.petugas.findMany({ orderBy: { name: 'asc' } });
      return res.json({ success: true, data: petugasList });
    } catch (err) {
      console.error('Gagal mengambil data petugas:', err);
      return res.status(500).json({ success: false, message: 'Gagal mengambil data petugas dari database.' });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { name, nip, jabatan } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, message: 'Nama petugas wajib diisi.' });
      }
      const newItem = await prisma.petugas.create({
        data: { name, nip: nip || null, jabatan: jabatan || null },
      });
      const list = await prisma.petugas.findMany({ orderBy: { name: 'asc' } });
      return res.status(201).json({ success: true, data: newItem, list });
    } catch (err) {
      console.error('Gagal menambah petugas:', err);
      return res.status(500).json({ success: false, message: 'Gagal menyimpan data petugas ke database.' });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, nip, jabatan } = req.body;

      const existing = await prisma.petugas.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Petugas tidak ditemukan.' });
      }

      const updated = await prisma.petugas.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(nip !== undefined ? { nip } : {}),
          ...(jabatan !== undefined ? { jabatan } : {}),
        },
      });
      const list = await prisma.petugas.findMany({ orderBy: { name: 'asc' } });
      return res.json({ success: true, data: updated, list });
    } catch (err) {
      console.error('Gagal memperbarui petugas:', err);
      return res.status(500).json({ success: false, message: 'Gagal memperbarui data petugas.' });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await prisma.petugas.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Petugas tidak ditemukan.' });
      }
      await prisma.petugas.delete({ where: { id } });
      const list = await prisma.petugas.findMany({ orderBy: { name: 'asc' } });
      return res.json({ success: true, list });
    } catch (err) {
      console.error('Gagal menghapus petugas:', err);
      return res.status(500).json({ success: false, message: 'Gagal menghapus data petugas.' });
    }
  },
};
