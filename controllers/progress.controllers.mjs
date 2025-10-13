import asyncHandler from "express-async-handler";
import { Progress } from "../models/progress.model.mjs";
import mongoose from "mongoose";
import { Lesson } from "../models/lesson.model.mjs";

const markLessonAsWatched = asyncHandler(async (request, response) => {
    const user = request.user
    const { id } = request.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
        response.status(400)
        throw new Error(`Invalid lesson id`)
    }

    const lesson = await Lesson.findById(id)
    if (!lesson) {
        response.status(404)
        throw new Error(`Lesson not found`)
    }

    let progress = await Progress.findOne({ user: user._id })
    if (!progress) {
        progress = new Progress({ user: user._id, permanentPoints: 0, weeklyPoints: 0 })
        await progress.save()
    }

    if (!progress.completedLessons.includes(id)) {
        progress.completedLessons.push(id)
        progress.permanentPoints += 3
        await progress.save()
    } else {
        response.status(400)
        throw new Error(`You have already watched this lesson`)
    }

    response.status(200).json({
        message: `Lesson has been marked as watched`
    })
})

export {
    markLessonAsWatched
}