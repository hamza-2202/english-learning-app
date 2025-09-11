import { Lesson } from "../models/lesson.model.mjs";
import asyncHandler from "express-async-handler";


const getAllLesson = asyncHandler( async (request, response) => {

    const user = request.user

    if(user.role === 'student'){
        const lessons = await Lesson.find({ level: user.level })
        if (lessons.length === 0){
            response.status(404)
            throw new Error(`Lessons not found`)
        }
        response.status(200).json({
            count: lessons.length,
            lessons
        })
    } 
    
    if (user.role === 'teacher'){
        const lessons = await Lesson.find({createdBy: user._id})
        if (lessons.length === 0){
            response.status(404)
            throw new Error(`You have not created any lesson yet`)
        }
        response.status(200).json({
            count: lessons.length,
            lessons
        })
    }
    
    if (user.role === 'admin'){
        const lessons = await Lesson.find()
        if (lessons.length === 0){
            response.status(404)
            throw new Error(`Lessons not found`)
        }
        response.status(200).json({
            count: lessons.length,
            lessons
        })
    }
})

const createLesson = asyncHandler(async (request, response) => {
    const { title, description, level, category, url } = request.body
    const user = request.user

    if (!title || !level || !category || !url ) {
        response.status(400)
        throw new Error(`Input all fields`)
    }

    const lesson = new Lesson({
        title,
        description,
        level,
        category,
        url,
        createdBy: user._id
    })

    await lesson.save();
    response.status(201).json({
        message: 'Lesson created successfully',
        lesson
    })
})


const updateLesson = asyncHandler(async (request, response) => {

    const { id } = request.params
    const user = request.user
    const { title, description, level, category, url } = request.body

    const lesson = await Lesson.findById(id)
    if (!lesson) {
        response.status(404)
        throw new Error(`Lesson not found`)
    }

    if (user.role === 'teacher' && lesson.createdBy.toString() !== user._id.toString()) {
        response.status(403)
        throw new Error(`Access denied. Teachers can only update their own lessons.`)
    }

    const updatedLesson = await Lesson.findByIdAndUpdate(id, { title, description, level, category, url }, { new: true })

    response.status(200).json({ message: 'Lesson updated successfully', lesson: updatedLesson });
})


const deleteLesson = asyncHandler( async (request, response) => {

        const { id } = request.params
        const user = request.user

        const lesson = await Lesson.findById(id)
        if (!lesson) {
            return response.status(404).json({ message: 'Lesson not found' });
        }

        if (user.role === 'teacher' && lesson.createdBy.toString() !== user._id.toString()) {
            return response.status(403).json({ message: 'Access denied. Teachers can only delete their own lessons.' });
        }

        await Lesson.findByIdAndDelete(id);
        response.status(200).json({ message: 'Lesson deleted successfully' });
})

export {
    getAllLesson,
    createLesson,
    updateLesson,
    deleteLesson
}