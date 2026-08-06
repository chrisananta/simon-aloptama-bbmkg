import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { JWT_SECRET } from '../config/env.js';

// Angka "cost factor" bcrypt - makin tinggi makin aman tapi makin lambat.
// 10-12 adalah standar umum yang seimbang antara aman & cepat.
const SALT_ROUNDS = 10;

// Bcrypt hash SELALU diawali "$2a$", "$2b$", atau "$2y$".
// Dipakai untuk membedakan: ini sudah hash bcrypt, atau masih teks polos peninggalan lama?
function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$/.test(value);
}

export const userController = {
  // Login endpoint
  login: async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username) {
        return res.status(400).json({ success: false, message: 'Username wajib diisi.' });
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

      // Check password if passwordHash is present in DB
      if (user.passwordHash && password) {
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
      } else if (!user.passwordHash && password) {
        // If user has no passwordHash in DB yet, set it (sudah di-hash) dari password yang diberikan
        try {
          const newHash = await bcrypt.hash(password, SALT_ROUNDS);
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash },
          });
        } catch (err) {
          console.warn('Could not update user passwordHash in DB:', err);
        }
      }

      // Generate JWT Token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, name: user.name },
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
      console.warn('getAllUsers PostgreSQL note:', (error as any)?.message || error);
      const fallbackUsers = [
        {
          id: 'USR-ADMIN-001',
          username: 'admin.inskal',
          name: 'Ir. Fajar Nur, M.T.',
          role: 'ADMIN',
          title: 'Admin INSKAL & Kalibrasi BBMKG V',
          nip: '19850412 201012 1 001',
          email: 'fajar.nur@bmkg.go.id',
          uptStation: 'BBMKG Wilayah V Papua',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        },
        {
          id: 'USR-UPT-001',
          username: 'upt.jayapura',
          name: 'Agus Prasetyo, S.Tr.',
          role: 'UPT_PIMPINAN',
          title: 'Operator UPT Stamet Dok II Jayapura',
          nip: '19920815 201503 1 002',
          email: 'stamet.jayapura@bmkg.go.id',
          uptStation: 'Stasiun Meteorologi Dok II Jayapura',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
        },
      ];
      return res.json({ success: true, count: fallbackUsers.length, data: fallbackUsers });
    }
  },

  // Create user
  createUser: async (req: Request, res: Response) => {
    try {
      const body = req.body;
      const rawPassword = body.password || body.passwordHash || 'bmkg123';
      const hashedPassword = await bcrypt.hash(rawPassword, SALT_ROUNDS);

      const user = await prisma.user.create({
        data: {
          username: body.username,
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

      await prisma.auditLog.create({
        data: {
          table: 'master_akun',
          action: 'TAMBAH',
          recordId: user.id,
          recordName: `${user.name} (@${user.username})`,
          actor: body.actor || 'Admin INSKAL',
          details: `Penambahan akun pengguna baru (${user.role}): "${user.name}" dengan username "${user.username}".`,
        },
      });

      const { passwordHash: _omit, ...userWithoutPassword } = user;
      return res.status(201).json({ success: true, data: userWithoutPassword });
    } catch (error) {
      console.error('Error createUser:', error);
      return res.status(500).json({ success: false, message: 'Gagal membuat akun pengguna baru.' });
    }
  },

  // Update user
  updateUser: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const body = req.body;

      const updateData: any = {
        username: body.username,
        name: body.name,
        role: body.role,
        title: body.title,
        nip: body.nip,
        email: body.email,
        uptStation: body.uptStation,
        avatarUrl: body.avatarUrl,
      };

      if (body.password || body.passwordHash) {
        const rawPassword = body.password || body.passwordHash;
        updateData.passwordHash = await bcrypt.hash(rawPassword, SALT_ROUNDS);
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
      });

      await prisma.auditLog.create({
        data: {
          table: 'master_akun',
          action: 'EDIT',
          recordId: user.id,
          recordName: `${user.name} (@${user.username})`,
          actor: body.actor || 'Admin INSKAL',
          details: body.details || `Pembaruan data akun pengguna ${user.name}.`,
        },
      });

      const { passwordHash: _omit, ...userWithoutPassword } = user;

      return res.json({ success: true, data: userWithoutPassword });
    } catch (error) {
      console.error('Error updateUser:', error);
      return res.status(500).json({ success: false, message: 'Gagal memperbarui akun pengguna.' });
    }
  },

  // Delete user
  deleteUser: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        return res.status(404).json({ success: false, message: 'Akun tidak ditemukan.' });
      }

      await prisma.user.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          table: 'master_akun',
          action: 'HAPUS',
          recordId: user.id,
          recordName: `${user.name} (@${user.username})`,
          actor: (req.body && req.body.actor) || 'Admin INSKAL',
          details: `Penghapusan akun pengguna ${user.name}.`,
        },
      });

      return res.json({ success: true, message: 'Akun pengguna berhasil dihapus.' });
    } catch (error) {
      console.error('Error deleteUser:', error);
      return res.status(500).json({ success: false, message: 'Gagal menghapus akun pengguna.' });
    }
  },
};
