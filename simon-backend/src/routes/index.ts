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
import { prisma } from '../db/prisma.js';
import gensetRoutes from './gensetRoutes.js';
import perbaikanRoutes from './perbaikanRoutes.js';

const apiRouter = Router();

/**
 * Pendaftaran Rute Utama API SIMON Aloptama BBMKG Wilayah V Menghubungkan seluruh modul backend secara terpusat dan konsisten.
 */
apiRouter.use('/', authRoutes);
apiRouter.use('/', deviceRoutes);
apiRouter.use('/', stationRoutes);
apiRouter.use('/', slaOlaRoutes);
apiRouter.use('/', calibrationRoutes);
apiRouter.use('/', auditLogRoutes);
apiRouter.use('/', petugasRoutes);
apiRouter.use('/', gensetRoutes);
apiRouter.use('/', perbaikanRoutes);

// Endpoint Riwayat Operasional & Historis (Wajib Login)
apiRouter.get('/history', verifyToken, historyController.getHistoryLogs);

// Endpoint Pemeriksaan Kesehatan Server (Publik)
// Ikut memeriksa koneksi database, supaya frontend bisa menampilkan banner
// "tidak terhubung" saat server hidup tetapi database tidak terjangkau (mis. WiFi/LAN putus).
const DB_PING_TIMEOUT_MS = 1000;
const DB_PING_CACHE_MS = 500;

async function isDatabaseReachable(): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('db ping timeout')), DB_PING_TIMEOUT_MS);
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Hasil ping dipakai bersama selama 0,5 detik, dan ping yang sedang berjalan tidak digandakan,
// sehingga banyak pengguna yang polling tidak membebani database.
let lastDbCheck = { ok: true, at: 0 };
let dbCheckInFlight: Promise<boolean> | null = null;

function checkDatabaseShared(): Promise<boolean> {
  if (Date.now() - lastDbCheck.at < DB_PING_CACHE_MS) return Promise.resolve(lastDbCheck.ok);
  if (!dbCheckInFlight) {
    dbCheckInFlight = isDatabaseReachable()
      .then((ok) => {
        lastDbCheck = { ok, at: Date.now() };
        return ok;
      })
      .finally(() => {
        dbCheckInFlight = null;
      });
  }
  return dbCheckInFlight;
}

apiRouter.get('/health', async (_req, res) => {
  const dbOk = await checkDatabaseShared();
  return res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ONLINE' : 'DEGRADED',
    service: 'SIMON Aloptama BBMKG Wilayah V Backend API',
    database: dbOk ? 'CONNECTED' : 'UNREACHABLE',
    timestamp: new Date().toISOString(),
  });
});

// Koneksi terbuka (Server-Sent Events) untuk indikator status koneksi di frontend, mirip WhatsApp Web.
// Server mengirim status database tiap detik; saat koneksi ini putus (WiFi mati, server mati) browser
// langsung tahu lewat event 'error' tanpa menunggu siklus polling. Publik & ringan (tanpa data sensitif).
const STREAM_INTERVAL_MS = 1000;
const MAX_STREAMS = 300;
let activeStreams = 0;

apiRouter.get('/connection-stream', (req, res) => {
  if (activeStreams >= MAX_STREAMS) return res.status(503).end();
  activeStreams += 1;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // matikan buffering di nginx agar event langsung terkirim
  });
  res.write('retry: 2000\n\n');

  let stopped = false;
  let pushing = false;

  const push = async () => {
    if (stopped || pushing) return;
    pushing = true;
    try {
      const ok = await checkDatabaseShared();
      if (!stopped) res.write(`event: status\ndata: ${JSON.stringify({ db: ok })}\n\n`);
    } finally {
      pushing = false;
    }
  };

  void push();
  const timer = setInterval(() => void push(), STREAM_INTERVAL_MS);

  req.on('close', () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    activeStreams -= 1;
  });
});

export default apiRouter;