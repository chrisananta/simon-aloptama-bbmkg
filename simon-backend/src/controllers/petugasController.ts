import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';

export const petugasController = {
  // Mengambil seluruh data petugas
  getAll: async (req: Request, res: Response) => {
    try {
      const data = await prisma.petugas.findMany({
        orderBy: {
          id: 'asc',
        },
      });

      return res.status(200).json({
        success: true,
        data: data,
      });
    } catch (error) {
      console.error('Error fetching petugas:', error);
      return res.status(500).json({
        success: false,
        message: 'Gagal mengambil data petugas',
      });
    }
  },

  // Menambah petugas baru
  create: async (req: Request, res: Response) => {
    try {
      const { name, nip, jabatan } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, message: 'Nama petugas wajib diisi.' });
      }
      const newItem = await prisma.petugas.create({
        data: { name, nip: nip || null, jabatan: jabatan || null },
      });
      const list = await prisma.petugas.findMany({ orderBy: { id: 'asc' } });
      return res.status(201).json({ success: true, data: newItem, list });
    } catch (err) {
      console.error('Gagal menambah petugas:', err);
      return res.status(500).json({ success: false, message: 'Gagal menyimpan data petugas ke database.' });
    }
  },

  // Mengubah data petugas
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
      const list = await prisma.petugas.findMany({ orderBy: { id: 'asc' } });
      return res.json({ success: true, data: updated, list });
    } catch (err) {
      console.error('Gagal memperbarui petugas:', err);
      return res.status(500).json({ success: false, message: 'Gagal memperbarui data petugas.' });
    }
  },

  // Menghapus petugas
  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await prisma.petugas.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Petugas tidak ditemukan.' });
      }
      await prisma.petugas.delete({ where: { id } });
      const list = await prisma.petugas.findMany({ orderBy: { id: 'asc' } });
      return res.json({ success: true, list });
    } catch (err) {
      console.error('Gagal menghapus petugas:', err);
      return res.status(500).json({ success: false, message: 'Gagal menghapus data petugas.' });
    }
  },
};
