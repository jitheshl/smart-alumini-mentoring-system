import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userRole: { type: String, enum: ['student', 'alumni'], required: true },
  userEmail:{ type: String, required: true },
  subject:  { type: String, required: true, trim: true, maxlength: 150 },
  message:  { type: String, required: true, trim: true, maxlength: 2000 },
  status:   { type: String, enum: ['pending', 'resolved'], default: 'pending' },
  adminReply: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('ContactMessage', contactMessageSchema);
