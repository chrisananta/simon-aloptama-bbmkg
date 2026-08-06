import { Router } from 'express';
import { auditLogController } from '../controllers/auditLogController.js';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/audit-logs', verifyToken, auditLogController.getAuditLogs);
router.post('/audit-logs', verifyToken, auditLogController.createAuditLog);
router.delete('/audit-logs/clear', verifyToken, requireAdmin, auditLogController.clearAuditLogs);

export default router;
