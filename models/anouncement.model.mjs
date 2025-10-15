import mongoose from "mongoose";

const announcementSchema = mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1500
    },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advance'],
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

announcementSchema.index({title: 1, level: 1})
announcementSchema.index({level: 1})
announcementSchema.index({createdBy: 1})

export const Announcement = mongoose.model('Announcement', announcementSchema)