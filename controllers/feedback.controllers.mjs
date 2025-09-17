import { Feedback } from "../models/lesson.feedback.mjs"
import { Lesson } from "../models/lesson.model.mjs"
import asyncHandler from "express-async-handler"


const createFeedback = asyncHandler(async (request, response) => {
    const { id } = request.params
    const { content } = request.body
    const user = request.user

    if (!content) {
        response.status(400)
        throw new Error(`Comment cannot be empty`)
    }

    const lesson = await Lesson.findById(id)
    if (!lesson) {
        response.status(404)
        throw new Error(`The lesson, you are trying to comment, does not exists`)
    }

    const feedback = new Feedback({
        lesson: lesson._id,
        user: user._id,
        content,
        replies: []
    })
    await feedback.save()
    await Lesson.findByIdAndUpdate(id, { $push: { feedbacks: feedback._id } })
    const updatedFeedback = await Feedback.findById(feedback._id)
        .populate('user', 'name role')

    response.status(201).json({
        message: 'Comment posted successfully',
        feedback: updatedFeedback
    })
})

const updateFeedback = asyncHandler(async (request, response) => {

    const { id } = request.params
    const user = request.user
    const { content } = request.body

    const feedback = await Feedback.findById(id);
    if (!feedback) {
        response.status(404)
        throw new Error(`Comment not found`)
    }

    if (feedback.user.toString() !== user._id.toString()) {
        response.status(403)
        throw new Error(`Access denied. User can only update their own comment`)
    }

    if (!content) {
        response.status(400)
        throw new Error(`Comment cannot be empty`)
    }

    feedback.content = content;
    await feedback.save()

    const updatedFeedback = await Feedback.findById(id)
        .populate('user', 'name role')

    response.status(200).json({
        message: 'Comment updated successfully',
        feedback: updatedFeedback
    })
})

const deleteFeedback = asyncHandler(async (request, response) => {

    const { id } = request.params
    const user = request.user

    const feedback = await Feedback.findById(id)
    if (!feedback) {
        response.status(404)
        throw new Error(`Comment not found`)
    }

    if (user.role === 'student' && feedback.user.toString() !== user._id.toString()) {
        response.status(403)
        throw new Error(`Access denied. Students can only delete their own comments`)
    }

    await Feedback.findByIdAndDelete(id)

    response.status(200).json({
        message: 'Comment deleted successfully'
    })
})

const createReply = asyncHandler(async (request, response) => {

    const { feedbackId } = request.params
    const { content } = request.body
    const user = request.user

    if (!content) {
        response.status(400)
        throw new Error(`Comment cannot be empty`)
    }

    const feedback = await Feedback.findById(feedbackId)
    if (!feedback) {
        response.status(404)
        throw new Error(`The comment you are trying to reply does not exists`)
    }

    feedback.replies.push({
        user: user._id,
        content,
        postedAt: new Date()
    })
    await feedback.save()

    const updatedFeedback = await Feedback.findById(feedbackId)
        .populate('user', 'name role')
        .populate('replies.user', 'name role')

    response.status(201).json({
        message: 'Reply added successfully',
        feedback: updatedFeedback
    })
})

const updateReply = asyncHandler(async (request, response) => {

    const { feedbackId, replyId } = request.params
    const user = request.user
    const { content } = request.body

    const feedback = await Feedback.findById(feedbackId)
    if (!feedback) {
        response.status(404)
        throw new Error(`Comment not found`)
    }

    const reply = feedback.replies.id(replyId)
    if (!reply) {
        response.status(404)
        throw new Error(`Reply not found`)
    }

    if (reply.user.toString() !== user._id.toString()) {
        response.status(403)
        throw new Error(`Access denied. User] can only update their own replies`)
    }

    if (!content) {
        response.status(400)
        throw new Error(`Comment cannot be empty`)
    }

    reply.content = content
    await feedback.save()

    const updatedFeedback = await Feedback.findById(feedbackId)
        .populate('user', 'name role')
        .populate('replies.user', 'name role')

    response.status(200).json({
        message: 'Reply updated successfully',
        feedback: updatedFeedback
    })
})

const deleteReply = asyncHandler(async (request, response) => {

    const { feedbackId, replyId } = request.params;
    const user = request.user;

    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
        response.status(404)
        throw new Error(`Comment not found`)
    }

    const reply = feedback.replies.id(replyId);
    if (!reply) {
        response.status(404)
        throw new Error(`Reply not found`)
    }

    if (user.role === 'student' && reply.user.toString() !== user._id.toString()) {
        response.status(403)
        throw new Error(`Access denied. Students can only delete their own replies`)
    }

    feedback.replies.pull(replyId)
    await feedback.save()

    const updatedFeedback = await Feedback.findById(feedbackId)
        .populate('user', 'name role')
        .populate('replies.user', 'name role')

    response.status(200).json({
        message: 'Reply deleted successfully',
        feedback: updatedFeedback
    })
})

export {
    createFeedback,
    updateFeedback,
    deleteFeedback,
    createReply,
    updateReply,
    deleteReply
}