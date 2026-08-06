import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Login tetap publik - ini titik masuk untuk mendapatkan token
router.post('/login', userController.login);

// Melihat daftar user: wajib login (siapa saja yang sudah login boleh lihat)
router.get('/users', verifyToken, userController.getAllUsers);

// Kelola akun (buat/ubah/hapus): wajib login DAN wajib role ADMIN
router.post('/users', verifyToken, requireAdmin, userController.createUser);
router.put('/users/:id', verifyToken, requireAdmin, userController.updateUser);
router.delete('/users/:id', verifyToken, requireAdmin, userController.deleteUser);

export default router;
