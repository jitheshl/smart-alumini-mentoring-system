import { Router } from 'express';
import { fileComplaint, getMyComplaints } from '../controllers/complaintController.js';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();
router.post('/', protect, authorize('student'), upload.single('evidence'), fileComplaint);
router.get('/my', protect, authorize('student'), getMyComplaints);

export default router;
