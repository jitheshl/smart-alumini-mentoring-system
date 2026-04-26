import ChatMessage from '../database/models/ChatMessage.js';
import User from '../database/models/User.js';
import MentorshipRequest from '../database/models/MentorshipRequest.js';

const canChat = async (currentUser, otherUser) => {
  if (!otherUser || otherUser.isBlocked) return false;

  if (currentUser.role === 'admin') return true;
  if (otherUser.role === 'admin') return true;

  if (
    (currentUser.role === 'student' && otherUser.role === 'alumni') ||
    (currentUser.role === 'alumni' && otherUser.role === 'student')
  ) {
    const studentId = currentUser.role === 'student' ? currentUser._id : otherUser._id;
    const alumniId = currentUser.role === 'alumni' ? currentUser._id : otherUser._id;
    const link = await MentorshipRequest.findOne({ studentId, alumniId, status: 'accepted' }).select('_id');
    return Boolean(link);
  }

  return false;
};

export const getChatContacts = async (req, res) => {
  try {
    let contacts = [];

    if (req.user.role === 'student') {
      const [accepted, admins] = await Promise.all([
        MentorshipRequest.find({ studentId: req.user._id, status: 'accepted' })
          .populate('alumniId', 'name role profilePhoto company jobRole isBlocked isApproved'),
        User.find({ role: 'admin', isBlocked: false }).select('name role profilePhoto')
      ]);
      const alumni = accepted
        .map((r) => r.alumniId)
        .filter((u) => u && !u.isBlocked && u.isApproved);
      contacts = [...alumni, ...admins];
    } else if (req.user.role === 'alumni') {
      const [accepted, admins] = await Promise.all([
        MentorshipRequest.find({ alumniId: req.user._id, status: 'accepted' })
          .populate('studentId', 'name role profilePhoto branch year isBlocked'),
        User.find({ role: 'admin', isBlocked: false }).select('name role profilePhoto')
      ]);
      const students = accepted
        .map((r) => r.studentId)
        .filter((u) => u && !u.isBlocked);
      contacts = [...students, ...admins];
    } else {
      contacts = await User.find({ _id: { $ne: req.user._id }, isBlocked: false })
        .select('name role profilePhoto branch year company jobRole');
    }

    const uniqueMap = new Map();
    contacts.forEach((c) => {
      if (!c?._id) return;
      uniqueMap.set(String(c._id), c);
    });

    res.json({ success: true, contacts: Array.from(uniqueMap.values()) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    if (!receiverId || !message?.trim()) {
      return res.status(400).json({ success: false, message: 'receiverId and message are required' });
    }
    if (String(receiverId) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot message yourself' });
    }

    const receiver = await User.findById(receiverId).select('_id role isBlocked');
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Receiver not found' });
    }

    const allowed = await canChat(req.user, receiver);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Chat is not allowed with this user' });
    }

    const chat = await ChatMessage.create({
      senderId: req.user._id,
      receiverId,
      message: message.trim()
    });

    res.status(201).json({ success: true, chat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const otherUser = await User.findById(userId).select('_id role isBlocked');
    if (!otherUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const allowed = await canChat(req.user, otherUser);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Chat is not allowed with this user' });
    }

    const messages = await ChatMessage.find({
      $or: [
        { senderId: req.user._id, receiverId: userId },
        { senderId: userId, receiverId: req.user._id }
      ]
    })
      .populate('senderId', 'name role')
      .populate('receiverId', 'name role')
      .sort('timestamp');

    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
