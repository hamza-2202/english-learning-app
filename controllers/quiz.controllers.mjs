import asyncHandler from "express-async-handler"
import { Quiz } from "../models/quiz.model.mjs"
import { Question } from "../models/quiz.question.model.mjs"

const getAllQuiz = asyncHandler(async (request, response) => {
    const user = request.user

    if (user.role === 'student') {
        const quizzes = await Quiz.find({ level: user.level, status: 'approved' })

        if (quizzes.length === 0) {
            response.status(404)
            throw new Error(`Quiz not found`)
        }

        response.status(200).json({
            count: quizzes.length,
            quizzes
        })
    }

    if (user.role === 'teacher') {
        const quizzes = await Quiz.find({ createdBy: user._id }).populate('createdBy', 'name role')
        if (quizzes.length === 0) {
            response.status(404)
            throw new Error(`You have not created any quiz yet`)
        }

        response.status(200).json({
            count: quizzes.length,
            quizzes
        })
    }

    if (user.role === 'admin') {
        const quizzes = await Quiz.find()
        if (quizzes.length === 0) {
            response.status(404)
            throw new Error(`Quiz not found`)
        }

        response.status(200).json({
            count: quizzes.length,
            quizzes
        })
    }
})

const getSingleQuiz = asyncHandler(async (request, response) => {
    const user = request.user
    const { id } = request.params

    if (user.role === 'student') {
        const quiz = await Quiz.findById(id).populate({
            path: 'questions',
            select: '_id question options answer marks'
        })

        if (!quiz) {
            response.status(404)
            throw new Error(`Quiz not found`)
        }

        response.status(200).json({
            quiz
        })
    }

    if (user.role === 'teacher') {
        const quiz = await Quiz.findById(id).populate({
            path: 'questions',
            select: '_id question options answer marks'
        })

        if (!quiz) {
            response.status(404)
            throw new Error(`Quiz not found`)
        }

        if (user._id.toString() !== quiz.createdBy.toString()) {
            response.status(401)
            throw new Error(`Access denied. You are not the author of the quiz`)
        }

        response.status(200).json({
            quiz
        })
    }

    if (user.role === 'admin') {
        const quiz = await Quiz.findById(id).populate('questions', '_id question options answer marks').populate('createdBy', 'name email role')

        if (!quiz) {
            response.status(404)
            throw new Error(`Quiz not found`)
        }

        response.status(200).json({
            quiz
        })
    }
})

const createQuiz = asyncHandler(async (request, response) => {
    const user = request.user
    const { title, description, level, category } = request.body

    if (!title || !level || !category) {
        response.status(400)
        throw new Error(`Input all fields`)
    }

    const allowedLevel = ['beginner', 'intermediate', 'advance']
    if (!allowedLevel.includes(level)) {
        response.status(400)
        throw new Error(`Level: ${level} is not a valid level value`)
    }

    const allowedCategory = ['grammar', 'vocabulary', 'reading', 'writing', 'listening', 'speaking']
    if (!allowedCategory.includes(category)) {
        response.status(400)
        throw new Error(`Category: ${category} is not valid a category value`)
    }

    const quiz = await Quiz.create({ title, description, level, category, createdBy: user._id })
    response.status(201).json({
        message: `Quiz created successfully`,
        quiz
    })
})

const updateQuiz = asyncHandler(async (request, response) => {
    const { id } = request.params
    const user = request.user
    const { title, description, level, category } = request.body

    if (!title || !level || !category) {
        response.status(400)
        throw new Error(`Input all fields`)
    }

    const quiz = await Quiz.findById(id)
    if (!quiz) {
        response.status(404)
        throw new Error(`Quiz not found`)
    }

    if (quiz.status === 'rejected') {
        response.status(401)
        throw new Error(`This quiz has already been rejected by admin`)
    }

    if (quiz.createdBy.toString() !== user._id.toString()) {
        response.status(403)
        throw new Error(`Access denied, Not authorized to update this quiz`)
    }

    const allowedLevel = ['beginner', 'intermediate', 'advance']
    if (!allowedLevel.includes(level)) {
        response.status(400)
        throw new Error(`Level: ${level} is not a valid level value`)
    }

    const allowedCategory = ['grammar', 'vocabulary', 'reading', 'writing', 'listening', 'speaking']
    if (!allowedCategory.includes(category)) {
        response.status(400)
        throw new Error(`Category: ${category} is not valid a category value`)
    }

    const updatedQuiz = await Quiz.findByIdAndUpdate(id, { title, description, level, category }, { new: true })
    response.status(201).json({
        message: `Quiz updated successfully`,
        quiz: updatedQuiz
    })
})

const deleteQuiz = asyncHandler(async (request, response) => {
    const { id } = request.params
    const user = request.user

    const quiz = await Quiz.findById(id)
    if (!quiz) {
        response.status(404)
        throw new Error(`Quiz not found`)
    }

    if (quiz.createdBy.toString() !== user._id.toString()) {
        response.status(403)
        throw new Error(`Access denied, Not authorized to delete this quiz`)
    }

    await Quiz.findByIdAndDelete(id)
    await Question.deleteMany({quiz: id})

    response.status(200).json({
        message: `Quiz deleted successfully`
    })
})

