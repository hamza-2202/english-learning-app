import mongoose, { mongo } from "mongoose";

const quizSubmissionSchema = mongoose.Schema({
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    answers: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Quiz',
            required: true
        },
        question: {
            type: String,
            required: true,
            maxlength: 1000
        },
        options: [{
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        }],
        selectedOption: {
            type: String,
            trim: true,
            maxlength: 200
        },
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
        }
    }],
    result: {
        type: Number,
        required: true,
        min: 0
    },
    totalMarks: {
        type: Number,
        required: true,
        min: 0
    }
},
{
    timestamps: true
})

quizSubmissionSchema.index({quiz: 1, student: 1}, {unique: true})

export const QuizSubmission = mongoose.model('QuizSubmission', quizSubmissionSchema)