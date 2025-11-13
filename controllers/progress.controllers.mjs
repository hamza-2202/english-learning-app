import asyncHandler from "express-async-handler";
import { Progress } from "../models/progress.model.mjs";
import mongoose from "mongoose";
import { Lesson } from "../models/lesson.model.mjs";
import { User } from "../models/user.model.mjs";

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

const getMyProgress = asyncHandler(async (request, response) => {
    const user = request.user

    if(user.role !== "student"){
        response.status(401)
        throw new Error(`Access denied, ${user.role} role is not authorized`)
    }

    let progress = await Progress.findOne({ user: user._id })
    if (!progress) {
        progress = new Progress({
            user: user._id,
            permanentPoints: 0,
            weeklyPoints: 0
        })
        await progress.save()
    }
    const higherRankCount = await Progress.countDocuments({
        level: user.level,
        totalPoints: { $gt: progress.totalPoints }
    })
    // progress.rank = higherRankCount + 1

    response.status(200).json({
        ...progress.toObject(),
        rank: higherRankCount + 1
    })
})

const getSingleProgress = asyncHandler(async (request, response) => {
    const user = request.user
    const { id } = request.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
        response.status(400)
        throw new Error(`Invalid User id`)
    }

    const userExists = await User.findById(id)
    if(!userExists){
        response.status(404)
        throw new Error(`User not found`)
    }

    if(userExists.role !== "student"){
        response.status(4001)
        throw new Error(`User progress does not exists`)
    }

    const progress = await Progress.findOne({ user: id })
        .populate('user', 'name level role')
        .select('user totalPoints')
        .lean()
    if (!progress) {
        response.status(404)
        throw new Error(`Progress not found`)
    }

    response.status(200).json({
        progress
    })
})

const getLeaderboard = asyncHandler(async (request, response) => {
    const user = request.user

    if (user.role === "student") {
        const studentProgress = await Progress.findOne({ user: user._id })
        if (!studentProgress) {
            response.status(404)
            throw new Error(`Error fetching student progress`)
        }
        const leaderboard = await Progress.find({ level: user.level }).select("user totalPoints").sort({ totalPoints: -1 }).populate("user", "name email level").limit(20).lean()
        if (!leaderboard || leaderboard.length === 0) {
            response.status(404)
            throw new Error(`Error fetching leaderboard`)
        }

        const higherRankCount = await Progress.countDocuments({
            level: user.level,
            totalPoints: { $gt: studentProgress.totalPoints }
        })

        response.status(200).json({
            message: "Leaderboard fetched successfully",
            leaderboard,
            studentProgress: {
                name: user.name,
                rank: higherRankCount + 1
            }
        })

    }
    if (user.role === "teacher" || "admin") {
        const leaderboard = await Progress.find().select("user totalPoints").sort({ totalPoints: -1 }).populate("user", "name email level").limit(100).lean()
        if (!leaderboard || leaderboard.length === 0) {
            response.status(404)
            throw new Error(`Error fetching leaderboard`)
        }
        response.status(200).json({
            message: "Leaderboard fetched successfully",
            leaderboard
        })
    }
    response.status(500)
    throw new Error(`Something went wrong, while fetching leaderboard`)
})

export {
    markLessonAsWatched,
    getMyProgress,
    getSingleProgress,
    getLeaderboard
}