import mongoose from "mongoose"
import asyncHandler from "express-async-handler"
import { Assignment } from "../models/assignment.model.mjs"
import { Submission } from "../models/assignment.submissions.model.mjs"
import { Lesson } from "../models/lesson.model.mjs"
import { Progress } from "../models/progress.model.mjs"
import { sanitizeHtml } from "../utils/sanitizer.mjs"

/*  admin can get fetch all the assignments (approved, pending, or rejected),
    teacher can only fetch their own assignments (approved, pending, or rejected),
    student can only get approved assignments for their respective level */
const getAllAssignments = asyncHandler(async (request, response) => {
    const user = request.user

    if (!user) {
        response.status(401)
        throw new Error(`Unauthorized`)
    }

    let assignments = []
    let count = 0

    if (user.role === 'student') {
        assignments = await Assignment.find({ level: user.level, status: 'approved' })
            .populate('prerequisiteLesson', 'title category url')
            .select('title description level question marks prerequisiteLesson')
            .lean()

        if (assignments.length === 0) {
            response.status(404)
            throw new Error(`No assignments found for your level`)
        }

        const assignmentId = assignments.map(assignment => assignment._id)

        const submissions = await Submission.find({
            student: user._id,
            assignment: { $in: assignmentId }
        }).select('assignment content submittedAt result feedback status').lean()

        // O(1) lookup with Map
        const submissionMap = new Map(submissions.map(s => [s.assignment.toString(), s]))
        assignments = assignments.map(assignment => ({
            ...assignment,
            submission: submissionMap.get(assignment._id.toString()) || null
        }))
        count = assignments.length
    }

    if (user.role === 'teacher') {

        assignments = await Assignment.find({ createdBy: user._id })
            .populate('prerequisiteLesson', 'title category url')
            .populate('createdBy', 'name email').lean()

        if (assignments.length === 0) {
            response.status(404)
            throw new Error(`You have not created any assignment yet`)
        }
        count = assignments.length
    }

    if (user.role === 'admin') {

        assignments = await Assignment.find().populate('createdBy', 'name email').lean()

        if (assignments.length === 0) {
            response.status(404)
            throw new Error(`No assignments found`)
        }
        count = assignments.length
    }
    response.status(200).json({
        count,
        assignments
    })
})

/*  Only teacher can create assignments */
const createAssignment = asyncHandler(async (request, response) => {
    const { title, description, level, question, marks, prerequisiteLesson } = request.body
    const user = request.user

    if (!title || !level || !question || !marks) {
        response.status(400)
        throw new Error(`Title, level, question, and marks are required fields`)
    }

    if (!Number.isInteger(marks) || marks < 0 || marks > 25) {
        response.status(400)
        throw new Error(`Marks must be between 0 to 25`)
    }

    let createData = { title: title.trim(), level: level.trim(), question: question.trim(), marks: marks, createdBy: user._id }

    if (description) {
        createData.description = description.toString().trim()
    }

    if (prerequisiteLesson) {
        const lesson = await Lesson.findById(prerequisiteLesson.trim())
        if (!lesson) {
            response.status(400)
            throw new Error(`Prerequisite lesson with Id: ${prerequisiteLesson} does not exist`)
        }
        if (level.trim() !== lesson.level.trim()) {
            response.status(400)
            throw new Error(`Level of assignment does not match the level of prerequisite lesson`)
        }
        createData.prerequisiteLesson = prerequisiteLesson.trim()
    }

    const existing = await Assignment.findOne({ title, level })
    if (existing) {
        response.status(400)
        throw new Error(`Assignment with this title and level already exists`)
    }

    const assignment = await Assignment.create(createData)
    response.status(201).json({
        message: `Assignment created successfully`,
        assignment
    })
})

