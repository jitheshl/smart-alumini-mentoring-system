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

    // Emit real-time event to the receiver via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(String(receiverId)).emit('new_message', {
        _id: chat._id,
        senderId: { _id: req.user._id, name: req.user.name, role: req.user.role },
        receiverId: { _id: receiverId },
        message: chat.message,
        timestamp: chat.timestamp
      });
    }

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

// Edit a message (only the sender can edit their own message)
export const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    const chat = await ChatMessage.findById(id);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Only the sender can edit
    if (String(chat.senderId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only edit your own messages' });
    }

    chat.message = message.trim();
    chat.isEdited = true;
    await chat.save();

    // Emit real-time edit event to the other person
    const io = req.app.get('io');
    if (io) {
      const receiverId = String(chat.receiverId);
      io.to(receiverId).emit('message_edited', {
        _id: chat._id,
        message: chat.message,
        isEdited: true
      });
    }

    res.json({ success: true, chat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete a message (sender can delete own, admin can delete any)
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const chat = await ChatMessage.findById(id);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const isSender = String(chat.senderId) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isSender && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You can only delete your own messages' });
    }

    // Determine who to notify
    const otherUserId = isSender ? String(chat.receiverId) : String(chat.senderId);

    await ChatMessage.findByIdAndDelete(id);

    // Emit real-time delete event
    const io = req.app.get('io');
    if (io) {
      io.to(otherUserId).emit('message_deleted', { _id: id });
      // If admin deleted someone else's message, also notify the sender
      if (isAdmin && !isSender) {
        io.to(String(chat.senderId)).emit('message_deleted', { _id: id });
      }
    }

    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

