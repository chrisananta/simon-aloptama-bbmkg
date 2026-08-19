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

/**
 * Daftar origin frontend yang diizinkan mengakses API ini (CORS whitelist).
 * Diisi lewat env var CORS_ORIGIN, dipisah koma kalau lebih dari satu, mis:
 *   CORS_ORIGIN="https://simon.bbmkg5.go.id,https://simon-staging.bbmkg5.go.id"
 *
 * Kalau belum di-set:
 * - development: fallback ke localhost supaya tidak menghalangi `npm run dev`.
 * - production: TIDAK ada fallback diam-diam ke "izinkan semua origin" (itu yang
 *   mau kita hindari) - server tetap nyala tapi CORS menolak semua origin browser
 *   sampai env var ini diisi eksplisit.
 */
const rawCorsOrigin = process.env.CORS_ORIGIN;
const isProduction = process.env.NODE_ENV === 'production';

export const CORS_ORIGINS: string[] = rawCorsOrigin
  ? rawCorsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
  : isProduction
    ? []
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

if (isProduction && CORS_ORIGINS.length === 0) {
  console.warn('\n⚠️  PERINGATAN: CORS_ORIGIN belum di-set di production.');
  console.warn('   Semua request lintas-origin dari browser akan DITOLAK sampai env var ini diisi.');
  console.warn('   Tambahkan: CORS_ORIGIN="https://domain-frontend-anda"\n');
}
