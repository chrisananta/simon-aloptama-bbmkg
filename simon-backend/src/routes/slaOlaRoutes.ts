import { Router } from 'express';
import { slaOlaController } from '../controllers/slaOlaController.js';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// SLA/OLA diisi rutin oleh operator UPT (bukan cuma admin), jadi cukup wajib login
router.get('/sla-ola/logs', verifyToken, slaOlaController.getSlaOlaLogs);
router.post('/sla-ola/save', verifyToken, slaOlaController.saveSlaOla);
router.post('/sla-ola', verifyToken, slaOlaController.saveSlaOla);

// Input SLA/OLA per-bulan khusus Admin Master View
router.get('/sla-ola/monthly', verifyToken, requireAdmin, slaOlaController.getMonthlySlaOla);
router.post('/sla-ola/monthly', verifyToken, requireAdmin, slaOlaController.saveMonthlySlaOla);

export default router;
