import { Request, Response } from 'express';
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

export const userController = {
  // Login endpoint
  login: async (req: Request, res: Response) => {
    try {
      const username = typeof req.body.username === 'string' ? req.body.username.trim().toLowerCase() : '';
      const password = req.body.password;

      if (!username || typeof password !== 'string' || password.length === 0) {
        return res.status(400).json({ success: false, message: 'Username dan kata sandi wajib diisi.' });
      }

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
    try {
      const body = req.body;
      const generatedPassword = body.password || body.passwordHash ? null : generateRandomPassword();
      const rawPassword = body.password || body.passwordHash || generatedPassword!;
      const hashedPassword = await bcrypt.hash(rawPassword, SALT_ROUNDS);

      if (typeof body.username !== 'string' || !body.username.trim() || typeof body.name !== 'string' || !body.name.trim()) {
        return res.status(400).json({ success: false, message: 'Username dan nama wajib diisi.' });
      }

      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            username: body.username.trim().toLowerCase(),
            passwordHash: hashedPassword,
            name: body.name.trim(),
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
    try {
      const { id } = req.params;
      const body = req.body;

      const updateData: any = {};
      for (const key of ['username', 'name', 'role', 'title', 'nip', 'email', 'uptStation', 'avatarUrl']) {
        if (body[key] !== undefined) updateData[key] = key === 'username' && typeof body[key] === 'string' ? body[key].trim().toLowerCase() : body[key];
      }
      if (Object.keys(updateData).length === 0 && !body.password && !body.passwordHash) return res.status(400).json({ success: false, message: 'Tidak ada data yang dapat diperbarui.' });

      if (body.password || body.passwordHash) {
        const rawPassword = body.password || body.passwordHash;
        updateData.passwordHash = await bcrypt.hash(rawPassword, SALT_ROUNDS);
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
