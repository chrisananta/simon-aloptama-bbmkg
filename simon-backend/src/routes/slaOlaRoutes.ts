import { Router } from 'express';
import { slaOlaController } from '../controllers/slaOlaController.js';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// SLA/OLA diisi rutin oleh operator UPT (bukan cuma admin), jadi cukup wajib login
router.post('/sla-ola/save', verifyToken, slaOlaController.saveSlaOla);
router.post('/sla-ola', verifyToken, slaOlaController.saveSlaOla);

// Ringkasan SLA/OLA setahun per alat per bulan (sumber halaman SLA & OLA) — cukup login
router.get('/sla-ola/summary', verifyToken, slaOlaController.getYearlySummary);

// Tabel monitoring pengisian SLA/OLA (lihat/edit/hapus per entri) — khusus Admin
router.get('/sla-ola/logs', verifyToken, requireAdmin, slaOlaController.getSlaOlaLogs);
router.put('/sla-ola/logs/:id', verifyToken, requireAdmin, slaOlaController.updateSlaOlaLog);
router.delete('/sla-ola/logs/:id', verifyToken, requireAdmin, slaOlaController.deleteSlaOlaLog);

// Input SLA/OLA per-bulan khusus Admin Master View
router.get('/sla-ola/monthly', verifyToken, requireAdmin, slaOlaController.getMonthlySlaOla);
router.post('/sla-ola/monthly', verifyToken, requireAdmin, slaOlaController.saveMonthlySlaOla);

export default router;