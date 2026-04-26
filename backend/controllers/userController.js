import User from '../database/models/User.js';

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      'name', 'branch', 'year', 'bio', 'skills', 'interests', 'links',
      'cgpa', 'projects', 'company', 'jobRole', 'experience', 'passOutYear'
    ];
    const updates = {};
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    // Parse JSON strings sent via FormData (skills, interests, links, projects)
    const jsonFields = ['skills', 'interests', 'links', 'projects'];
    jsonFields.forEach(f => {
      if (updates[f] && typeof updates[f] === 'string') {
        try { updates[f] = JSON.parse(updates[f]); } catch (_) {}
      }
    });

    // Remove empty strings for numeric fields to avoid Mongoose CastError
    const numericFields = ['passOutYear', 'experience', 'cgpa'];
    numericFields.forEach(f => {
      if (updates[f] === '' || updates[f] === null || updates[f] === undefined) {
        delete updates[f];
      }
    });

    // Handle profile photo upload
    if (req.file) {
      updates.profilePhoto = `/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    }).select('-password');

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all approved, non-blocked alumni (for students - find mentors)
export const getAlumni = async (req, res) => {
  try {
    const { search, skills } = req.query;
    const filter = { role: 'alumni', isApproved: true, isBlocked: false };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { jobRole: { $regex: search, $options: 'i' } }
      ];
    }
    if (skills) {
      const skillArr = skills.split(',').map(s => s.trim());
      filter.skills = { $in: skillArr.map(s => new RegExp(s, 'i')) };
    }

    const alumni = await User.find(filter).select('-password');
    res.json({ success: true, alumni });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAlumniById = async (req, res) => {
  try {
    const alumni = await User.findOne({
      _id: req.params.id,
      role: 'alumni',
      isApproved: true,
      isBlocked: false
    }).select('-password');
    if (!alumni) return res.status(404).json({ success: false, message: 'Alumni not found' });
    res.json({ success: true, alumni });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
