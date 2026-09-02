import { Router } from 'express';
import { petugasController } from '../controllers/petugasController.js';
import { verifyToken, requireSuperAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/petugas', verifyToken, petugasController.getAll);
router.post('/petugas', verifyToken, requireSuperAdmin, petugasController.create);
router.put('/petugas/:id', verifyToken, requireSuperAdmin, petugasController.update);
router.delete('/petugas/:id', verifyToken, requireSuperAdmin, petugasController.delete);

export default router;
