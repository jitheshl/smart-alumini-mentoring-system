import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getChatContacts, getConversation, sendMessage } from '../controllers/chatController.js';

const router = Router();

router.use(protect, authorize('student', 'alumni', 'admin'));

router.get('/contacts', getChatContacts);
router.get('/conversation/:userId', getConversation);
router.post('/send', sendMessage);

export default router;
