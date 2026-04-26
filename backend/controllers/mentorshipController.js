import MentorshipRequest from '../database/models/MentorshipRequest.js';

export const sendRequest = async (req, res) => {
  try {
    const { alumniId, message } = req.body;
    if (!alumniId) return res.status(400).json({ success: false, message: 'Alumni ID is required' });

    const existing = await MentorshipRequest.findOne({ studentId: req.user._id, alumniId });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You already sent a request to this mentor' });
    }
    const request = await MentorshipRequest.create({
      studentId: req.user._id,
      alumniId,
      message: message || ''
    });
    res.status(201).json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyRequests = async (req, res) => {
  try {
    const requests = await MentorshipRequest.find({ studentId: req.user._id })
      .populate('alumniId', 'name company jobRole profilePhoto')
      .sort('-createdAt');
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getIncomingRequests = async (req, res) => {
  try {
    const requests = await MentorshipRequest.find({ alumniId: req.user._id })
      .populate('studentId', 'name branch year profilePhoto')
      .sort('-createdAt');
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const respondToRequest = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be accepted or rejected' });
    }
    const request = await MentorshipRequest.findOne({
      _id: req.params.id,
      alumniId: req.user._id
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    request.status = status;
    await request.save();
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
