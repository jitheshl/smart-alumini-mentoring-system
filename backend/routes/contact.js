import { Router } from 'express';
import { sendMessage, getMyMessages, adminGetMessages, adminResolveMessage, getPendingCount, publicSendMessage } from '../controllers/contactController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
const adminOnly = [protect, authorize('admin')];

// User routes
router.post('/',       protect, sendMessage);
router.post('/public', publicSendMessage);
router.get('/my',      protect, getMyMessages);

// Admin routes
router.get('/admin',           ...adminOnly, adminGetMessages);
router.get('/admin/count',     ...adminOnly, getPendingCount);
router.put('/admin/:id/resolve', ...adminOnly, adminResolveMessage);

export default router;
