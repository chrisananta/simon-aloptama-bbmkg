import rateLimit from 'express-rate-limit';

/**
 * Batasi percobaan login: maksimal 10 percobaan per 15 menit, per alamat IP.
 * Mencegah brute-force menebak password lewat script otomatis.
 *
 * Login yang BERHASIL tidak dihitung ke kuota (skipSuccessfulRequests),
 * jadi user yang bener nggak akan pernah kena limit ini secara normal -
 * cuma percobaan yang GAGAL yang dihitung.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login gagal. Silakan coba lagi dalam beberapa menit.',
  },
});
