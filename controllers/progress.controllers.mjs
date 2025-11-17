import asyncHandler from "express-async-handler";
import { Progress } from "../models/progress.model.mjs";
import mongoose from "mongoose";
import { Lesson } from "../models/lesson.model.mjs";
import { User } from "../models/user.model.mjs";
import { Quiz } from "../models/quiz.model.mjs";
import { Assignment } from "../models/assignment.model.mjs";

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

    let progress = await Progress.findOne({ user: user._id, level: user.level })
    if (!progress) {
        progress = await Progress.findOne({ user: user._id })
        if (progress) {
            progress.level = user.level
            await progress.save()
        } else {
            progress = new Progress({ user: user._id, level: user.level })
            await progress.save()
        }
    }

    if (!progress.completedLessons.includes(id)) {
        progress.completedLessons.push(id)
        progress.permanentPoints += 3
        await progress.save()
    } else {
        response.status(200).json({
            message: `You have already watched this lesson`,
            progress
        })
    }

    response.status(200).json({
        message: `Lesson has been marked as watched`,
        progress
    })
})

const getMyProgress = asyncHandler(async (request, response) => {
    const user = request.user

    if (user.role !== "student") {
        response.status(403)
        throw new Error(`Access denied, ${user.role} role is not authorized`)
    }

    let progress = await Progress.findOne({ user: user._id, level: user.level })
    if (!progress) {
        progress = await Progress.findOne({ user: user._id })
        if (progress) {
            progress.level = user.level
            await progress.save()
        } else {
            progress = new Progress({
                user: user._id,
                level: user.level
            })
            await progress.save()
        }
    }
    const higherRankCount = await Progress.countDocuments({
        level: user.level,
        totalPoints: { $gt: progress.totalPoints }
    })

    response.status(200).json({
        progress: {
            ...progress.toObject(),
            rank: higherRankCount + 1
        }
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
    if (!userExists) {
        response.status(404)
        throw new Error(`User not found`)
    }

    if (userExists.role !== "student") {
        response.status(403)
        throw new Error(`Access denied, user progress is not available`)
    }

    const progress = await Progress.findOne({ user: id })
        .populate('user', 'name level role')
        .select('user level permanentPoints weeklyPoints totalPoints createdAt')
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

const getAdminDashboard = asyncHandler(async (request, response) => {

    const last30DaysUsers = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const promises = {
        // -------- Users ----------
        totalUsers: User.countDocuments(),
        totalTeachers: User.countDocuments({ role: "teacher" }),
        totalStudents: User.countDocuments({ role: "student" }),
        recentUsers: User.countDocuments({ createdAt: { $gte: last30DaysUsers } }),

        // -------- Lessons ----------
        totalLessons: Lesson.countDocuments(),

        // -------- Quizzes ----------
        totalQuizzes: Quiz.countDocuments(),
        approvedQuizzes: Quiz.countDocuments({ status: "approved" }),

        // -------- Assignments ----------
        totalAssignments: Assignment.countDocuments(),
        approvedAssignments: Assignment.countDocuments({ status: "approved" })
    }

    const keys = Object.keys(promises)
    const values = Object.values(promises)

    // Run all queries in parallel and preserve result
    const results = await Promise.allSettled(values)

    // Build safe result object
    const safe = {}
    keys.forEach((key, index) => {
        const r = results[index]
        safe[key] = r.value
    });

    response.status(200).json({
        users: {
            totalUsers: safe.totalUsers,
            totalTeachers: safe.totalTeachers,
            totalStudents: safe.totalStudents,
            recentUsers: safe.recentUsers
        },
        lessons: {
            totalLessons: safe.totalLessons
        },
        quizzes: {
            totalQuizzes: safe.totalQuizzes,
            approvedQuizzes: safe.approvedQuizzes
        },
        assignments: {
            totalAssignments: safe.totalAssignments,
            approvedAssignments: safe.approvedAssignments
        }
    });
})

export {
    markLessonAsWatched,
    getMyProgress,
    getSingleProgress,
    getLeaderboard,
    getAdminDashboard
}