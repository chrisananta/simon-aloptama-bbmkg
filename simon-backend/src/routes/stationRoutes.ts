import { Router } from 'express';
import { stationController } from '../controllers/stationController.js';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/stations', verifyToken, stationController.getAllStations);
router.post('/stations', verifyToken, requireAdmin, stationController.createStation);
router.put('/stations/:id', verifyToken, requireAdmin, stationController.updateStation);
router.delete('/stations/:id', verifyToken, requireAdmin, stationController.deleteStation);

export default router;
