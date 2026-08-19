import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

// Fungsi bantuan untuk mengambil nama aktor dari token JWT
const actorName = (req: AuthRequest): string => req.user?.name || 'System';

const petugasInput = z.object({
  name: z.string().trim().min(1, 'Nama petugas wajib diisi').max(150),
  nip: z.string().trim().max(50).nullable().optional(),
  jabatan: z.string().trim().max(150).nullable().optional(),
});
const petugasUpdate = petugasInput.partial();

function invalidPetugas(res: Response, error: z.ZodError) {
  return res.status(400).json({ success: false, message: 'Data petugas tidak valid.', errors: z.flattenError(error).fieldErrors });
}

export const petugasController = {
  /**
   * Mengambil seluruh data petugas dari database master.
   */
  getAll: async (_req: AuthRequest, res: Response) => {
    try {
      const data = await prisma.petugas.findMany({
        orderBy: {
          id: 'asc',
        },
      });

      return res.status(200).json({
        success: true,
        count: data.length,
        data: data,
      });
    } catch (error) {
      console.error('Error fetching petugas:', error);
      return res.status(500).json({
        success: false,
        message: 'Gagal mengambil data petugas dari database.',
      });
    }
  },

  /**
   * Menambah data petugas baru (Khusus Admin) + Pencatatan Audit Log.
   */
  create: async (req: AuthRequest, res: Response) => {
    const parsed = petugasInput.safeParse(req.body);
    if (!parsed.success) return invalidPetugas(res, parsed.error);
    try {
      const { name, nip, jabatan } = parsed.data;

      const cleanName = name;
      const cleanNip = nip || null;
      const cleanJabatan = jabatan || null;

      // TRANSAKSI ATOMIK: Buat Petugas + Catat Audit Log
      const newItem = await prisma.$transaction(async (tx) => {
        const created = await tx.petugas.create({
          data: {
            name: cleanName,
            nip: cleanNip,
            jabatan: cleanJabatan,
          },
        });

        await tx.auditLog.create({
          data: {
            table: 'master_petugas',
            action: 'TAMBAH',
            recordId: created.id,
            recordName: created.name,
            actor: actorName(req),
            details: `Penambahan petugas baru: "${created.name}"${created.jabatan ? ` (${created.jabatan})` : ''}.`,
          },
        });

        return created;
      });

      const list = await prisma.petugas.findMany({ orderBy: { id: 'asc' } });

      return res.status(201).json({
        success: true,
        message: 'Data petugas berhasil ditambahkan.',
        data: newItem,
        list,
      });
    } catch (err) {
      console.error('Gagal menambah petugas:', err);
      return res.status(500).json({
        success: false,
        message: 'Gagal menyimpan data petugas ke database.',
      });
    }
  },

  /**
   * Memperbarui data petugas (Khusus Admin) + Pencatatan Audit Log.
   */
  update: async (req: AuthRequest, res: Response) => {
    const parsed = petugasUpdate.safeParse(req.body);
    if (!parsed.success) return invalidPetugas(res, parsed.error);
    try {
      const { id } = req.params;
      const { name, nip, jabatan } = parsed.data;

      const existing = await prisma.petugas.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Data petugas tidak ditemukan.',
        });
      }

      const updateData: { name?: string; nip?: string | null; jabatan?: string | null } = {};
      if (name !== undefined) updateData.name = name;
      if (nip !== undefined) updateData.nip = nip || null;
      if (jabatan !== undefined) updateData.jabatan = jabatan || null;

      // TRANSAKSI ATOMIK: Update Petugas + Catat Audit Log
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.petugas.update({
          where: { id },
          data: updateData,
        });

        await tx.auditLog.create({
          data: {
            table: 'master_petugas',
            action: 'EDIT',
            recordId: result.id,
            recordName: result.name,
            actor: actorName(req),
            details: `Pembaruan data petugas "${existing.name}" menjadi "${result.name}".`,
          },
        });

        return result;
      });

      const list = await prisma.petugas.findMany({ orderBy: { id: 'asc' } });

      return res.json({
        success: true,
        message: 'Data petugas berhasil diperbarui.',
        data: updated,
        list,
      });
    } catch (err) {
      console.error('Gagal memperbarui petugas:', err);
      return res.status(500).json({
        success: false,
        message: 'Gagal memperbarui data petugas di database.',
      });
    }
  },

  /**
   * Menghapus data petugas (Khusus Admin) + Pencatatan Audit Log.
   */
  delete: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await prisma.petugas.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Data petugas tidak ditemukan.',
        });
      }

      // TRANSAKSI ATOMIK: Hapus Petugas + Catat Audit Log
      await prisma.$transaction(async (tx) => {
        await tx.petugas.delete({ where: { id } });

        await tx.auditLog.create({
          data: {
            table: 'master_petugas',
            action: 'HAPUS',
            recordId: existing.id,
            recordName: existing.name,
            actor: actorName(req),
            details: `Penghapusan data petugas "${existing.name}" (${existing.jabatan || 'Tanpa Jabatan'}) dari master data.`,
          },
        });
      });

      const list = await prisma.petugas.findMany({ orderBy: { id: 'asc' } });

      return res.json({
        success: true,
        message: 'Data petugas berhasil dihapus.',
        list,
      });
    } catch (err) {
      console.error('Gagal menghapus petugas:', err);
      return res.status(500).json({
        success: false,
        message: 'Gagal menghapus data petugas dari database.',
      });
    }
  },
};
