import asyncHandler from "express-async-handler";
import { Announcement } from "../models/anouncement.model.mjs";

const getAllAnnouncement = asyncHandler(async (request, response) => {

    if (request.user.role === 'student') {
        const level = request.user.level;

        const announcements = await Announcement.find({ level }).populate('createdBy', 'name email')
        if (announcements.length === 0) {
            response.status(404)
            throw new Error(`Announcements are yet to made`)
        }
        response.status(200).json({
            success: true,
        count: announcements.length,
            announcements
        })
    }

    const announcements = await Announcement.find()
    if (announcements.length === 0) {
        response.status(404)
        throw new Error(`Announcements are yet to made`)
    }
    response.status(200).json({
        announcements
    })
})

const createAnnouncement = asyncHandler(async (request, response) => {
    const { title, content, level } = request.body
    if( !title || !content || !level ){
        response.status(400)
        throw new Error(`Input all fields`)
    }
    const announcement = await Announcement.create({ title, content, level, createdBy: request.user._id })
    response.status(201).json({
        message: `Announcement created successfully.`,
        success: true,
        announcement
    })
})

const updateAnnouncement = asyncHandler(async (request, response) => {

    const { id } = request.params
    const { title, content, level } = request.body
    if( !title || !content || !level ){
        response.status(400)
        throw new Error(`Input all fields`)
    }

    const announcement = await Announcement.findById(id)
    if(!announcement){
        response.status(404)
        throw new Error(`Announcement not found`)
    }

    const updatedAnnouncement = await Announcement.findByIdAndUpdate( id, { title, content, level }, {new: true} )
    response.status(200).json({
        message: `Announcement updated successfully`,
        announcement: updatedAnnouncement
    })
})

const deleteAnnouncement = asyncHandler(async (request, response) => {
    const announcement = await Announcement.findById(request.params.id)
    if(!announcement){
        response.status(404)
        throw new Error(`Announcement not found`)
    }

    const announcementDeleted = await Announcement.findByIdAndDelete(request.params.id)
    if(!announcementDeleted){
        response.status(500)
        throw new Error(`Error deleting announcement`)
    }
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