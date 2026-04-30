import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, maxlength: 300 }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'alumni', 'admin'], default: 'student' },

  // Common profile fields
  branch: { type: String, default: '' },
  year: { type: String, default: '' },
  bio: { type: String, maxlength: 150, default: '' },
  skills: [{ type: String }],
  interests: [{ type: String }],
  profilePhoto: { type: String, default: '' },
  links: {
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' }
  },

  // Student-only
  cgpa: { type: Number, min: 0, max: 10 },
  projects: { type: [projectSchema], default: [] },

  // Alumni-only
  company: { type: String, default: '' },
  jobRole: { type: String, default: '' },
  experience: { type: Number, default: 0 },
  passOutYear: { type: Number },
  isApproved: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },

  // Password reset
  resetToken:       { type: String, default: null },
  resetTokenExpiry: { type: Date,   default: null }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive fields when converting to JSON
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetToken;
  delete obj.resetTokenExpiry;
  return obj;
};

export default mongoose.model('User', userSchema);
