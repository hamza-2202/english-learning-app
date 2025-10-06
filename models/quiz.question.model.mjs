import mongoose from "mongoose"

const questionSchema = mongoose.Schema(
    {
        question: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        },
        options: [{
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        }],
        answer: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },
        marks: {
            type: Number,
            required: true,
            min: 0
        },
        quiz: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Quiz',
            required: true
        }
    },
    {
        timestamps: true
    }
)

questionSchema.index({quiz: 1})

export const Question = mongoose.model('Question', questionSchema)