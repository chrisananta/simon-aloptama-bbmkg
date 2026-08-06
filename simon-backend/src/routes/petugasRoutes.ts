import { Router } from 'express';
import { petugasController } from '../controllers/petugasController.js';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/petugas', verifyToken, petugasController.getAll);
router.post('/petugas', verifyToken, requireAdmin, petugasController.create);
router.put('/petugas/:id', verifyToken, requireAdmin, petugasController.update);
router.delete('/petugas/:id', verifyToken, requireAdmin, petugasController.delete);

export default router;
