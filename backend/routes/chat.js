import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getChatContacts, getConversation, sendMessage, editMessage, deleteMessage } from '../controllers/chatController.js';

const router = Router();

router.use(protect, authorize('student', 'alumni', 'admin'));

router.get('/contacts', getChatContacts);
router.get('/conversation/:userId', getConversation);
router.post('/send', sendMessage);
router.put('/:id/edit', editMessage);
router.delete('/:id', deleteMessage);

export default router;
