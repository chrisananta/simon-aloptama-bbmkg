import dotenv from 'dotenv';

dotenv.config();
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { prisma } from './simon-backend/src/db/prisma.js';
import apiRouter from './simon-backend/src/routes/index.js';
import { userController } from './simon-backend/src/controllers/userController.js';
import { stationController } from './simon-backend/src/controllers/stationController.js';
import { deviceController } from './simon-backend/src/controllers/deviceController.js';
import { slaOlaController } from './simon-backend/src/controllers/slaOlaController.js';
import { calibrationController } from './simon-backend/src/controllers/calibrationController.js';
import { auditLogController } from './simon-backend/src/controllers/auditLogController.js';
import { historyController } from './simon-backend/src/controllers/historyController.js';
import { SEED_DEVICES, SEED_UPT_STATIONS } from './simon-backend/src/db/seedData.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// Auto-seed database when empty
async function autoSeedDatabase() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('🌱 Database PostgreSQL kosong. Melakukan auto-seeding data awal SIMON Aloptama...');

      // 1. Users
      await prisma.user.upsert({
        where: { username: 'admin.inskal' },
        update: { passwordHash: 'inskal123' },
        create: {
          id: 'USR-ADMIN-001',
          username: 'admin.inskal',
          passwordHash: 'inskal123',
          name: 'Ir. Fajar Nur, M.T.',
          role: 'ADMIN',
          title: 'Admin INSKAL & Kalibrasi BBMKG V',
          nip: '19850412 201012 1 001',
          email: 'fajar.nur@bmkg.go.id',
          uptStation: 'BBMKG Wilayah V Papua',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        },
      });

      await prisma.user.upsert({
        where: { username: 'upt.jayapura' },
        update: { passwordHash: 'bmkg123' },
        create: {
          id: 'USR-UPT-001',
          username: 'upt.jayapura',
          passwordHash: 'bmkg123',
          name: 'Agus Prasetyo, S.Tr.',
          role: 'UPT_PIMPINAN',
          title: 'Operator UPT Stamet Dok II Jayapura',
          nip: '19920815 201503 1 002',
          email: 'stamet.jayapura@bmkg.go.id',
          uptStation: 'Stasiun Meteorologi Dok II Jayapura',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
        },
      });

      await prisma.user.upsert({
        where: { username: 'pimpinan.balai' },
        update: { passwordHash: 'bmkg123' },
        create: {
          id: 'USR-PIMP-001',
          username: 'pimpinan.balai',
          passwordHash: 'bmkg123',
          name: 'Dr. Yosafat, M.Si.',
          role: 'UPT_PIMPINAN',
          title: 'Kepala BBMKG Wilayah V Papua',
          nip: '19760310 199903 1 001',
          email: 'pimpinan.balai5@bmkg.go.id',
          uptStation: 'BBMKG Wilayah V Papua',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
        },
      });

      // 2. Stations
      for (const st of SEED_UPT_STATIONS) {
        await prisma.uptStation.upsert({
          where: { code: st.code },
          update: {},
          create: {
            code: st.code,
            name: st.name,
            regionGroup: st.regionGroup || 'Papua',
            location: st.location || st.name,
            latitude: Number(st.latitude) || -2.54,
            longitude: Number(st.longitude) || 140.7,
          },
        });
      }

      // 3. Initial Devices
      for (const dev of SEED_DEVICES) {
        await prisma.device.upsert({
          where: { id: dev.id },
          update: {},
          create: {
            id: dev.id,
            name: dev.name,
            category: dev.category,
            subCategory: dev.subCategory || null,
            uptStation: dev.uptStation,
            locationName: dev.locationName || dev.uptStation,
            latitude: Number(dev.latitude) || -2.54,
            longitude: Number(dev.longitude) || 140.7,
            conditionStatus: (dev.conditionStatus || 'NORMAL') as any,
            calibrationStatus: (dev.calibrationStatus || 'VALID') as any,
            lastCalibrated: dev.lastCalibrated || '2025-06-15',
            calibrationValidUntil: dev.calibrationValidUntil || '2026-06-15',
            calibrationAgency: dev.calibrationAgency || 'INSKAL BBMKG V',
            issueDescription: null,
            downtimeDuration: null,
            slaScore: dev.slaScore || 100,
            olaScore: dev.olaScore || 100,
          },
        });
      }

      console.log('✅ Auto-seeding PostgreSQL SIMON Aloptama berhasil selesai!');
    }
  } catch (err) {
    console.warn('Auto-seed check notification:', err);
  }
}

// Mount Centralized API Router (Supports both /api/* and /api/v1/* seamlessly)
app.use('/api', apiRouter);
app.use('/api/v1', apiRouter);

async function startServer() {
  // Vite dev middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server BMKG Aloptama (PostgreSQL DB Enabled) running on http://0.0.0.0:${PORT}`);
    autoSeedDatabase().catch((err) => console.warn('Auto-seed check notification:', err));
  });
}

startServer();
