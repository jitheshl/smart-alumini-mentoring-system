import ContactMessage from '../database/models/ContactMessage.js';

// ─── POST /api/contact — User submits a message ───────────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required' });
    }
    if (!['student', 'alumni'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only students and alumni can contact admin' });
    }

    const contact = await ContactMessage.create({
      userId:    req.user._id,
      userName:  req.user.name,
      userRole:  req.user.role,
      userEmail: req.user.email,
      subject:   subject.trim(),
      message:   message.trim()
    });

    res.status(201).json({ success: true, message: 'Your message has been sent to admin.', contact });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/contact/public — Unauthenticated contact ──────────────────────
export const publicSendMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const contact = await ContactMessage.create({
      userId:    new mongoose.Types.ObjectId('000000000000000000000000'), // Placeholder for public
      userName:  name,
      userRole:  'student', // Default or separate flag
      userEmail: email,
      subject:   `[PUBLIC HELP] ${subject}`,
      message:   message
    });

    res.status(201).json({ success: true, message: 'Your help request has been sent to admin.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/contact/my — User fetches their own messages ────────────────────
export const getMyMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find({ userId: req.user._id }).sort('-createdAt');
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/contact/admin — Admin fetches all messages ─────────────────────
export const adminGetMessages = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status && ['pending', 'resolved'].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    const messages = await ContactMessage.find(filter).sort('-createdAt');
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/contact/admin/:id/resolve — Admin resolves a message ────────────
export const adminResolveMessage = async (req, res) => {
  try {
    const { adminReply } = req.body;
    const msg = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved', adminReply: adminReply?.trim() || '' },
      { new: true }
    );
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    res.json({ success: true, message: 'Marked as resolved', contact: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/contact/admin/analytics — Count pending messages ───────────────
export const getPendingCount = async (req, res) => {
  try {
    const count = await ContactMessage.countDocuments({ status: 'pending' });
    res.json({ success: true, pendingCount: count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
