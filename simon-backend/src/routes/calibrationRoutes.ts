import { Router } from 'express';
import { calibrationController } from '../controllers/calibrationController.js';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/calibration/records', verifyToken, calibrationController.getCalibrationRecords);
router.get('/calibration', verifyToken, calibrationController.getCalibrationRecords);
// Daftar ID alat yang tampil di halaman Kalibrasi.
router.get('/calibration/listed', verifyToken, calibrationController.getListedDevices);
// Perubahan data kalibrasi adalah data master; hanya Admin INSKAL yang boleh menulis.
router.post('/calibration/save', verifyToken, requireAdmin, calibrationController.saveCalibration);
router.post('/calibration', verifyToken, requireAdmin, calibrationController.saveCalibration);

export default router;