/*  teacher can only update those assignments they created */
const updateAssignment = asyncHandler(async (request, response) => {
    const { title, description, level, question, marks, prerequisiteLesson } = request.body
    const user = request.user
    const { id } = request.params

    const assignment = await Assignment.findById(id)

    if (!assignment) {
        response.status(404)
        throw new Error(`Assignment not found`)
    }

    if (assignment.createdBy.toString() !== user._id.toString()) {
        response.status(403)
        throw new Error('You are not the author of this assignment')
    }

    if (assignment.status === 'approved') {
        response.status(401)
        throw new Error(`Cannot update approved assignment`)
    }

    let updateData = {}
    if (title) {
        updateData.title = title.toString().trim()
    }

    if (description) {
        updateData.description = description.toString().trim()
    }

    const allowedLevels = ['beginner', 'intermediate', 'advance']
    if (level) {
        if (!allowedLevels.includes(level.toString().trim())) {
            response.status(400)
            throw new Error(`Error: ${level} is not a valid level value`)
        }
        updateData.level = level.toString().trim()
    }

    if (question) {
        updateData.question = question.toString().trim()
    }

    if (marks) {
        if (!Number.isInteger(marks) || marks < 0 || marks > 25) {
            response.status(400)
            throw new Error(`Marks must be between 0 to 25`)
        }
        updateData.marks = marks
    }

    if (prerequisiteLesson !== undefined) {
        if (prerequisiteLesson) {
            const lesson = await Lesson.findById(prerequisiteLesson.trim())
            if (!lesson) {
                response.status(400)
                throw new Error(`Prerequisite lesson with Id: ${prerequisiteLesson} does not exist`)
            }
            if (level.trim() !== lesson.level.trim()) {
                response.status(400)
                throw new Error(`Level of assignment does not match the level of prerequisite lesson`)
            }
            updateData.prerequisiteLesson = prerequisiteLesson.trim()
        }
        updateData.prerequisiteLesson = prerequisiteLesson
    }

    const updatedAssignment = await Assignment.findByIdAndUpdate(id, updateData, { new: true })

    response.status(200).json({
        message: `Assignment updated successfully`,
        assignment: updatedAssignment,
    })
})

/*  teacher can only delete those assignments they created */
const deleteAssignment = asyncHandler(async (request, response) => {
    const user = request.user
    const { id } = request.params

    const assignment = await Assignment.findById(id)
    if (!assignment) {
        response.status(404)
        throw new Error(`Assignment not found or already deleted`)
    }

    if (assignment.createdBy.toString() !== user._id.toString()) {
        response.status(401)
        throw new Error('Unauthorized. You are not the author of this assignment')
    }

    if (assignment.status === 'approved') {
        response.status(401)
        throw new Error(`Cannot delete approved assignment`)
    }

    await Assignment.findByIdAndDelete(assignment._id)
    await Submission.deleteMany({ assignment: assignment._id })

    response.status(200).json({
        message: `Assignmnet deleted successfully`
    })
})

//  Admin can approve assignments createdBy any teacher
const approveAssignment = asyncHandler(async (request, response) => {

    const { id } = request.params

    let assignment = await Assignment.findById(id)
    if (!assignment) {
        response.status(404)
        throw new Error(`Assignment not found`)
    }

    if (assignment.status === 'approved') {
        response.status(400)
        throw new Error(`This assignment is already approved`)
    }

    assignment.status = 'approved'
    await assignment.save()
    // const approvedAssignment = await Assignment.findByIdAndUpdate(id, assignment, { new: true })

    response.status(200).json({
        message: `Assignment approved successfully`,
        assignment
    })
})

//  Admin can reject assignment createdBy any teacher
const rejectAssignment = asyncHandler(async (request, response) => {

    const { id } = request.params

    let assignment = await Assignment.findById(id)
    if (!assignment) {
        response.status(404)
        throw new Error(`Assignment not found`)
    }

    if (assignment.status === 'rejected') {
        response.status(400)
        throw new Error(`Assignment is already rejected`)
    }

    assignment.status = 'rejected'
    assignment.save()
    // const rejectedAssignment = await Assignment.findByIdAndUpdate(id, assignment, { new: true })

    response.status(200).json({
        message: `Assignment rejected successfully`,
        assignment
    })
})

