import { Router } from 'express';
import { calibrationController } from '../controllers/calibrationController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/calibration/records', verifyToken, calibrationController.getCalibrationRecords);
router.get('/calibration', verifyToken, calibrationController.getCalibrationRecords);
router.post('/calibration/save', verifyToken, calibrationController.saveCalibration);
router.post('/calibration', verifyToken, calibrationController.saveCalibration);

export default router;
