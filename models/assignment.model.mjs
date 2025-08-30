import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true, unique: true },
  level: { type: String, enum: ["beginner", "intermediate", "advance"] },
  marks: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date },
  dueDate: { type: Date },
  submissions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: { type: String },
    feedback: { type: String },
    result: { type: Number },
    submittedAt: { type: Date, default: Date.now }
  }]
},
{
  timestamps: true
});

export const Assignment = mongoose.model('Assignment', assignmentSchema)