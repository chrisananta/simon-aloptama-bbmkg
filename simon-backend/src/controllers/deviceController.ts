import { Response } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AuthRequest, canAccessStation } from '../middleware/authMiddleware.js';
import { parseDateOnly, formatDateOnly, serializeDeviceDates, NOT_CALIBRATED_DATE } from '../utils/dateUtils.js';
import { syncCalibrationListing } from '../utils/calibrationList.js';
import { loadLatestReportSnapshot } from '../utils/latestSlaOlaReport.js';

const dateOnlyString = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal wajib "YYYY-MM-DD".');

const deviceInput = z.object({
  devicesId: z.string().trim().min(1).max(64).optional(),
  id: z.string().trim().min(1).max(64).optional(), // Alias kompatibilitas
  site: z.string().trim().min(1).max(200).optional(),
  name: z.string().trim().min(1).max(200).optional(), // Alias kompatibilitas
  category: z.string().trim().min(1).max(100),
  merk: z.string().trim().max(100).nullable().optional(),
  subCategory: z.string().trim().max(100).nullable().optional(), // Alias kompatibilitas
  stationId: z.string().trim().min(1).max(64), // upt_stations.id
  picKalibrasi: z.string().trim().max(200).optional(),
  locationName: z.string().trim().max(200).optional(),
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
  conditionStatus: z.enum(['NORMAL', 'GANGGUAN', 'MATI']).optional(),
  calibrationStatus: z.enum(['VALID', 'SEGERA_DIKALIBRASI', 'KADALUWARSA', 'TIDAK_DIKALIBRASI']).optional(),
  lastCalibrated: dateOnlyString.nullable().optional(),
  calibrationValidUntil: dateOnlyString.nullable().optional(),
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
  if (code === 'P2003') return res.status(400).json({ success: false, message: 'Stasiun UPT tidak ditemukan. Pilih stasiun yang terdaftar.' });
  return res.status(500).json({ success: false, message: fallback });
}

const serializeDevice = serializeDeviceDates;

/** Nilai PIC Kalibrasi untuk alat yang memang tidak dikalibrasi (mis. sirene). */
const PIC_TIDAK_DIKALIBRASI = 'Tidak Dikalibrasi';

/**
 * Alat dianggap "tidak dikalibrasi" berdasarkan PIC Kalibrasi (sumber kebenaran).
 * Status hanya dipakai kalau PIC tidak dikirim di request.
 */
function isNotCalibrated(pic?: string | null, status?: string | null): boolean {
  const p = (pic || '').trim();
  if (p) return p.toLowerCase() === PIC_TIDAK_DIKALIBRASI.toLowerCase();
  return status === 'TIDAK_DIKALIBRASI';
}

export const deviceController = {
  getAllDevices: async (_req: AuthRequest, res: Response) => {
    try {
      // Tanggal & kondisi TERAKHIR tiap alat diambil dari tabel sla_ola_logs (sumber kebenaran),
      // bukan dari kolom devices.lastReportedDate / conditionStatus yang bisa tertinggal
      // (mis. data hasil import). Peta dan hitungan Dashboard mengikuti data pengisian terakhir.
      // Alat yang belum punya log pengisian tetap memakai nilai tersimpannya.
      const [devices, latest] = await Promise.all([
        prisma.device.findMany({ orderBy: { site: 'asc' } }),
        loadLatestReportSnapshot(),
      ]);
      const serialized = devices.map((d) =>
        serializeDevice({
          ...d,
          lastReportedDate: latest.reportDates.get(d.devicesId) ?? null,
          conditionStatus: latest.conditions.get(d.devicesId) ?? d.conditionStatus,
        })
      );
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
      const station = await prisma.uptStation.findUnique({ where: { id: body.stationId } });
      if (!station) return res.status(400).json({ success: false, message: 'Stasiun UPT tidak ditemukan. Buat atau pilih stasiun yang terdaftar.' });

      const today = new Date().toISOString().slice(0, 10);
      const devicesId = body.devicesId || body.id || `ALT-${randomUUID()}`;
      const site = body.site || body.name || '';
      const merk = body.merk !== undefined ? body.merk : (body.subCategory || null);
      const notCalibrated = isNotCalibrated(body.picKalibrasi, body.calibrationStatus);
      const timkalibrasi = notCalibrated
        ? PIC_TIDAK_DIKALIBRASI
        : body.timkalibrasi || body.calibrationAgency || 'INSKAL BBMKG V';

      const newDevice = await prisma.$transaction(async (tx) => {
        const created = await tx.device.create({
          data: {
            devicesId,
            site,
            category: body.category,
            merk,
            picKalibrasi: notCalibrated ? PIC_TIDAK_DIKALIBRASI : body.picKalibrasi || 'Balai',
            locationName: body.locationName || station.name,
            latitude: body.latitude,
            longitude: body.longitude,
            conditionStatus: body.conditionStatus || 'NORMAL',
            calibrationStatus: notCalibrated ? 'TIDAK_DIKALIBRASI' : body.calibrationStatus || 'VALID',
            lastCalibrated: notCalibrated ? parseDateOnly(NOT_CALIBRATED_DATE) : parseDateOnly(body.lastCalibrated || today),
            calibrationValidUntil: notCalibrated ? parseDateOnly(NOT_CALIBRATED_DATE) : parseDateOnly(body.calibrationValidUntil || today),
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
            details: `Penambahan unit aloptama baru di Stasiun ${station.name}.`
          }
        });
        return created;
      });
      // Alat baru yang dikalibrasi langsung tampil di halaman Kalibrasi.
      if (!notCalibrated) await syncCalibrationListing(newDevice.devicesId, true, actorName(req));
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
      let body = parsed.data;

      // Teknisi UPT: hanya boleh mengedit alat milik UPT-nya sendiri, dan hanya
      // field master deskriptif. ID alat tidak pernah bisa diubah (param :id
      // dipakai apa adanya, devicesId/id sudah di-omit dari skema update).
      // Boleh juga: status kalibrasi & tanggal terakhir kalibrasi.
      // Stasiun UPT (stationId), masa berlaku sertifikat, status kondisi, dan skor SLA/OLA
      // dibuang dari payload sehingga tidak bisa diubah lewat API sekalipun UI dilewati.
      if (req.user?.role === 'TEKNISI_UPT') {
        const existing = await prisma.device.findUnique({ where: { devicesId: req.params.id } });
        if (!existing) return res.status(404).json({ success: false, message: 'Perangkat tidak ditemukan.' });
        if (!canAccessStation(req.user, existing.stationId)) {
          return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Anda hanya dapat mengedit alat milik UPT Anda sendiri.',
          });
        }
        body = {
          site: body.site,
          name: body.name,
          category: body.category,
          merk: body.merk,
          subCategory: body.subCategory,
          picKalibrasi: body.picKalibrasi,
          timkalibrasi: body.timkalibrasi,
          calibrationAgency: body.calibrationAgency,
          locationName: body.locationName,
          latitude: body.latitude,
          longitude: body.longitude,
          calibrationStatus: body.calibrationStatus,
          lastCalibrated: body.lastCalibrated,
        };
      }
      const site = body.site !== undefined ? body.site : body.name;
      const merk = body.merk !== undefined ? body.merk : body.subCategory;
      let timkalibrasi = body.timkalibrasi !== undefined ? body.timkalibrasi : body.calibrationAgency;

      // Alat ditandai "tidak dikalibrasi": paksa status konsisten & kosongkan tanggal.
      const markNotCalibrated = isNotCalibrated(body.picKalibrasi, body.calibrationStatus);
      if (!markNotCalibrated && body.calibrationStatus === 'TIDAK_DIKALIBRASI') {
        return res.status(400).json({
          success: false,
          message: 'Status "Tidak Dikalibrasi" tidak cocok dengan PIC Kalibrasi Balai/Pusat. Pilih status kalibrasi yang sesuai.',
        });
      }
      if (markNotCalibrated) {
        body = {
          ...body,
          picKalibrasi: PIC_TIDAK_DIKALIBRASI,
          calibrationStatus: 'TIDAK_DIKALIBRASI',
          lastCalibrated: null,
          calibrationValidUntil: null,
        };
        timkalibrasi = PIC_TIDAK_DIKALIBRASI;
      }

      const updated = await prisma.$transaction(async (tx) => {
        const device = await tx.device.update({
          where: { devicesId: req.params.id },
          data: {
            site: site !== undefined ? site : undefined,
            category: body.category,
            merk: merk !== undefined ? merk : undefined,
            picKalibrasi: body.picKalibrasi,
            locationName: body.locationName,
            latitude: body.latitude,
            longitude: body.longitude,
            conditionStatus: body.conditionStatus,
            calibrationStatus: body.calibrationStatus,
            // null = alat tidak dikalibrasi (disimpan sebagai tanggal penanda NOT_CALIBRATED_DATE); undefined = tidak diubah
            lastCalibrated: body.lastCalibrated === null ? parseDateOnly(NOT_CALIBRATED_DATE) : body.lastCalibrated ? parseDateOnly(body.lastCalibrated) : undefined,
            calibrationValidUntil: body.calibrationValidUntil === null ? parseDateOnly(NOT_CALIBRATED_DATE) : body.calibrationValidUntil ? parseDateOnly(body.calibrationValidUntil) : undefined,
            timkalibrasi: timkalibrasi !== undefined ? timkalibrasi : undefined,
            issueDescription: body.issueDescription,
            downtimeDuration: body.downtimeDuration,
            slaScore: body.slaScore,
            olaScore: body.olaScore,
            stationId: body.stationId, // undefined = tidak diubah; FK menolak ID yang tidak ada (P2003)
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
      // Sinkronkan daftar halaman Kalibrasi: alat tidak dikalibrasi dikeluarkan; alat yang
      // data kalibrasinya diperbarui dari Master Alat dimasukkan ke daftar.
      const touchesCalibration = [
        body.picKalibrasi, body.calibrationStatus, body.lastCalibrated, body.calibrationValidUntil, timkalibrasi,
      ].some((v) => v !== undefined);
      if (isNotCalibrated(updated.picKalibrasi, updated.calibrationStatus)) {
        await syncCalibrationListing(updated.devicesId, false, actorName(req));
      } else if (touchesCalibration) {
        await syncCalibrationListing(updated.devicesId, true, actorName(req));
      }
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
      await syncCalibrationListing(device.devicesId, false, actorName(req));
      return res.json({ success: true, message: 'Perangkat berhasil dihapus.' });
    } catch (error) {
      console.error('Error deleteDevice:', error);
      return databaseError(res, error, 'Gagal menghapus data perangkat.');
    }
  },
};