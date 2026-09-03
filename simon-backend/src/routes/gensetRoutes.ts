import { Router } from 'express';
import { gensetController } from '../controllers/gensetController.js';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();
router.get('/genset', verifyToken, requireAdmin, gensetController.getAll);
router.post('/genset', verifyToken, requireAdmin, gensetController.create);
router.delete('/genset/:id', verifyToken, requireAdmin, gensetController.delete);
export default router;