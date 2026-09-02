import { Router } from 'express';
import { deviceController } from '../controllers/deviceController.js';
import { verifyToken, requireSuperAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/devices', verifyToken, deviceController.getAllDevices);
router.get('/devices/:id', verifyToken, deviceController.getDeviceById);
router.post('/devices', verifyToken, requireSuperAdmin, deviceController.createDevice);
router.put('/devices/:id', verifyToken, requireSuperAdmin, deviceController.updateDevice);
router.delete('/devices/:id', verifyToken, requireSuperAdmin, deviceController.deleteDevice);

export default router;
