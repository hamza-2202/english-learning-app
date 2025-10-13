import asyncHandler from "express-async-handler";
import { User } from "../models/user.model.mjs";
import bcrypt from "bcrypt"
import { Progress } from "../models/progress.model.mjs";
import { Feedback } from "../models/lesson.feedback.mjs";
import { Submission } from "../models/assignment.submissions.model.mjs";
import { QuizSubmission } from "../models/quizSubmission.model.mjs";

const createUser = asyncHandler(async (request, response) => {
    const { name, email, role, password } = request.body
    if (!name || !email || !role || !password) {
        throw new Error(`Input all fields`)
    }

    const userExists = await User.findOne({ email })
    if (userExists) {
        response.status(400)
        throw new Error(`User with this email already exists`)
    }
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({ name, email, role, password: hashedPassword })
    response.status(201).json({
        message: `User created successfully`,
        user
    })
})

const getAllUsers = asyncHandler(async (request, response) => {
    const users = await User.find().select('-password')
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
    const user = await User.findById(request.params.id).select('-password')
    if (!user) {
        response.status(404)
        throw new Error(`User not found`)
    }
    response.status(200).json({
        user
    })
})

const updateUser = asyncHandler(async (request, response) => {

    const { name, email, password, level, role } = request.body
    const { id } = request.params
    const reqUser = request.user

    const user = await User.findById(id)
    if (!user) {
        response.status(404)
        throw new Error(`User not found`)
    }

    let updateData = {}
    if (name) {
        if (name.trim().length < 3) {
            response.status(400)
            throw new Error(`Name must be atleast three characters long`)
        }
        updateData.name = name.trim()
    }

    if (email) {
        const emailExists = await User.findOne({ email });
        if (emailExists && user.email !== email.trim()) {
            response.status(400)
            throw new Error(`This email is alredy in use by someone else`)
        }
        updateData.email = email.trim()
    }

    const userLevel = ["beginner", "intermediate", "advance"]
    if (level) {
        if (!userLevel.includes(level.trim())) {
            response.status(400)
            throw new Error(`Level: ${level} is not a valid level value`)
        }
        updateData.level = level.trim()
    }

    const userRole = ["student", "teacher"]
    if (role) {
        if (reqUser.role !== 'admin') {
            response.status(401)
            throw new Error(`Access denied. Only admin can update role`)
        }
        if (!userRole.includes(role.trim())) {
            response.status(400)
            throw new Error(`Role: ${role} is not a valid role value`)
        }
        updateData.role = role.trim()
    }

    if (reqUser.role.toString() !== 'admin' && reqUser._id.toString() !== id) {
        response.status(403)
        throw new Error(`Access denied. User not authorized.`)
    }

    if (password) {
        if (password.trim().length < 6) {
            response.status(400)
            throw new Error(`Password should be at least 6 characters long`)
        }
        const hashedPassword = await bcrypt.hash(password.trim(), 10)
        updateData.password = hashedPassword;
    }

    const updatedUser = await User.findByIdAndUpdate(request.params.id, updateData, { new: true }).select(-password)
    response.status(201).json({
        message: `User updated successfully`,
        user: updatedUser
    })
})

const deleteUser = asyncHandler(async (request, response) => {

    const { id } = request.params
    const reqUser = request.user

    const user = await User.findById(id)
    if (!user) {
        response.status(404)
        throw new Error(`User not found`)
    }

    if (reqUser.role.toString() !== 'admin' && reqUser._id.toString() !== id) {
        response.status(401)
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