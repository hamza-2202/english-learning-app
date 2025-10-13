import mongoose from "mongoose";

const progressSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
    permanentPoints: { type: Number, min: 0 },
    weeklyPoints: { type: Number, min: 0 },
    totalPoints: { type: Number, min: 0 }
},
{ timestamps: true }
)

progressSchema.index({user: 1})
progressSchema.index({totalPoints: -1})

progressSchema.pre('save', function(next){
    this.totalPoints = this.permanentPoints + this.weeklyPoints
    next()
})

export const Progress = mongoose.model('Progress', progressSchema)