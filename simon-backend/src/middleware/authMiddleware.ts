import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'simon_aloptama_bbmkg5_jwt_secret_key_2026';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    name: string;
  };
}

/**
 * Memverifikasi JWT yang dikirim lewat header: Authorization: Bearer <token>
 * Menolak request dengan 401 jika token tidak ada / tidak valid / kedaluwarsa.
 */
export function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak. Token tidak ditemukan, silakan login kembali.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthRequest['user'];
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.',
    });
  }
}

/**
 * Dipasang SETELAH verifyToken. Menolak request dengan 403 jika role user bukan ADMIN.
 * Dipakai untuk membatasi aksi sensitif (hapus data, kelola akun pengguna, dll).
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Aksi ini hanya diizinkan untuk Admin INSKAL.',
    });
  }
  next();
}
