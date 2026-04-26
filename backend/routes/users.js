import { Router } from 'express';
import { getProfile, updateProfile, getAlumni, getAlumniById } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();
router.get('/profile', protect, getProfile);
router.put('/profile', protect, upload.single('profilePhoto'), updateProfile);
router.get('/alumni', protect, getAlumni);
router.get('/alumni/:id', protect, getAlumniById);

export default router;
