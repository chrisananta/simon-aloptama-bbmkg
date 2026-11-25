import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { parseDateOnly, formatDateOnly } from '../utils/dateUtils.js';

const perbaikanSchema = z.object({
  formType: z.enum(['FORM_1_1', 'FORM_1_2']),
  jenisLaporan: z.array(z.string()).min(1),
  namaAlat: z.string().min(1),
  merk: z.string().min(1),
  typeSn: z.string().min(1),
  lokasiAlat: z.string().min(1),
  jenisPeralatan: z.string().min(1),
  kategoriPeralatan: z.string().optional().nullable(),
  akarPenyebab: z.string().min(1),
  analisisKerusakan: z.string().optional().nullable(),
  rekomendasi: z.string().min(1),
  kondisiAlat: z.string().min(1),
  kondisiOtherDetail: z.string().optional().nullable(),
  persentaseFungsi: z.number().min(0).max(100),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  teknisiList: z.array(z.string()).min(1),
  fotoLampiran: z.array(z.string()).optional(),
});

export const perbaikanController = {
  getAll: async (_req: AuthRequest, res: Response) => {
    try {
      const records = await prisma.perbaikanInstalasi.findMany({
        orderBy: [{ tanggal: 'desc' }, { createdAt: 'desc' }]
      });
      const data = records.map((r: any) => ({
        ...r,
        tanggal: formatDateOnly(r.tanggal),
        jenisLaporan: typeof r.jenisLaporan === 'string' ? JSON.parse(r.jenisLaporan) : r.jenisLaporan,
        teknisiList: typeof r.teknisiList === 'string' ? JSON.parse(r.teknisiList) : r.teknisiList,
        fotoLampiran: typeof r.fotoLampiran === 'string' ? JSON.parse(r.fotoLampiran) : r.fotoLampiran,
      }));
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal mengambil data perbaikan.' });
    }
  },
  create: async (req: AuthRequest, res: Response) => {
    const parsed = perbaikanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Data laporan perbaikan tidak valid.',
        errors: z.flattenError(parsed.error).fieldErrors,
      });
    }
    try {
      const { tanggal, ...rest } = parsed.data;
      // Simpan data + audit log dalam SATU transaksi: kalau salah satu gagal,
      // keduanya dibatalkan, jadi tidak ada data tanpa jejak audit.
      const created = await prisma.$transaction(async (tx) => {
        const row = await tx.perbaikanInstalasi.create({
          data: {
            ...rest,
            tanggal: parseDateOnly(tanggal),
          }
        });
        await tx.auditLog.create({
          data: {
            table: 'perbaikan',
            action: 'TAMBAH',
            recordId: row.id,
            recordName: `${row.namaAlat} - ${row.lokasiAlat}`.slice(0, 300),
            actor: req.user?.name || 'System',
            details: `Penambahan laporan perbaikan (${row.formType}) untuk alat \"${row.namaAlat}\" di ${row.lokasiAlat}, tanggal ${tanggal}.`,
            ipOrSource: req.ip || 'SIMON API',
          },
        });
        return row;
      });
      return res.status(201).json({
        success: true,
        data: {
          ...created,
          tanggal: formatDateOnly(created.tanggal),
        }
      });
    } catch (err) {
      console.error('Gagal menyimpan data perbaikan:', err);
      return res.status(500).json({ success: false, message: 'Gagal menyimpan data perbaikan.' });
    }
  },
  delete: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await prisma.perbaikanInstalasi.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Data perbaikan tidak ditemukan.' });
      }
      await prisma.$transaction(async (tx) => {
        await tx.perbaikanInstalasi.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            table: 'perbaikan',
            action: 'HAPUS',
            recordId: existing.id,
            recordName: `${existing.namaAlat} - ${existing.lokasiAlat}`.slice(0, 300),
            actor: req.user?.name || 'System',
            details: `Penghapusan laporan perbaikan (${existing.formType}) untuk alat \"${existing.namaAlat}\" di ${existing.lokasiAlat}.`,
            ipOrSource: req.ip || 'SIMON API',
          },
        });
      });
      return res.json({ success: true, message: 'Data perbaikan berhasil dihapus.' });
    } catch (err) {
      console.error('Gagal menghapus data perbaikan:', err);
      return res.status(500).json({ success: false, message: 'Gagal menghapus data perbaikan.' });
    }
  }
};