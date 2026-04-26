import User from '../../database/models/User.js';
import Job from '../../database/models/Job.js';
import MentorshipRequest from '../../database/models/MentorshipRequest.js';
import Complaint from '../../database/models/Complaint.js';
import Meeting from '../../database/models/Meeting.js';

export const getPendingAlumni = async (req, res) => {
  try {
    const alumni = await User.find({ role: 'alumni', isApproved: false, isBlocked: false })
      .select('-password').sort('-createdAt');
    res.json({ success: true, alumni });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const approveAlumni = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'alumni' },
      { isApproved: true, isBlocked: false },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Alumni not found' });
    res.json({ success: true, message: 'Alumni approved', user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const blockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: true, isApproved: false },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User blocked', user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: false },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User unblocked', user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('studentId', 'name email')
      .populate('alumniId', 'name email')
      .populate('meetingId', 'reason status selectedSlot createdAt')
      .sort('-createdAt');
    res.json({ success: true, complaints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const handleComplaintAction = async (req, res) => {
  try {
    const { action } = req.body; // ignore | warn | block
    if (!['ignore', 'warn', 'block'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    if (action === 'ignore') complaint.status = 'ignored';
    else if (action === 'warn') complaint.status = 'warned';
    else if (action === 'block') {
      complaint.status = 'blocked';
      await User.findByIdAndUpdate(complaint.alumniId, { isBlocked: true, isApproved: false });
    }
    await complaint.save();
    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const [totalStudents, totalAlumni, pendingAlumni, totalJobs, totalRequests, totalComplaints, openComplaints, totalMeetings] =
      await Promise.all([
        User.countDocuments({ role: 'student' }),
        User.countDocuments({ role: 'alumni', isApproved: true }),
        User.countDocuments({ role: 'alumni', isApproved: false }),
        Job.countDocuments(),
        MentorshipRequest.countDocuments(),
        Complaint.countDocuments(),
        Complaint.countDocuments({ status: 'open' }),
        Meeting.countDocuments()
      ]);
    res.json({
      success: true,
      analytics: { totalStudents, totalAlumni, pendingAlumni, totalJobs, totalRequests, totalComplaints, openComplaints, totalMeetings }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password').sort('-createdAt');
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find().populate('postedBy', 'name company').sort('-createdAt');
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find()
      .populate('studentId', 'name email branch year')
      .populate('alumniId', 'name email company jobRole')
      .sort('-createdAt');
    res.json({ success: true, meetings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
