import mongoose from "mongoose"
import asyncHandler from "express-async-handler"
import { Assignment } from "../models/assignment.model.mjs"
import { Submission } from "../models/assignment.submissions.model.mjs"

/*  admin can get fetch all the assignments (approved, pending, or rejected)z,
    teacher can only fetch their own assignments (approved, pending, or rejected),
    student can only get approved assignments for their respective level */
const getAllAssignments = asyncHandler(async (request, response) => {
    const user = request.user

    if (user.role === 'student') {
        const assignments = await Assignment.find({ level: user.level, status: 'approved' }).lean()

        if (assignments.length === 0) {
            response.status(404)
            throw new Error(`Assignments not found`)
        }

        const assignmentId = assignments.map(assignment => assignment._id)
        const submissions = await Submission.find({
            student: user._id,
            assignment: { $in: assignmentId }
        }).select('assignment content submittedAt result feedback status').lean()

        const updatedAssignments = assignments.map(assignment => {
            const submission = submissions.find(sub =>
                sub.assignment.toString() === assignment._id.toString()
            )
            // if (submission)
            assignment.submission = submission || null
            return assignment
        })

        response.status(200).json({
            count: assignments.length,
            assignments: updatedAssignments
        })
    }

    if (user.role === 'teacher') {
        const assignments = await Assignment.find({ createdBy: user._id }).populate('createdBy', 'name email').lean()

        if (assignments.length === 0) {
            response.status(404)
            throw new Error(`You have not created any assignment yet`)
        }

        response.status(200).json({
            count: assignments.length,
            assignments
        })
    }

    if (user.role === 'admin') {
        const assignments = await Assignment.find().populate('createdBy', 'name email').lean()
        if (assignments.length === 0) {
            response.status(404)
            throw new Error(`Assignments not found`)
        }
        response.status(200).json({
            count: assignments.length,
            assignments
        })
    }
})

/*  Only teacher can create assignments */
const createAssignment = asyncHandler(async (request, response) => {
    const { title, description, level, question, marks } = request.body

    if (!title || !description || !level || !question || !marks) {
        response.status(400)
        throw new Error(`Input all fields`)
    }

    const assignment = new Assignment({
        title, description, level, question, marks, createdBy: request.user._id
    })
    await assignment.save();

    response.status(201).json({
        message: `Assignment created successfully`,
        assignment
    })
})

/*  teacher can only update those assignments they created */
const updateAssignment = asyncHandler(async (request, response) => {
    const { title, description, level, question, marks } = request.body

    const assignment = await Assignment.findById(request.params.id)

    if (!assignment) {
        response.status(404)
        throw new Error(`Assignment not found`)
    }

    if (assignment.createdBy.toString() !== request.user._id.toString() || request.user.role !== 'teacher') {
        response.status(403)
        throw new Error('Not authorized to update this assignment')
    }

    const allowedLevels = ['beginner', 'intermediate', 'advance']
    if (level && !allowedLevels.includes(level)) {
        response.status(400)
        throw new Error(`level ${level} is not allowed`)
    }

    assignment.title = title || assignment.title
    assignment.description = description || assignment.description
    assignment.level = level || assignment.level
    assignment.question = question || assignment.question
    assignment.marks = marks || assignment.marks

    const updatedAssignment = await Assignment.findByIdAndUpdate(request.params.id, assignment, { new: true })

    response.status(200).json({
        message: `Assignment updated successfully`,
        assignment: updatedAssignment,
    })
})

/*  teacher can only delete those assignments they created */
const deleteAssignment = asyncHandler(async (request, response) => {
    const user = request.user

    const assignment = await Assignment.findById(request.params.id)
    if (!assignment) {
        response.status(404)
        throw new Error(`Assignment not found`)
    }

    if (assignment.createdBy.toString() !== request.user._id.toString() && user.role === 'teacher') {
        response.status(403)
        throw new Error('Access denied. Not authorized to delete this assignment')
    }

    await Assignment.deleteOne({ _id: request.params.id })
    response.status(200).json({
        message: `Assignmnet deleted successfully`
    })
})

