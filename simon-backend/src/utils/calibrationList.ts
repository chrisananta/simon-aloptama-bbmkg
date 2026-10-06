import { prisma } from '../db/prisma.js';

/**
 * Masukkan / keluarkan alat dari daftar yang tampil di halaman Kalibrasi.
 * Dipanggil SETELAH transaksi utama selesai dan tidak pernah melempar error,
 * supaya gangguan di daftar ini (mis. migration belum dijalankan) tidak
 * menggagalkan simpan kalibrasi atau edit master alat.
 */
export async function syncCalibrationListing(deviceId: string, listed: boolean, actor: string): Promise<void> {
  try {
    if (listed) {
      await prisma.calibrationListedDevice.upsert({
        where: { deviceId },
        update: {},
        create: { deviceId, listedBy: actor },
      });
    } else {
      await prisma.calibrationListedDevice.deleteMany({ where: { deviceId } });
    }
  } catch (error) {
    console.warn(`syncCalibrationListing(${deviceId}, ${listed}) gagal:`, error);
  }
}