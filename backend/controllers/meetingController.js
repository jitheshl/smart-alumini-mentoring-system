import Meeting from '../database/models/Meeting.js';
import MentorshipRequest from '../database/models/MentorshipRequest.js';
import User from '../database/models/User.js';

// ── Student: Request a meeting ────────────────────────────────────────────────
export const requestMeeting = async (req, res) => {
  try {
    const { alumniId, mentorId, reason, studentId } = req.body;
    const targetAlumniId = alumniId || mentorId;
    if (!targetAlumniId || !reason?.trim()) {
      return res.status(400).json({ success: false, message: 'mentorId/alumniId and reason are required' });
    }
    if (studentId && String(studentId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'studentId does not match authenticated user' });
    }
    if (reason.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Reason must be at least 10 characters' });
    }
    if (String(targetAlumniId) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot request a meeting with yourself' });
    }

    const alumni = await User.findOne({ _id: targetAlumniId, role: 'alumni', isApproved: true, isBlocked: false })
      .select('_id');
    if (!alumni) {
      return res.status(404).json({ success: false, message: 'Mentor not found or unavailable' });
    }

    // Gate: must have an accepted mentorship with this alumni
    const mentorship = await MentorshipRequest.findOne({
      studentId: req.user._id, alumniId: targetAlumniId, status: 'accepted'
    });
    if (!mentorship) {
      return res.status(403).json({ success: false, message: 'You can only request a meeting with an accepted mentor' });
    }

    // Gate: no active meeting with this alumni at the same time
    const existing = await Meeting.findOne({
      studentId: req.user._id,
      alumniId: targetAlumniId,
      status: { $in: ['requested', 'slots_provided', 'scheduled'] }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You already have an active meeting request with this mentor' });
    }

    const meeting = await Meeting.create({ studentId: req.user._id, alumniId: targetAlumniId, reason: reason.trim() });
    res.status(201).json({ success: true, meetingId: meeting._id, meeting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Student: Get my meetings ──────────────────────────────────────────────────
export const getMyMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({ studentId: req.user._id })
      .populate('alumniId', 'name company jobRole profilePhoto')
      .sort('-createdAt');
    res.json({ success: true, meetings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Alumni: Get incoming meeting requests ─────────────────────────────────────
export const getIncomingMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({ alumniId: req.user._id })
      .populate('studentId', 'name branch year profilePhoto')
      .sort('-createdAt');
    res.json({ success: true, meetings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Alumni: Submit proposed slots ─────────────────────────────────────────────
export const submitSlots = async (req, res) => {
  try {
    const { slots, meetingLink } = req.body;
    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one slot is required' });
    }
    if (slots.length > 3) {
      return res.status(400).json({ success: false, message: 'Maximum 3 slots allowed' });
    }

    const meeting = await Meeting.findOne({ _id: req.params.id, alumniId: req.user._id });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    if (meeting.status !== 'requested') {
      return res.status(400).json({ success: false, message: 'Slots can only be provided for a pending request' });
    }

    meeting.proposedSlots = slots.map(s => ({ date: new Date(s.date), label: s.label || '' }));
    if (meetingLink) meeting.meetingLink = meetingLink;
    meeting.status = 'slots_provided';
    await meeting.save();
    res.json({ success: true, meeting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Student: Select a slot ────────────────────────────────────────────────────
export const selectSlot = async (req, res) => {
  try {
    const { slotIndex } = req.body;
    if (slotIndex === undefined || slotIndex === null) {
      return res.status(400).json({ success: false, message: 'slotIndex is required' });
    }

    const meeting = await Meeting.findOne({ _id: req.params.id, studentId: req.user._id });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    if (meeting.status !== 'slots_provided') {
      return res.status(400).json({ success: false, message: 'No slots available to select' });
    }

    const slot = meeting.proposedSlots[+slotIndex];
    if (!slot) return res.status(400).json({ success: false, message: 'Invalid slot index' });

    meeting.selectedSlot = slot;
    meeting.status = 'scheduled';
    await meeting.save();
    res.json({ success: true, meeting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Alumni: Mark meeting as completed ────────────────────────────────────────
export const completeMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, alumniId: req.user._id });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    if (meeting.status !== 'scheduled') {
      return res.status(400).json({ success: false, message: 'Meeting is not yet scheduled' });
    }
    meeting.status = 'completed';
    await meeting.save();
    res.json({ success: true, meeting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Either party: Cancel ──────────────────────────────────────────────────────
export const cancelMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({
      _id: req.params.id,
      $or: [{ studentId: req.user._id }, { alumniId: req.user._id }]
    });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    if (['completed', 'cancelled'].includes(meeting.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel this meeting' });
    }
    meeting.status = 'cancelled';
    await meeting.save();
    res.json({ success: true, meeting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
