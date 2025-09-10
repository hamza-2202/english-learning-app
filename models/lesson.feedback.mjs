import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
    lesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    postedAt: {
        type: Date,
        default: Date.now
    },
    replies: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000
        },
        postedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

export const Feedback = mongoose.model('Feedback', feedbackSchema)