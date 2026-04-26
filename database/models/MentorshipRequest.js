import mongoose from 'mongoose';

const mentorshipRequestSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  alumniId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, maxlength: 500, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
}, { timestamps: true });

// Prevent duplicate requests
mentorshipRequestSchema.index({ studentId: 1, alumniId: 1 }, { unique: true });

export default mongoose.model('MentorshipRequest', mentorshipRequestSchema);
