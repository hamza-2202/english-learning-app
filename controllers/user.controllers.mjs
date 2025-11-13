import asyncHandler from "express-async-handler";
import { User } from "../models/user.model.mjs";
import bcrypt from "bcrypt"
import { Progress } from "../models/progress.model.mjs";
import { Feedback } from "../models/lesson.feedback.mjs";
import { Submission } from "../models/assignment.submissions.model.mjs";
import { QuizSubmission } from "../models/quizSubmission.model.mjs";
import { sanitizeAll } from "../utils/sanitizer.mjs"
import { allowedLevels } from "../constants.mjs";
import mongoose from "mongoose";

const createUser = asyncHandler(async (request, response) => {
    const { name: rawName, email: rawEmail, role: rawRole, level: rawLevel, password: rawPassword } = request.body

    const name = sanitizeAll(rawName.trim())
    const email = rawEmail.toLowerCase().trim()
    const role = rawRole.trim()
    const password = rawPassword.trim()
    const level = rawLevel ? rawLevel.trim().toLowerCase() : null

    if (!name || !email || !role || !password) {
        throw new Error(`Input all fields`)
    }

    if (name.length < 3 || name.length > 50) {
        response.status(400)
        throw new Error(`Name must be between 3 and 50 characters`)
    }

    const allowedRoles = ["student", "teacher"]
    if (!allowedRoles.includes(role)) {
        response.status(400)
        throw new Error(`Invalid role value`)
    }

    if (level && !allowedLevels.includes(level)) {
        response.status(400)
        throw new Error(`Invalid level value`)
    }

    if (password.length < 6) {
        response.status(400)
        throw new Error(`Password must be at least 6 characters long`)
    }

    const userExists = await User.findOne({ email })
    if (userExists) {
        response.status(400)
        throw new Error(`User with this email already exists`)
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    let user
    if (level) {
        user = await User.create({ name, email, role, password: hashedPassword, level })
    } else {
        user = await User.create({ name, email, role, password: hashedPassword })
    }
    response.status(201).json({
        message: `User created successfully`,
        user
    })
})

const getAllUsers = asyncHandler(async (request, response) => {
    const users = await User.find().sort({ createdAt: 1 }).select('-password -updatedAt -googleId -facebookId')
    if (users.length === 0) {
        response.status(404)
        throw new Error(`Users not found`)
    }

    response.status(200).json({
        count: users.length,
        users
    })
})

const getSingleUser = asyncHandler(async (request, response) => {
    const user = request.user

    let userExists = await User.findById(request.params.id).select('name email role level').lean()
    if (!userExists) {
        response.status(404)
        throw new Error(`User not found`)
    }

    if (userExists.role === "student") {
        const totalPoints = await Progress.findOne({ user: request.params.id }).select('totalPoints')
        userExists.totalPoints = totalPoints.totalPoints
    }

    if(userExists.role === "admin"){
        response.status(400)
        throw new Error(`This users profile is hidden`)
    }
    response.status(200).json({
        user: userExists
    })
})

const updateUser = asyncHandler(async (request, response) => {

    const { id } = request.params
    const reqUser = request.user
    const { name: rawName, email: rawEmail, role: rawRole, level: rawLevel, password: rawPassword } = request.body

    const name = rawName ? sanitizeAll(rawName.trim()) : undefined
    const email = rawEmail ? rawEmail.toLowerCase().trim() : undefined
    const role = rawRole ? rawRole.trim().toLowerCase() : undefined
    const password = rawPassword ? rawPassword.trim() : undefined
    const level = rawLevel ? rawLevel.trim().toLowerCase() : undefined

    if (!mongoose.Types.ObjectId.isValid(id)) {
        response.status(400)
        throw new Error(`Invalid user id`)
    }

    const user = await User.findById(id)
    if (!user) {
        response.status(404)
        throw new Error(`User not found`)
    }

    let updateData = {}
    if (name) {
        if (name.length < 3 || name.length > 50) {
            response.status(400)
            throw new Error(`Name must be between 3 and 50 characters`)
        }
        updateData.name = name
    }

    if (email) {
        const emailExists = await User.findOne({ email });
        if (emailExists && user.email.toLowerCase() !== email) {
            response.status(400)
            throw new Error(`This email is already in use by someone else`)
        }
        updateData.email = email
    }

    if (level && user.level !== level) {
        if (!allowedLevels.includes(level)) {
            response.status(400)
            throw new Error(`Error: ${level} is not a valid level value`)
        }
        updateData.level = level
    }

    const userRole = ["student", "teacher"]
    if (role) {
        if (reqUser.role !== 'admin') {
            response.status(401)
            throw new Error(`Access denied. Only admin can update role`)
        }
        if (!userRole.includes(role)) {
            response.status(400)
            throw new Error(`Error: ${role} is not a valid role value`)
        }
        updateData.role = role
    }

    if (reqUser.role.toString() !== 'admin' && reqUser._id.toString() !== id) {
        response.status(403)
        throw new Error(`Access denied. User not authorized.`)
    }

    if (password) {
        if (password.length < 6) {
            response.status(400)
            throw new Error(`Password should be at least 6 characters long`)
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        updateData.password = hashedPassword;
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password ')
    if(!updatedUser._id){
        response.status(500)
        throw new Error(`Something went wrong while updating user`)
    }
    if (level && user.level !== level) {
        if (allowedLevels.includes(level)) {
            const progress = await Progress.findOne({ user: id })
            progress.level = level
            await progress.save()
        }
    }
    response.status(200).json({
        message: `User updated successfully`,
        user: updatedUser
    })
})

const deleteUser = asyncHandler(async (request, response) => {

    const { id } = request.params
    const reqUser = request.user

    if (!mongoose.Types.ObjectId.isValid(id)) {
        response.status(400)
        throw new Error(`Invalid user id`)
    }

    const user = await User.findById(id)
    if (!user) {
        response.status(404)
        throw new Error(`User not found`)
    }

    if (reqUser.role.toString() !== 'admin' && reqUser._id.toString() !== id) {
        response.status(403)
        throw new Error(`Access denied. User not authorized`)
    }

    await User.findByIdAndDelete(user._id)
    await Progress.deleteMany({ user: user._id })
    await Feedback.deleteMany({ user: user._id })
    await Submission.deleteMany({ student: user._id })
    await QuizSubmission.deleteMany({ student: user._id })
    response.status(200).json({
        message: `User account deleted successfully`
    })
})

export {
    createUser,
    getAllUsers,
    getSingleUser,
    updateUser,
    deleteUser
}