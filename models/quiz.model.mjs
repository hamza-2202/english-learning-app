import mongoose from "mongoose"

const quizSchema = mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
        minlength: 3
    },
    description: {
        type: String,
        trim: true,
        maxlength: 200,
        default: ""
    },
    level: {
        type: String,
        required: true,
        enum: ['beginner', 'intermediate', 'advance'],
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['grammar', 'vocabulary', 'reading', 'writing', 'listening', 'speaking'],
        trim: true
    },
    questions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
    }],
    totalMarks: {
        type: Number,
        default: 0
    },
    prerequisiteLesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        required: true,
        trim: true,
        default: 'pending'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
},
    {
        timestamps: true
    }
)

quizSchema.index({ title: 1 })
quizSchema.index({ level: 1 })
quizSchema.index({ category: 1 })
export const Quiz = mongoose.model('Quiz', quizSchema)