import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String, required: true, trim: true, maxlength: 200
  },
  description: {
    type: String, trim: true, maxlength: 1000, default: ""
  },
  level: {
    type: String, enum: ["beginner", "intermediate", "advance"], required: true, trim: true
  },
  question: {
    type: String, required: true, maxlength: 300, trim: true
  },
  marks: {
    type: Number, required: true, min: 0, max: 25
  },
  prerequisiteLesson: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', default: null
  },
  status: {
    type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true
  },
},
  {
    timestamps: true
  })

assignmentSchema.index({ level: 1 })
assignmentSchema.index({ createdBy: 1 })

export const Assignment = mongoose.model('Assignment', assignmentSchema)