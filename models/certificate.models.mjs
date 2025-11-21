import mongoose from "mongoose";

const certificateSchema = mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    level: { type: String, trim: true, required: true },
    issuedAt: { type: Date, default: Date.now },
    finalPercentage: { type: Number, min: 0, max: 100, required: true },
    summary: {
        quizAvgPercentage: { type: Number, min: 0, max: 100, default: null },
        assignmentAvgPercentage: { type: Number, min: 0, max: 100, default: null }
    },
    certificateNumber: { type: String, required: true, unique: true }
})

certificateSchema.index({ student: 1, level: 1 }, { unique: true })
export const Certificate = mongoose.model('Certificate', certificateSchema)