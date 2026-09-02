import { Router } from 'express';
import { stationController } from '../controllers/stationController.js';
import { verifyToken, requireSuperAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/stations', verifyToken, stationController.getAllStations);
router.post('/stations', verifyToken, requireSuperAdmin, stationController.createStation);
router.put('/stations/:id', verifyToken, requireSuperAdmin, stationController.updateStation);
router.delete('/stations/:id', verifyToken, requireSuperAdmin, stationController.deleteStation);

export default router;
