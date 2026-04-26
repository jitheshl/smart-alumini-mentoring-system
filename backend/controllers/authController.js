import jwt from 'jsonwebtoken';
import User from '../../database/models/User.js';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

export const register = async (req, res) => {
  try {
    const { name, email, password, role, branch, year, company, jobRole, passOutYear } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password and role are required' });
    }
    if (!['student', 'alumni'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be student or alumni' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email is already registered' });
    }
    const userData = { name, email, password, role };
    if (role === 'student') { userData.branch = branch || ''; userData.year = year || ''; userData.isApproved = true; }
    if (role === 'alumni')  { userData.branch = branch || ''; userData.company = company || ''; userData.jobRole = jobRole || ''; userData.passOutYear = passOutYear || null; userData.isApproved = false; }

    const user = await User.create(userData);
    const token = role === 'student' ? signToken(user._id) : null;
    res.status(201).json({
      success: true,
      message: role === 'alumni'
        ? 'Registration successful! Your account is pending admin approval.'
        : 'Registration successful! You can now log in.',
      token,
      user: user.toSafeObject()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account has been blocked by admin' });
    }
    if (user.role === 'alumni' && !user.isApproved) {
      return res.status(403).json({ success: false, message: 'Your account is pending admin approval' });
    }
    const token = signToken(user._id);
    res.json({ success: true, token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};
