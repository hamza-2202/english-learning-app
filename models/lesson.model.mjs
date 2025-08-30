import mongoose from "mongoose";

const lessonSchema = mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        required: true
    },
    category: [{
        type: String,
        required: true,
        enum: ["grammar", "vocabulary", "listening", "writing", "speaking"],
        trim: true
    }],
    content: [{
        title: {
            type: String,
            required: true,
            trim: true
        },
        type: {
            type: String,
            enum: ['video', 'audio', 'file'],
            required: true
        },
        url: {
            type: String,
            required: true // URL to file in cloud storage (e.g., AWS S3)
        }
    }],
},
{
    timestamps: true
})

export const Lesson = mongoose.model('Lesson', lessonSchema)