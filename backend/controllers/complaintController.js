import Complaint from '../../database/models/Complaint.js';

export const fileComplaint = async (req, res) => {
  try {
    const { alumniId, message, meetingId } = req.body;
    if (!alumniId || !message) {
      return res.status(400).json({ success: false, message: 'Alumni ID and message are required' });
    }
    const complaint = await Complaint.create({
      studentId: req.user._id,
      alumniId,
      meetingId: meetingId || null,
      message,
      evidence: req.file ? `/uploads/${req.file.filename}` : ''
    });
    res.status(201).json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ studentId: req.user._id })
      .populate('alumniId', 'name company profilePhoto')
      .sort('-createdAt');
    res.json({ success: true, complaints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
