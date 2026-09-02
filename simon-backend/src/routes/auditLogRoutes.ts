import { Router } from 'express';
import { auditLogController } from '../controllers/auditLogController.js';
import { verifyToken, requireSuperAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/audit-logs', verifyToken, auditLogController.getAuditLogs);
router.post('/audit-logs', verifyToken, requireSuperAdmin, auditLogController.createAuditLog);
router.delete('/audit-logs/clear', verifyToken, requireSuperAdmin, auditLogController.clearAuditLogs);

export default router;
