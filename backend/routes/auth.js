import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { forgotPassword, resetPassword, verifyEmail, simpleResetPassword } from '../controllers/passwordController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);
router.post('/verify-email',    verifyEmail);
router.post('/simple-reset',    simpleResetPassword);

export default router;
