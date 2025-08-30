import mongoose from "mongoose";

const UserSchema = mongoose.Schema({
    name: {
        type: String
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        enum: ["admin", "teacher", "student"],
        default: 'student'
    },
    password: {
        type: String  
    },
    level: {
        type: String,
        enum: ["beginner", "intermediate", "advance"],
        default: 'beginner'
    },
    googleId: {
        type: String
    },
    facebookId: {
        type: String
    },
    provider: {
        type: String,
        enum: ['google', 'facebook', 'email'],
        default: 'email'
    }
},
{
    timestamps: true
})

export const User = mongoose.model('User', UserSchema)