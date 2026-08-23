import { z } from 'zod';
import { getTodayIsoWIT, getIsoDaysAgoWIT } from '../utils/dateUtils';

// Batas maksimal mundur untuk pengisian SLA/OLA susulan (harus sinkron
// dengan MAX_BACKDATE_DAYS di simon-backend/src/controllers/slaOlaController.ts).
export const SLA_OLA_MAX_BACKDATE_DAYS = 10;

export const slaOlaSchema = z.object({
  uptStation: z.string().min(1, 'Stasiun UPT wajib dipilih'),
  category: z.string().min(1, 'Jenis peralatan wajib dipilih'),
  deviceId: z.string().min(1, 'Peralatan spesifik wajib dipilih'),
  kondisiSla: z.boolean(),
  kondisiOla: z.number().min(0, 'Kondisi OLA minimal 0%').max(100, 'Kondisi OLA maksimal 100%'),
  kendala: z.string().optional(),
  tanggal: z.string().min(1, 'Tanggal laporan wajib dipilih'),
}).superRefine((data, ctx) => {
  const isOffOrSub100 = !data.kondisiSla || data.kondisiOla < 100;
  if (isOffOrSub100 && (!data.kendala || !data.kendala.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Kendala operasional / catatan wajib diisi jika alat OFF atau OLA < 100%',
      path: ['kendala'],
    });
  }

  const todayIso = getTodayIsoWIT();
  const minIso = getIsoDaysAgoWIT(SLA_OLA_MAX_BACKDATE_DAYS);
  if (data.tanggal > todayIso) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Tanggal laporan tidak boleh di masa depan.',
      path: ['tanggal'],
    });
  } else if (data.tanggal < minIso) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Tanggal laporan hanya boleh mundur maksimal ${SLA_OLA_MAX_BACKDATE_DAYS} hari.`,
      path: ['tanggal'],
    });
  }
});

export type SlaOlaFormData = z.infer<typeof slaOlaSchema>;

export const calibrationSchema = z.object({
  deviceId: z.string().min(1, 'Peralatan wajib dipilih'),
  deviceName: z.string().min(1, 'Nama peralatan wajib terisi'),
  category: z.string().min(1, 'Kategori peralatan wajib terisi'),
  uptStation: z.string().min(1, 'Stasiun UPT wajib terisi'),
  lastCalibrated: z.string().min(1, 'Tanggal kalibrasi wajib diisi'),
  calibrationValidUntil: z.string().min(1, 'Masa berlaku kalibrasi wajib diisi'),
  calibrationStatus: z.enum(['VALID', 'SEGERA_DIKALIBRASI', 'KADALUWARSA']),
  calibrationAgency: z.string().min(1, 'Tim / Instansi kalibrasi wajib diisi'),
  notes: z.string().optional(),
  yearCreated: z.string().min(1, 'Tahun kalibrasi wajib terisi'),
});

export type CalibrationFormData = z.infer<typeof calibrationSchema>;

export const stationSchema = z.object({
  code: z.string().min(2, 'Kode stasiun minimal 2 karakter'),
  name: z.string().min(3, 'Nama stasiun minimal 3 karakter'),
  province: z.string().min(2, 'Provinsi wajib diisi'),
  location: z.string().min(2, 'Lokasi / kota wajib diisi'),
  regionGroup: z.string().min(1, 'Kelompok wilayah UPT wajib dipilih'),
});

export type StationFormData = z.infer<typeof stationSchema>;

export const deviceSchema = z.object({
  id: z.string().min(3, 'ID Peralatan minimal 3 karakter'),
  name: z.string().min(3, 'Nama peralatan minimal 3 karakter'),
  category: z.string().min(1, 'Kategori peralatan wajib dipilih'),
  uptStation: z.string().min(1, 'Stasiun UPT tempat alat berada wajib dipilih'),
  conditionStatus: z.enum(['NORMAL', 'GANGGUAN', 'MATI']),
  slaScore: z.number().min(0).max(100).optional(),
  olaScore: z.number().min(0).max(100).optional(),
  lastCalibrated: z.string().optional(),
  calibrationValidUntil: z.string().optional(),
  calibrationStatus: z.enum(['VALID', 'SEGERA_DIKALIBRASI', 'KADALUWARSA']).optional(),
  calibrationAgency: z.string().optional(),
  issueDescription: z.string().optional(),
});

export type DeviceFormData = z.infer<typeof deviceSchema>;
