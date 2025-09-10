import mongoose from "mongoose";

const lessonSchema = mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        maxlength: 200,
        trim: true
    },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ["grammar", "vocabulary", "reading", "writing", "listening", "speaking"],
        trim: true
    },
    url: {
        type: String,
        required: true,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
},
{
    timestamps: true
})

lessonSchema.index({ level: 1 })

export const Lesson = mongoose.model('Lesson', lessonSchema)