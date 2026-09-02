import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    name: string;
    uptStation: string;
  };
}

// Nama cookie httpOnly tempat JWT disimpan sisi browser. httpOnly berarti
// JavaScript di browser (termasuk skrip jahat lewat XSS) TIDAK BISA membaca
// cookie ini sama sekali - beda dengan localStorage yang selalu bisa dibaca
// oleh kode JS apa pun yang berjalan di halaman.
export const JWT_COOKIE_NAME = 'simon_jwt';

/**
 * Parser cookie header manual & minimal (tanpa dependency tambahan).
 * Contoh input: "simon_jwt=abc.def.ghi; other=xyz"
 */
function parseCookieHeader(header: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      result[key] = decodeURIComponent(value);
    } catch {
      result[key] = value;
    }
  }
  return result;
}

function extractToken(req: Request): string | null {
  // 1. Prioritaskan cookie httpOnly (jalur utama untuk browser/SPA kita).
  const cookies = parseCookieHeader(req.headers.cookie);
  if (cookies[JWT_COOKIE_NAME]) return cookies[JWT_COOKIE_NAME];

  // 2. Fallback header "Authorization: Bearer <token>" - dipertahankan untuk
  //    klien non-browser (script internal, testing lewat curl/Postman, dll)
  //    yang tidak menyimpan cookie.
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1] || null;
  }

  return null;
}

/**
 * Memverifikasi JWT yang dikirim lewat cookie httpOnly "simon_jwt" (jalur utama)
 * atau header Authorization: Bearer <token> (fallback).
 * Menolak request dengan 401 jika token tidak ada / tidak valid / kedaluwarsa.
 */
export function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak. Token tidak ditemukan, silakan login kembali.',
    });
  }

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
 * Dipasang SETELAH verifyToken. Menolak request dengan 403 jika role user
 * BUKAN Admin Inskal maupun Super Admin. Dipakai untuk aksi yang masih
 * boleh dilakukan Admin Inskal: menyimpan data kalibrasi, mengelola
 * monitoring SLA/OLA harian.
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'ADMIN_INSKAL' && req.user.role !== 'SUPER_ADMIN')) {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Aksi ini hanya diizinkan untuk Admin Inskal atau Super Admin.',
    });
  }
  next();
}

/**
 * Dipasang SETELAH verifyToken. Menolak request dengan 403 jika role user
 * bukan SUPER_ADMIN. Dipakai untuk aksi paling sensitif yang TIDAK lagi
 * boleh dilakukan Admin Inskal sejak perluasan role Sept 2026: kelola
 * master stasiun, master alat, master petugas, kelola akun pengguna, dan
 * audit log aktivitas & perubahan sistem.
 */
export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Aksi ini hanya diizinkan untuk Super Admin.',
    });
  }
  next();
}