import { Router } from 'express';
import { slaOlaController } from '../controllers/slaOlaController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = Router();

// SLA/OLA diisi rutin oleh operator UPT (bukan cuma admin), jadi cukup wajib login
router.get('/sla-ola/logs', verifyToken, slaOlaController.getSlaOlaLogs);
router.post('/sla-ola/save', verifyToken, slaOlaController.saveSlaOla);
router.post('/sla-ola', verifyToken, slaOlaController.saveSlaOla);

export default router;
