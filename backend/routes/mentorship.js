import { Router } from 'express';
import {
  sendRequest, getMyRequests, getIncomingRequests, respondToRequest
} from '../controllers/mentorshipController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.post('/request', protect, authorize('student'), sendRequest);
router.get('/my-requests', protect, authorize('student'), getMyRequests);
router.get('/incoming', protect, authorize('alumni'), getIncomingRequests);
router.put('/:id/respond', protect, authorize('alumni'), respondToRequest);

export default router;
