import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Login tetap publik - ini titik masuk untuk mendapatkan token
// Dipasangi rate-limit supaya tidak bisa di-brute-force
router.post('/login', loginRateLimiter, userController.login);

// Logout: SENGAJA tidak dipasangi verifyToken. Kalau token sudah invalid/
// kedaluwarsa, verifyToken akan menolak dengan 401 SEBELUM sempat mengirim
// instruksi hapus cookie ke browser - akibatnya cookie basi itu nyangkut
// terus. Controller logout sendiri yang mencoba membaca identitas user
// (kalau ada & valid) untuk audit log, tapi cookie SELALU dibersihkan
// apa pun kondisi tokennya.
router.post('/logout', userController.logout);

// Melihat daftar user: wajib login (siapa saja yang sudah login boleh lihat)
router.get('/users', verifyToken, userController.getAllUsers);

// Kelola akun (buat/ubah/hapus): wajib login DAN wajib role ADMIN
router.post('/users', verifyToken, requireAdmin, userController.createUser);
router.put('/users/:id', verifyToken, requireAdmin, userController.updateUser);
router.delete('/users/:id', verifyToken, requireAdmin, userController.deleteUser);

export default router;
