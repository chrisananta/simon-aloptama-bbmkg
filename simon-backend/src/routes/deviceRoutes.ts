import { Router } from 'express';
import { deviceController } from '../controllers/deviceController.js';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/devices', verifyToken, deviceController.getAllDevices);
router.get('/devices/:id', verifyToken, deviceController.getDeviceById);
router.post('/devices', verifyToken, requireAdmin, deviceController.createDevice);
router.put('/devices/:id', verifyToken, requireAdmin, deviceController.updateDevice);
router.delete('/devices/:id', verifyToken, requireAdmin, deviceController.deleteDevice);

export default router;
