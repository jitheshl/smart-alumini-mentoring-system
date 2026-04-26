import { Router } from 'express';
import { getAllJobs, createJob, deleteJob, getMyJobs } from '../controllers/jobController.js';
import { protect, authorize, requireApproved } from '../middleware/auth.js';

const router = Router();
router.get('/', protect, getAllJobs);
router.post('/', protect, authorize('alumni'), requireApproved, createJob);
router.get('/my', protect, authorize('alumni'), getMyJobs);
router.delete('/:id', protect, deleteJob);

export default router;
