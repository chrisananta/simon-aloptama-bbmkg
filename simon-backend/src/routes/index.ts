import { Router } from 'express';
import authRoutes from './authRoutes.js';
import deviceRoutes from './deviceRoutes.js';
import stationRoutes from './stationRoutes.js';
import slaOlaRoutes from './slaOlaRoutes.js';
import calibrationRoutes from './calibrationRoutes.js';
import auditLogRoutes from './auditLogRoutes.js';
import petugasRoutes from './petugasRoutes.js';
import { historyController } from '../controllers/historyController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import gensetRoutes from './gensetRoutes.js';
import perbaikanRoutes from './perbaikanRoutes.js';

const apiRouter = Router();

/**
 * Pendaftaran Rute Utama API SIMON Aloptama BBMKG Wilayah V
 * Menghubungkan seluruh modul backend secara terpusat dan konsisten.
 */
apiRouter.use('/', authRoutes);
apiRouter.use('/', deviceRoutes);
apiRouter.use('/', stationRoutes);
apiRouter.use('/', slaOlaRoutes);
apiRouter.use('/', calibrationRoutes);
apiRouter.use('/', auditLogRoutes);
apiRouter.use('/', petugasRoutes);
apiRouter.use('/', auditLogRoutes);
apiRouter.use('/', petugasRoutes);
apiRouter.use('/', gensetRoutes);
apiRouter.use('/', perbaikanRoutes);

// Endpoint Riwayat Operasional & Historis (Wajib Login)
apiRouter.get('/history', verifyToken, historyController.getHistoryLogs);

// Endpoint Pemeriksaan Kesehatan Server (Publik)
apiRouter.get('/health', (_req, res) => {
  return res.json({
    status: 'ONLINE',
    service: 'SIMON Aloptama BBMKG Wilayah V Backend API',
    database: 'PostgreSQL + Prisma ORM',
    timestamp: new Date().toISOString(),
  });
});

export default apiRouter;