//  Admin can approve assignments createdBy any teacher
const approveAssignment = asyncHandler(async (request, response) => {
    const user = request.user
    const { id } = request.params

    if (user.role !== 'admin') {
        response.status(403)
        throw new Error(`Access denied. Only admin can approve assignments`)
    }

    const assignment = await Assignment.findById(id)
    if (!assignment) {
        response.status(404)
        throw new Error(`Assignment not found`)
    }

    if (assignment.status === 'approved') {
        response.status(400)
        throw new Error(`Assignment is already approved`)
    }

    assignment.status = 'approved'
    const approvedAssignment = await Assignment.findByIdAndUpdate(id, assignment, { new: true })

    response.status(200).json({
        message: `Assignment approved successfully`,
        assignment: approvedAssignment
    })
})

//  Admin can reject assignment createdBy any teacher
const rejectAssignment = asyncHandler(async (request, response) => {
    const user = request.user
    const { id } = request.params

    if (user.role !== 'admin') {
        response.status(403)
        throw new Error(`Access denied. Only admin can approve assignments`)
    }

    const assignment = await Assignment.findById(id)
    if (!assignment) {
        response.status(404)
        throw new Error(`Assignment not found`)
    }

    if (assignment.status === 'rejected') {
        response.status(400)
        throw new Error(`Assignment is already rejected`)
    }

    assignment.status = 'rejected'
    const rejectedAssignment = await Assignment.findByIdAndUpdate(id, assignment, { new: true })

    response.status(200).json({
        message: `Assignment rejected successfully`,
        assignment: rejectedAssignment
    })
})

// Only students can submit assignment, resubmission for any assignment is not possible
const submitAssignment = asyncHandler(async (request, response) => {
    const { id } = request.params
    const { content } = request.body
    const user = request.user

    if (!mongoose.Types.ObjectId.isValid(id)) {
        response.status(400)
        throw new Error('Invalid assignment ID')
    }

    if (!content) {
        response.status(400);
        throw new Error('Submission content is required')
    }

    const assignment = await Assignment.findById(id)
    if (!assignment) {
        response.status(404)
        throw new Error('Assignment not found')
    }

    if (assignment.status !== 'approved') {
        response.status(400)
        throw new Error(`The assignment you are trying to submit is not yet approved`)
    }

    // Check if student has already submitted
    const existingSubmission = await Submission.find({ assignment: id, student: user._id })
    if (existingSubmission.length !== 0) {
        response.status(400)
        throw new Error('You have already submitted this assignment')
    }

    const submission = await Submission.create({
        assignment: id,
        student: user._id,
        content,
        submittedAt: Date.now()
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

    const submissions = await Submission.find({ assignment: id }).populate('assignment', 'title createdBy').populate('student', 'name level')
    if (user._id.toString() !== submissions[0].assignment.createdBy.toString()) {
        response.status(403)
        throw new Error(`Access denied. Only author of assignment can access submissions`)
    }

    if (submissions.length === 0) {
        response.status(404)
        throw new Error(`No assignment is submitted yet.`)
    }

    response.status(200).json({
        count: submissions.length,
        submissions
    })
})

/* teacher can only mark submissions for the assignments they created, and can give feedback along with marks */
const markSubmission = asyncHandler(async (request, response) => {
    const { id } = request.params
    const user = request.user
    const { marks, feedback } = request.body

    if (marks === null || marks === undefined || typeof (marks) !== 'number') {
        response.status(400)
        throw new Error(`Invalid marks`)
    }

    const submission = await Submission.findById(id)
    if (!submission) {
        response.status(404)
        throw new Error(`Submision not found`)
    }

    const assignment = await Assignment.findById(submission.assignment)
    if (!assignment) {
        response.status(404)
        throw new Error(`Assignment not found`)
    }

    if (user._id.toString() !== assignment.createdBy.toString()) {
        response.status(403)
        throw new Error(`Access denied. Only author of the assignment can mark submisions`)
    }

    if (marks && (marks < 0 || marks > assignment.marks)) {
        response.status(400)
        throw new Error(`Marks must be between 0 to ${assignment.marks}`)
    }

    submission.result = marks
    if (feedback) submission.feedback = feedback
    submission.status = 'marked'

    const updatedSubmission = await Submission.findByIdAndUpdate(id, submission, { new: true })

    response.status(200).json({
        message: `Submission marked successfully`,
        submission: updatedSubmission
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