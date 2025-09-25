import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String, required: true
  },
  description: {
    type: String, required: true, unique: true
  },
  level: {
    type: String, enum: ["beginner", "intermediate", "advance"], required: true, trim: true
  },
  question: {
    type: String, required: true, maxlength: 250
  },
  marks: {
    type: Number, required: true, min: 0
  },
  status: {
    type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true
  },
},
  {
    timestamps: true
  })

assignmentSchema.index({createdBy: 1})

export const Assignment = mongoose.model('Assignment', assignmentSchema)


  // submission: {
  //   type: mongoose.Schema.Types.ObjectId, ref: 'Submission'
  // }