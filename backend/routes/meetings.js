import { Router } from 'express';
import {
  requestMeeting, getMyMeetings, getIncomingMeetings,
  submitSlots, selectSlot, completeMeeting, cancelMeeting
} from '../controllers/meetingController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect); // All meeting routes require auth

router.post('/request',          authorize('student'), requestMeeting);
router.get('/my',                authorize('student'), getMyMeetings);
router.get('/incoming',          authorize('alumni'), getIncomingMeetings);
router.put('/:id/slots',         authorize('alumni'), submitSlots);
router.put('/:id/select',        authorize('student'), selectSlot);
router.put('/:id/complete',      authorize('alumni'), completeMeeting);
router.put('/:id/cancel',        cancelMeeting);

export default router;
