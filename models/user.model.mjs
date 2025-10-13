import mongoose from "mongoose";
import { Progress } from "./progress.model.mjs";

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

UserSchema.index({ level: 1 })
// UserSchema.post('save', async function(doc) {
//     if (doc.isNew && doc.role === 'student') {
//         try {
//             const existing = await Progress.findOne({ user: doc._id });
//             if (!existing) {
//                 const progress = new Progress({
//                     user: doc._id, permanentPoints: 0, weeklyPoints: 0
//                 })
//                 await progress.save()
//             }
//         } catch (error) {
//             console.error('Progress creation failed:', error)
//         }
//     }
// });
UserSchema.pre('save', async function (next) {
    if (this.isNew && this.role === 'student') {
        try {
            const existing = await Progress.findOne({ user: this._id });
            if (!existing) {
                const progress = new Progress({
                    user: this._id,
                    permanentPoints: 0,
                    weeklyPoints: 0
                });
                await progress.save();
            }
        } catch (error) {
            console.error('Progress creation failed:', error);
        }
    }
    next();
});

export const User = mongoose.model('User', UserSchema)