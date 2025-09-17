import mongoose from "mongoose"

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
})

feedbackSchema.index({lesson: 1})
feedbackSchema.index({user: 1})
feedbackSchema.index({'replies.user': 1})

export const Feedback = mongoose.model('Feedback', feedbackSchema)