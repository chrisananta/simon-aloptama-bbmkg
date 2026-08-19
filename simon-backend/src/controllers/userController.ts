import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { JWT_SECRET } from '../config/env.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

// Angka "cost factor" bcrypt - makin tinggi makin aman tapi makin lambat.
// 10-12 adalah standar umum yang seimbang antara aman & cepat.
const SALT_ROUNDS = 10;

// Password acak & aman, dipakai kalau admin tidak mengisi password saat
// membuat akun baru (menggantikan default lama "bmkg123" yang gampang ditebak).
function generateRandomPassword(): string {
  return crypto.randomBytes(9).toString('base64url'); // ~12 karakter acak
}

// Bcrypt hash SELALU diawali "$2a$", "$2b$", atau "$2y$".
// Dipakai untuk membedakan: ini sudah hash bcrypt, atau masih teks polos peninggalan lama?
function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$/.test(value);
}

function actorName(req: AuthRequest): string {
  return req.user?.name || 'System';
}

function isUniqueConstraint(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

// Catatan: client HANYA boleh mengirim password mentah (plaintext), tidak pernah
// hash siap pakai. Sebelumnya endpoint ini juga menerima field "passwordHash" dari
// body lalu tetap di-bcrypt.hash() ulang - artinya nilai itu di-hash dua kali dan jadi
// tidak pernah bisa dipakai untuk login. Sekarang field itu dihapus total dari kontrak API.
const loginInput = z.object({
  username: z.string().trim().min(1, 'Username wajib diisi').max(100),
  password: z.string().min(1, 'Kata sandi wajib diisi').max(200),
});

const createUserInput = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username minimal 3 karakter')
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya boleh huruf, angka, titik, garis bawah, atau strip'),
  name: z.string().trim().min(3, 'Nama minimal 3 karakter').max(150),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(200).optional(),
  role: z.enum(['ADMIN', 'UPT_PIMPINAN']).optional(),
  title: z.string().trim().max(150).optional(),
  nip: z.string().trim().max(50).nullable().optional(),
  email: z.string().trim().email('Format email tidak valid').max(150).nullable().optional().or(z.literal('')),
  uptStation: z.string().trim().max(200).optional(),
  avatarUrl: z.string().trim().url('URL avatar tidak valid').max(500).nullable().optional().or(z.literal('')),
});

const updateUserInput = createUserInput.partial().extend({
  details: z.string().trim().max(500).optional(),
});

function invalidUser(res: Response, error: z.ZodError) {
  return res.status(400).json({ success: false, message: 'Data akun tidak valid.', errors: z.flattenError(error).fieldErrors });
}

