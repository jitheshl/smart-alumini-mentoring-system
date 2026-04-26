import { Router } from 'express';
import {
  getPendingAlumni, approveAlumni, blockUser, unblockUser,
  getAllComplaints, handleComplaintAction, getAnalytics, getAllUsers, getAllJobs,
  getAllMeetings
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
const adminOnly = [protect, authorize('admin')];

router.get('/analytics', ...adminOnly, getAnalytics);
router.get('/pending-alumni', ...adminOnly, getPendingAlumni);
router.put('/alumni/:id/approve', ...adminOnly, approveAlumni);
router.put('/users/:id/block', ...adminOnly, blockUser);
router.put('/users/:id/unblock', ...adminOnly, unblockUser);
router.get('/complaints', ...adminOnly, getAllComplaints);
router.put('/complaints/:id/action', ...adminOnly, handleComplaintAction);
router.get('/users', ...adminOnly, getAllUsers);
router.get('/jobs', ...adminOnly, getAllJobs);
router.get('/meetings', ...adminOnly, getAllMeetings);

export default router;
