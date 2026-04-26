import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  alumniId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', default: null }, // optional
  message:   { type: String, required: true, maxlength: 1000 },
  evidence:  { type: String, default: '' },
  status:    { type: String, enum: ['open', 'warned', 'blocked', 'ignored'], default: 'open' }
}, { timestamps: true });

export default mongoose.model('Complaint', complaintSchema);
