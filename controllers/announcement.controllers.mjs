import asyncHandler from "express-async-handler";
import { Announcement } from "../models/anouncement.model.mjs";
import { sanitizeHtml } from "../utils/sanitizer.mjs";
import mongoose from "mongoose";

const getAllAnnouncement = asyncHandler(async (request, response) => {
    const user = request.user

    if (user.role === 'student') {

        const announcements = await Announcement.find({ level: user.level }).populate('createdBy', 'name').lean()
        if (announcements.length === 0) {
            response.status(404)
            throw new Error(`Announcements are yet to made`)
        }
        response.status(200).json({
            count: announcements.length,
            announcements
        })
    }

    if (user.role === 'teacher') {
        const announcements = await Announcement.find({ createdBy: user._id }).populate('createdBy', 'name').lean()
        if (announcements.length === 0) {
            response.status(404)
            throw new Error(`You have not made any announcement yet`)
        }
        response.status(200).json({
            count: announcements.length,
            announcements
        })
    }

    if (user.role === 'admin') {
        const announcements = await Announcement.find().populate('createdBy', 'name email').lean()
        if (announcements.length === 0) {
            response.status(404)
            throw new Error(`Announcements are yet to made`)
        }
        response.status(200).json({
            count: announcements.length,
            announcements
        })
    }
    response.status(403)
    throw new Error(`Unauthorized`)
})

const createAnnouncement = asyncHandler(async (request, response) => {

    const user = request.user
    let { title: rawTitle, content: rawContent, level } = request.body

    if (!rawTitle || !rawContent || !level) {
        response.status(400)
        throw new Error(`Title, content, and level are required`)
    }

    const allowedLevels = ['beginner', 'intermediate', 'advance']
    if (!allowedLevels.includes(level)) {
        response.status(400)
        throw new Error(`Error: ${level} is not a valid level value`)
    }

    const title = sanitizeHtml(rawTitle)
    if (title.length < 10) {     // Post-sanitization check (e.g., if all was stripped)
        response.status(400)
        throw new Error('Invalid Title: title is too short after sanitization');
    }
    if (title !== rawTitle) {
        console.warn(`Title sanitized for user ${user._id}: unsafe elements detected`)    // Log for monitoring
    }

    const content = sanitizeHtml(rawContent)
    if (content.length < 10) {     // Post-sanitization check (e.g., if all was stripped)
        response.status(400)
        throw new Error('Invalid Content: content is too short after sanitization');
    }
    if (content !== rawContent) {
        console.warn(`Content sanitized for user ${user._id}: unsafe elements detected`)    // Log for monitoring
    }

    const existsAnnouncement = await Announcement.findOne({ title, level })
    if (existsAnnouncement) {
        response.status(400)
        throw new Error(`Announcement with similar title and level already exists`)
    }

    const announcement = await Announcement.create({ title, content, level, createdBy: user._id })
    response.status(201).json({
        message: `Announcement created successfully.`,
        announcement
    })
})

const updateAnnouncement = asyncHandler(async (request, response) => {

    const { id } = request.params
    const user = request.user
    let { title: rawTitle, content: rawContent, level } = request.body

    if (!mongoose.Types.ObjectId.isValid(id)) {
        response.status(400)
        throw new Error(`Invalid announcement id`)
    }

    const announcement = await Announcement.findById(id)
    if (!announcement) {
        response.status(404)
        throw new Error(`Announcement not found`)
    }

    if (announcement.createdBy.toString() !== user._id.toString()) {
        response.status(401)
        throw new Error(`Unauthorized, you are not the author of this announcement`)
    }

    if (!rawTitle || !rawContent || !level) {
        response.status(400)
        throw new Error(`Title, content, and level are required`)
    }

    const allowedLevels = ['beginner', 'intermediate', 'advance']
    if (!allowedLevels.includes(level)) {
        response.status(400)
        throw new Error(`Error: ${level} is not a valid level value`)
    }

    const title = sanitizeHtml(rawTitle)
    if (title.length < 10) {     // Post-sanitization check (e.g., if all was stripped)
        response.status(400)
        throw new Error('Invalid Title: title is too short after sanitization');
    }
    if (title !== rawTitle) {
        console.warn(`Title sanitized for user ${user._id}: unsafe elements detected`)    // Log for monitoring
    }
    if (title.length > 300) {
        response.status(400)
        throw new Error(`Maximum 300 characters are allowed for announcement title`)
    }

    const content = sanitizeHtml(rawContent)
    if (content.length < 10) {     // Post-sanitization check (e.g., if all was stripped)
        response.status(400)
        throw new Error('Invalid Content: content is too short after sanitization');
    }
    if (content !== rawContent) {
        console.warn(`Content sanitized for user ${user._id}: unsafe elements detected`)    // Log for monitoring
    }
    if (content.length > 1500) {
        response.status(400)
        throw new Error(`Maximum 1500 characters are allowed for announcement content`)
    }

    const existsAnnouncement = await Announcement.findOne({ title, level, _id: { $ne: id } })
    if (existsAnnouncement) {
        response.status(400)
        throw new Error(`Announcement with similar title and level already exists`)
    }

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(id, { title, content, level }, { new: true })
    response.status(200).json({
        message: `Announcement updated successfully`,
        announcement: updatedAnnouncement
    })
})

const deleteAnnouncement = asyncHandler(async (request, response) => {

    const { id } = request.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
        response.status(400)
        throw new Error(`Invalid announcement id`)
    }

    const announcement = await Announcement.findById(id)
    if (!announcement) {
        response.status(404)
        throw new Error(`Announcement not found`)
    }

    if (announcement.createdBy.toString() !== request.user._id.toString()) {
        response.status(401)
        throw new Error(`Unauthorized, you are not the author of this announcement`)
    }

    await Announcement.findByIdAndDelete(id)

    response.status(200).json({
        message: `Announcement deleted successfully`
    })

})

export {
    getAllAnnouncement,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement
}