import { Router } from 'express';
import { perbaikanController } from '../controllers/perbaikanController.js';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/perbaikan', verifyToken, perbaikanController.getAll);
router.post('/perbaikan', verifyToken, requireAdmin, perbaikanController.create);
router.delete('/perbaikan/:id', verifyToken, requireAdmin, perbaikanController.delete);

export default router;