const addQuestion = asyncHandler(async (request, response) => {
    const user = request.user
    const { question, options, answer, marks } = request.body
    const { id } = request.params

    const quiz = await Quiz.findById(id)
    if (!quiz) {
        response.status(404)
        throw new Error(`Quiz not found`)
    }

    if (quiz.createdBy.toString() !== user._id.toString()) {
        response.status(403)
        throw new Error(`Access denied. You are not the author of the quiz`)
    }

    if (!question || !options || !answer || !marks) {
        response.status(400)
        throw new Error(`Input all fields`)
    }

    if (!Number.isInteger(marks) || marks < 0) {
        response.status(400)
        throw new Error(`Marks must be a non-negative integer`)
    }

    if(options.length < 2){
        response.status(400)
        throw new Error(`Minimum 2 options are required`)
    }

    if (!options.includes(answer)) {
        response.status(400)
        throw new Error(`answer is not included in the options`)
    }

    const newQuestion = await Question.create({ question, options, answer, marks, quiz: quiz._id })

    if (!newQuestion) {
        response.status(500)
        throw new Error(`Server error: Question could not be saved`)
    }
    try {
        quiz.questions.push(newQuestion._id)
        quiz.totalMarks = quiz.totalMarks + marks
        await quiz.save()

    } catch (error) {
        await Question.findByIdAndDelete(newQuestion._id)
        response.status(500)
        throw new Error(`Something went wrong. ${error.message}`)
    }

    response.status(200).json({
        message: `Question added successfully`,
        question: newQuestion
    })
})

const updateQuestion = asyncHandler(async (request, response) => {
    const user = request.user
    const { question, options, answer, marks } = request.body
    const { id } = request.params

    const newQuestion = await Question.findById(id)
    if (!newQuestion) {
        response.status(404)
        throw new Error(`Question not found`)
    }

    const quiz = await Quiz.findById(newQuestion.quiz)
    if (!quiz) {
        response.status(404)
        throw new Error(`Quiz not found`)
    }

    if (quiz.createdBy.toString() !== user._id.toString()) {
        response.status(403)
        throw new Error(`Access denied. Only author of quiz can update question`)
    }

    if (!question || !options || !answer || !marks) {
        response.status(400)
        throw new Error(`Input all fields`)
    }

    if (!Number.isInteger(marks) || marks < 0) {
        response.status(400)
        throw new Error(`Marks must be a non-negative integer`)
    }
    
    if(options.length < 2){
        response.status(400)
        throw new Error(`Minimum 2 options are required`)
    }

    if (!options.includes(answer)) {
        response.status(400)
        throw new Error(`answer is not included in the options`)
    }

    let updatedQuestion;
    try {
        updatedQuestion = await Question.findByIdAndUpdate( id, {question, options, answer, marks}, {new: true})
        if(!updatedQuestion){
            response.status(500)
            throw new Error(`Question could not be updated`)
        }
        quiz.totalMarks -= newQuestion.marks
        quiz.totalMarks += marks
        await quiz.save()

    } catch (error) {
        response.status(500)
        throw new Error(`Something went wrong. ${error.message}`)
    }

    response.status(200).json({
        message: `Question updated successfully`,
        question: updatedQuestion
    })
})

const deleteQuestion = asyncHandler( async (request, response) => {
    const user = request.user
    const { id } = request.params

    const question = await Question.findById(id).populate('quiz', 'createdBy')
    if(!question){
        response.status(404)
        throw new Error(`Question not found`)
    }

    if(question.quiz.createdBy.toString() !== user._id.toString()){
        response.status(403)
        throw new Error(`Access denied, You are not the author of the quiz`)
    }

    const deletedQuestion = await Question.findByIdAndDelete(id)
    if(!deletedQuestion){
        response.status(500)
        throw new Error(`Something went wrong`)
    }
    response.status(200).json({
        message: `Question deleted successfully`
    })
})

const approveQuiz = asyncHandler(async (request, response) => {
    const { id } = request.params

    const quiz = await Quiz.findById(id)
    if (!quiz) {
        response.status(404)
        throw new Error(`Quiz not found`)
    }

    if (quiz.status === 'approved') {
        response.status(400)
        throw new Error(`Quiz is already approved`)
    }

    const updatedQuiz = await Quiz.findByIdAndUpdate(id, { status: 'approved' }, { new: true })
    response.status(200).json({
        message: `Quiz approved successfully`,
        quiz: updatedQuiz
    })
})

const rejectQuiz = asyncHandler(async (request, response) => {
    const { id } = request.params

    const quiz = await Quiz.findById(id)
    if (!quiz) {
        response.status(404)
        throw new Error(`Quiz not found`)
    }

    if (quiz.status === 'rejected') {
        response.status(400)
        throw new Error(`Quiz is already rejected`)
    }

    const updatedQuiz = await Quiz.findByIdAndUpdate(id, { status: 'rejected' }, { new: true })
    response.status(200).json({
        message: `Quiz rejected successfully`,
        quiz: updatedQuiz
    })
})

// const submitQuiz = asyncHandler(async (request, response) => {
//     const user = request.user
//     const { id } = request.params
//     const {}
// })

export {
    getAllQuiz,
    getSingleQuiz,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    approveQuiz,
    rejectQuiz
}