import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  date:  { type: Date, required: true },
  label: { type: String, default: '' }   // e.g. "Monday 10am–11am IST"
}, { _id: false });

const meetingSchema = new mongoose.Schema({
  studentId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  alumniId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason:        { type: String, required: true, maxlength: 500 },
  proposedSlots: { type: [slotSchema], default: [] },   // alumni provides up to 3
  selectedSlot:  { type: slotSchema, default: null },   // student picks one
  meetingLink:   { type: String, default: '' },          // optional Zoom/Meet URL
  status: {
    type: String,
    enum: ['requested', 'slots_provided', 'scheduled', 'completed', 'cancelled'],
    default: 'requested'
  }
}, { timestamps: true });

export default mongoose.model('Meeting', meetingSchema);
