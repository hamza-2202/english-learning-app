import mongoose from "mongoose"

const submissionSchema = new mongoose.Schema({
    assignment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000
    },
    result: {
        type: Number,
        default: null,
        min: 0,
        max: 25
    },
    feedback: {
        type: String,
        trim: true,
        maxlength: 200,
        default: ''
    },
    status: {
        type: String,
        enum: ['submitted', 'marked'],
        default: 'submitted',
        trim: true
    }
}, {
    timestamps: true
})

submissionSchema.index({ assignment: 1, student: 1 });

export const Submission = mongoose.model('Submission', submissionSchema)