// Only students can submit assignment, resubmission for any assignment is not possible
const submitAssignment = asyncHandler(async (request, response) => {
    const { id } = request.params
    let { content } = request.body
    if (content) { content = content.trim() }
    const user = request.user

    if (!mongoose.Types.ObjectId.isValid(id)) {
        response.status(400)
        throw new Error('Invalid assignment ID')
    }

    if (!content) {
        response.status(400);
        throw new Error('Assignment content cannot be empty')
    }

    if (content.length > 5000) {
        response.status(400)
        throw new Error('Content too long (max 5000 characters)')
    }

    const assignment = await Assignment.findById(id)
    if (!assignment) {
        response.status(500)
        throw new Error('Assignment not found')
    }

    if (assignment.status !== 'approved') {
        response.status(400)
        throw new Error(`The assignment you are trying to submit is not yet approved`)
    }

    // Server-side sanitization (re-validate client input)
    const sanitizedContent = sanitizeHtml(content)
    if (sanitizedContent.length < 10) {     // Post-sanitization check (e.g., if all was stripped)
        response.status(400)
        throw new Error('Invalid content: Too little safe content after sanitization');
    }
    if (sanitizedContent !== content) {
        console.warn(`Content sanitized for user ${user._id}: unsafe elements detected`)    // Log for monitoring
    }

    // Check if student has already submitted
    const existingSubmission = await Submission.findOne({ assignment: id, student: user._id })
    if (existingSubmission) {
        response.status(400)
        throw new Error('You have already submitted this assignment')
    }

    if (assignment.prerequisiteLesson) {
        let progress = await Progress.findOne({ user: user._id })
        if (!progress) {
            progress = new Progress({ user: user._id, completedLessons: [], permanentPoints: 0, weeklyPoints: 0 })
            await progress.save()
        }
        const completedLessons = progress.completedLessons.map(cl => cl.toString())
        if (!completedLessons.includes(assignment.prerequisiteLesson.toString())) {
            response.status(400)
            throw new Error(`You must watch the prerequisite lesson before submitting this assignment`)
        }
    }

    const submission = await Submission.create({
        assignment: id,
        student: user._id,
        content: sanitizedContent
    })

    response.status(201).json({
        message: 'Assignment submitted successfully',
        submission
    })
})

/* teacher can get all submissions for the assignments they created, and later they can award marks to them */
const getAllSubmissions = asyncHandler(async (request, response) => {
    const { id } = request.params
    const user = request.user

    if (!mongoose.Types.ObjectId.isValid(id)) {
        response.status(400);
        throw new Error('Invalid assignment ID');
    }

    const assignment = await Assignment.findById(id).select('title description question level marks createdBy')
    if (!assignment) {
        response.status(404)
        throw new Error(`Assignment not found`)
    }

    if (user._id.toString() !== assignment.createdBy.toString()) {
        // if (user._id.equals(assignment.createdBy)) {
        response.status(403)
        throw new Error(`Access denied. Only author of the assignment can access submissions`)
    }

    const submissions = await Submission.find({ assignment: id })
        // .populate('assignment', 'title question marks')
        .populate('student', 'name')
        .sort({ createdAt: -1 })

    response.status(200).json({
        count: submissions.length,
        assignment,
        submissions
    })
})

/* teacher can only mark submissions for the assignments they created, and can give feedback along with marks */
const markSubmission = asyncHandler(async (request, response) => {
    const { id } = request.params
    const user = request.user
    let { marks: rawMarks, feedback } = request.body

    const marks = Number(rawMarks)
    if (isNaN(marks)) {
        response.status(400)
        throw new Error(`Invalid marks`)
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {  // Added
        response.status(400);
        throw new Error('Invalid submission ID');
    }

    let submission = await Submission.findById(id).populate('assignment', 'marks createdBy')
    if (!submission) {
        response.status(404)
        throw new Error(`Submission not found`)
    }

    const assignment = submission.assignment
    if (!assignment) {
        response.status(404)
        throw new Error(`Assignment not found`)
    }

    if (user._id.toString() !== assignment.createdBy.toString()) {
        response.status(403)
        throw new Error(`Access denied. Only author of the assignment can mark submisions`)
    }

    if (marks < 0 || marks > assignment.marks) {
        response.status(400)
        throw new Error(`Marks must be between 0 and ${assignment.marks}`)
    }

    let progress = await Progress.findOne({ user: submission.student })
    if (!progress) {
        response.status(500)
        throw new Error(`Something went wrong while marking assignment`)
    }
    progress.weeklyPoints -= (submission.result * 5)
    progress.weeklyPoints += (marks * 5)
    await progress.save()


    submission.result = marks
    if (feedback) {
        submission.feedback = feedback.trim().substring(0, 200);  // Trim and cap
    }
    submission.status = 'marked'

    await submission.save()

    response.status(200).json({
        message: `Submission marked successfully`,
        submission
    })
})

export {
    getAllAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    approveAssignment,
    rejectAssignment,
    submitAssignment,
    getAllSubmissions,
    markSubmission
}