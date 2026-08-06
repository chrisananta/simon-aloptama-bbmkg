/**
 * Validasi environment variable penting SEBELUM server nyala.
 * Kalau JWT_SECRET belum di-set, aplikasi SENGAJA dihentikan (bukan jalan diam-diam
 * pakai secret default) - ini mencegah production tanpa sadar pakai secret yang
 * sudah publik/gampang ditebak.
 *
 * File ini load .env sendiri (tidak bergantung urutan import file lain).
 */
import 'dotenv/config';

const rawSecret = process.env.JWT_SECRET;

if (!rawSecret || rawSecret.trim().length === 0) {
  console.error('\n❌ FATAL: Environment variable JWT_SECRET belum di-set.');
  console.error('   Tambahkan baris berikut ke file .env (root project DAN simon-backend/.env):');
  console.error('   JWT_SECRET="<random string panjang, minimal 32 karakter>"\n');
  console.error('   Generate random secret dengan perintah:');
  console.error('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n');
  process.exit(1);
}

if (rawSecret.length < 32) {
  console.warn('\n⚠️  PERINGATAN: JWT_SECRET kamu kurang dari 32 karakter, terlalu pendek/lemah.');
  console.warn('   Sebaiknya generate ulang yang lebih panjang & acak sebelum dipakai production.\n');
}

export const JWT_SECRET: string = rawSecret;
