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

const apiRouter = Router();

// 1. Direct Root Endpoints (e.g., /api/users, /api/devices, /api/stations, /api/sla-ola, /api/calibration, /api/audit-logs, /api/petugas)
apiRouter.use('/', authRoutes);
apiRouter.use('/', deviceRoutes);
apiRouter.use('/', stationRoutes);
apiRouter.use('/', slaOlaRoutes);
apiRouter.use('/', calibrationRoutes);
apiRouter.use('/', auditLogRoutes);
apiRouter.use('/', petugasRoutes);

// 2. Namespaced Sub-path Endpoints (e.g., /api/auth/users, /api/master/devices, /api/operational/sla-ola, /api/system/audit-logs)
apiRouter.use('/auth', authRoutes);
apiRouter.use('/master', deviceRoutes);
apiRouter.use('/master', stationRoutes);
apiRouter.use('/master', petugasRoutes);
apiRouter.use('/operational', slaOlaRoutes);
apiRouter.use('/operational', calibrationRoutes);
apiRouter.use('/system', auditLogRoutes);

// 3. Operational History Logs Endpoint (wajib login)
apiRouter.get('/history', verifyToken, historyController.getHistoryLogs);

// 4. Health Check Endpoint (tetap publik - buat monitoring/uptime check)
apiRouter.get('/health', (req, res) => {
  return res.json({
    status: 'ONLINE',
    service: 'SIMON Aloptama BBMKG Wilayah V Backend API',
    database: 'PostgreSQL + Prisma ORM',
    timestamp: new Date().toISOString(),
  });
});

export default apiRouter;