export const userController = {
  // Login endpoint
  login: async (req: Request, res: Response) => {
    try {
      const parsed = loginInput.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: 'Username dan kata sandi wajib diisi.' });
      }
      const username = parsed.data.username.toLowerCase();
      const password = parsed.data.password;

      let user = null;
      try {
        user = await prisma.user.findUnique({
          where: { username },
        });
      } catch (dbErr) {
        console.warn('PostgreSQL login query connection note:', (dbErr as any)?.message || dbErr);
      }

      if (!user) {
        return res.status(401).json({ success: false, message: 'Username atau kata sandi tidak valid.' });
      }

      // Akun tanpa password tidak boleh bisa login. Admin harus melakukan reset password.
      if (!user.passwordHash) {
        return res.status(403).json({ success: false, message: 'Akun belum memiliki kata sandi. Hubungi administrator.' });
      }

      // Check password. Data lama teks polos dimigrasikan setelah autentikasi berhasil.
      if (user.passwordHash) {
        if (isBcryptHash(user.passwordHash)) {
          // Kasus normal: hash bcrypt asli, bandingkan pakai bcrypt.compare
          const isMatch = await bcrypt.compare(password, user.passwordHash);
          if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Kata sandi salah. Silakan periksa kembali kata sandi Anda.' });
          }
        } else {
          // Kasus migrasi: data lama masih teks polos (peninggalan sebelum bcrypt dipasang).
          // Bandingkan apa adanya dulu; kalau cocok, langsung hash & simpan ulang
          // supaya login berikutnya sudah aman pakai bcrypt.
          if (user.passwordHash !== password) {
            return res.status(401).json({ success: false, message: 'Kata sandi salah. Silakan periksa kembali kata sandi Anda.' });
          }
          try {
            const newHash = await bcrypt.hash(password, SALT_ROUNDS);
            await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash: newHash },
            });
            console.log(`Password milik "${user.username}" berhasil dimigrasi ke bcrypt.`);
          } catch (err) {
            console.warn('Gagal migrasi passwordHash ke bcrypt:', err);
          }
        }
      }

      // Generate JWT Token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, name: user.name, uptStation: user.uptStation },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Audit Log
      try {
        await prisma.auditLog.create({
          data: {
            table: 'autentikasi',
            action: 'LOGIN',
            recordId: user.id,
            recordName: `${user.name} (@${user.username})`,
            actor: user.name,
            details: `Login berhasil ke sistem SIMON Aloptama. Role: ${user.role}.`,
          },
        });
      } catch (e) {
        // Safe skip audit log if DB unreachable
      }

      return res.json({
        success: true,
        message: 'Login berhasil.',
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          title: user.title,
          nip: user.nip,
          email: user.email,
          uptStation: user.uptStation,
          avatarUrl: user.avatarUrl,
        },
      });
    } catch (error) {
      console.error('Error login:', error);
      return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server saat autentikasi.' });
    }
  },

  // Get all users
  getAllUsers: async (req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          title: true,
          nip: true,
          email: true,
          uptStation: true,
          avatarUrl: true,
          createdAt: true,
        },
      });
      return res.json({ success: true, count: users.length, data: users });
    } catch (error) {
      console.error('getAllUsers PostgreSQL error:', (error as any)?.message || error);
          return res.status(500).json({ success: false, message: 'Gagal mengambil data akun dari database PostgreSQL.' });
    }
  },     
  // Create user
  createUser: async (req: AuthRequest, res: Response) => {
    const parsed = createUserInput.safeParse(req.body);
    if (!parsed.success) return invalidUser(res, parsed.error);
    try {
      const body = parsed.data;
      // Client hanya boleh kirim password mentah (plaintext). Kalau kosong,
      // sistem yang generate password acak - bukan client yang kirim hash siap pakai.
      const generatedPassword = body.password ? null : generateRandomPassword();
      const rawPassword = body.password || generatedPassword!;
      const hashedPassword = await bcrypt.hash(rawPassword, SALT_ROUNDS);

      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            username: body.username.toLowerCase(),
            passwordHash: hashedPassword,
            name: body.name,
            role: body.role || 'UPT_PIMPINAN',
            title: body.title || 'Operator UPT',
            nip: body.nip || null,
            email: body.email || null,
            uptStation: body.uptStation || 'BBMKG Wilayah V Papua',
            avatarUrl: body.avatarUrl || null,
          },
        });
        await tx.auditLog.create({ data: { table: 'master_akun', action: 'TAMBAH', recordId: created.id, recordName: `${created.name} (@${created.username})`, actor: actorName(req), details: `Penambahan akun pengguna baru (${created.role}): "${created.name}" dengan username "${created.username}".` } });
        return created;
      });

      const { passwordHash: _omit, ...userWithoutPassword } = user;
      return res.status(201).json({
        success: true,
        data: userWithoutPassword,
        // Hanya diisi kalau admin tidak mengisi password sendiri - dikirim
        // SEKALI di response ini supaya admin bisa sampaikan ke user terkait.
        generatedPassword: generatedPassword ?? undefined,
      });
    } catch (error) {
      console.error('Error createUser:', error);
      if (isUniqueConstraint(error)) return res.status(409).json({ success: false, message: 'Username sudah digunakan.' });
      return res.status(500).json({ success: false, message: 'Gagal membuat akun pengguna baru.' });
    }
  },

  // Update user
  updateUser: async (req: AuthRequest, res: Response) => {
    const parsed = updateUserInput.safeParse(req.body);
    if (!parsed.success) return invalidUser(res, parsed.error);
    try {
      const { id } = req.params;
      const body = parsed.data;

      const updateData: any = {};
      for (const key of ['username', 'name', 'role', 'title', 'nip', 'email', 'uptStation', 'avatarUrl'] as const) {
        if (body[key] !== undefined) updateData[key] = key === 'username' ? body[key]!.toLowerCase() : body[key];
      }
      if (Object.keys(updateData).length === 0 && !body.password) return res.status(400).json({ success: false, message: 'Tidak ada data yang dapat diperbarui.' });

      // Client hanya boleh kirim password mentah (plaintext) - tidak ada lagi
      // jalur "passwordHash" langsung dari client (lihat catatan di createUser).
      if (body.password) {
        updateData.passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
      }

      const user = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({ where: { id }, data: updateData });
        await tx.auditLog.create({ data: { table: 'master_akun', action: 'EDIT', recordId: updated.id, recordName: `${updated.name} (@${updated.username})`, actor: actorName(req), details: body.details || `Pembaruan data akun pengguna ${updated.name}.` } });
        return updated;
      });

      const { passwordHash: _omit, ...userWithoutPassword } = user;

      return res.json({ success: true, data: userWithoutPassword });
    } catch (error) {
      console.error('Error updateUser:', error);
      if (isUniqueConstraint(error)) return res.status(409).json({ success: false, message: 'Username sudah digunakan.' });
      return res.status(500).json({ success: false, message: 'Gagal memperbarui akun pengguna.' });
    }
  },

  // Delete user
  deleteUser: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        return res.status(404).json({ success: false, message: 'Akun tidak ditemukan.' });
      }

      if (req.user?.id === id) return res.status(400).json({ success: false, message: 'Anda tidak dapat menghapus akun sendiri.' });
      if (user.role === 'ADMIN') {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
        if (adminCount <= 1) return res.status(400).json({ success: false, message: 'Admin terakhir tidak boleh dihapus.' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.delete({ where: { id } });
        await tx.auditLog.create({ data: { table: 'master_akun', action: 'HAPUS', recordId: user.id, recordName: `${user.name} (@${user.username})`, actor: actorName(req), details: `Penghapusan akun pengguna ${user.name}.` } });
      });

      return res.json({ success: true, message: 'Akun pengguna berhasil dihapus.' });
    } catch (error) {
      console.error('Error deleteUser:', error);
      return res.status(500).json({ success: false, message: 'Gagal menghapus akun pengguna.' });
    }
  },
};
