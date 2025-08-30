import asyncHandler from "express-async-handler"
import { Assignment } from "../models/assignment.model.mjs"
import mongoose from "mongoose"


const getAllAssignments = asyncHandler(async (request, response) => {
    const assignments = await Assignment.find().select('title description level marks startDate dueDate')

    if (assignments.length === 0) {
        response.status(404)
        throw new Error(`Assignments not found`)
    }

    response.status(200).json({
        success: true,
        count: assignments.length,
        assignments
    })
})

const getSingleAssignment = asyncHandler(async (request, response) => {
    const { id } = request.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
        response.status(400)
        throw new Error(`Invalid assignment Id`)
    }
    const assignment = await Assignment.findById(id)
    if (!assignment) {
        response.status(404)
        throw new Error(`Assignment not found`)
    }
    if( request.user.role.toString() === 'student' ){
        response.status(200).json({
            success: true,
            assignment: {
                title: assignment.title,
                description: assignment.description,
                level: assignment.level,
                marks: assignment.marks,
                startDate: assignment.startDate,
                dueDate: assignment.dueDate
            }
        })
    }
    response.status(200).json({
        success: true,
        assignment
    })
})

const createAssignment = asyncHandler(async (request, response) => {
    const { title, description, level, marks, startDate, dueDate } = request.body

    if (!title || !description || !level || !marks || !startDate || !dueDate) {
        response.status(400)
        throw new Error(`Input all fields`)
    }

    if (startDate && isNaN(new Date(startDate).getTime())) {
        response.status(400)
        throw new Error('Invalid start date format');
    }

    if (dueDate && isNaN(new Date(dueDate).getTime())) {
        response.status(400)
        throw new Error('Invalid due date format');
    }

    const start = new Date(startDate);
    const due = new Date(dueDate);
    // Adjust dueDate to end of the day (23:59:59.999)
    due.setHours(23, 59, 59, 999);

    const assignment = new Assignment({
        title, description, level, marks, createdBy: request.user._id, startDate: start, dueDate: due
    })
    await assignment.save();

    response.status(201).json({
        message: `Assignment created successfully`,
        success: true,
        assignment
    })
})

const updateAssignment = asyncHandler(async (request, response) => {
    const { title, description, level, marks, startDate, dueDate } = request.body

    const assignment = await Assignment.findById(request.params.id)
    if (!assignment) {
        response.status(404)
        throw new Error(`Assignment not found`)
    }

    if (startDate && isNaN(new Date(startDate).getTime())) {
        response.status(400)
        throw new Error('Invalid start date format');
    }

    let due
    if (dueDate) {
        due = new Date(dueDate);
        due.setHours(23, 59, 59, 999);
    }
    if (dueDate && isNaN(new Date(dueDate).getTime())) {
        response.status(400)
        throw new Error('Invalid due date format');
    }

    if (assignment.createdBy.toString() !== request.user._id.toString() || request.user.role !== 'teacher') {
        response.status(403);
        throw new Error('Not authorized to update this assignment');
    }

    assignment.title = title || assignment.title;
    assignment.description = description || assignment.description;
    assignment.level = level || assignment.level;
    assignment.marks = marks || assignment.marks;
    assignment.startDate = startDate ? new Date(startDate) : assignment.startDate;
    assignment.dueDate = dueDate ? due : assignment.dueDate;

    // const updatedAssignment = await assignment.save();
    const updatedAssignment = await Assignment.findByIdAndUpdate(request.params.id, assignment, { new: true })

    response.status(200).json({
        message: `Assignment updated successfully`,
        success: true,
        assignment: updatedAssignment,
    });
})

const deleteAssignment = asyncHandler(async (request, response) => {
    const assignment = await Assignment.findById(request.params.id)
    if (!assignment) {
        response.status(404)
        throw new Error(`Assignment not found`)
    }

    if (assignment.createdBy.toString() !== request.user._id.toString() || request.user.role !== 'teacher') {
        response.status(403);
        throw new Error('Not authorized to update this assignment');
    }

    await Assignment.deleteOne({ _id: request.params.id })
    response.status(200).json({
        message: `Assignmnet deleted successfully`,
        success: true
    })
})

const submitAssignment = asyncHandler(async (request, response) => {
    const { id } = request.params; // Assignment ID
    const { content } = request.body; // Submission content (e.g., answers)

    // Validate assignment ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        response.status(400);
        throw new Error('Invalid assignment ID');
    }

    // Validate content
    if (!content) {
        response.status(400);
        throw new Error('Submission content is required');
    }

    // Find the assignment
    const assignment = await Assignment.findById(id);
    if (!assignment) {
        response.status(404);
        throw new Error('Assignment not found');
    }

    // Check if assignment is open for submissions (dueDate validation)
    if (assignment.dueDate && new Date(assignment.dueDate) < new Date()) {
        response.status(400);
        throw new Error('Submission deadline has passed');
    }

    // Check if student already submitted
    const existingSubmission = assignment.submissions.find(
        (submission) => submission.userId.toString() === request.user._id.toString()
    );
    if (existingSubmission) {
        response.status(400);
        throw new Error('You have already submitted this assignment');
    }

    // Create new submission
    const submission = {
        userId: request.user._id,
        content,
        submittedAt: new Date(), // UTC timestamp
    };

    // Add submission to the assignment's submissions array
    assignment.submissions.push(submission);

    // Save the updated assignment
    await assignment.save();

    response.status(201).json({
        message: 'Assignment submitted successfully',
        success: true,
        submission,
    });
})

export {
    getAllAssignments,
    getSingleAssignment,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    submitAssignment
}