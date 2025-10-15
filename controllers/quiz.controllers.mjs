import asyncHandler from "express-async-handler"
import { Quiz } from "../models/quiz.model.mjs"
import { Question } from "../models/quiz.question.model.mjs"
import { Lesson } from "../models/lesson.model.mjs"
import { Progress } from "../models/progress.model.mjs"
import { QuizSubmission } from "../models/quizSubmission.model.mjs"

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
        const quizzes = await Quiz.find({ createdBy: user._id }).populate({
            path: 'questions',
            select: '_id question options answer marks'
        })
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
            select: '_id question options marks'
        })

        if (!quiz) {
            response.status(404)
            throw new Error(`Quiz not found`)
        }

        const progress = await Progress.findOne({ user: user._id })
        if (!progress) {
            const newProgress = new Progress({ user: user._id, permanentPoints: 0, weeklyPoints: 0 })
            newProgress.save()

            response.status(401)
            throw new Error(`You must watch prerequisite lesson to start this quiz`)
        } 
        if (quiz.prerequisiteLesson && !progress.completedLessons.includes(quiz.prerequisiteLesson.toString())) {
            response.status(401)
            throw new Error(`You must watch prerequisite lesson to start this quiz`)
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
    const { title, description, level, category, prerequisiteLesson } = request.body

    if (!title || !level || !category) {
        response.status(400)
        throw new Error(`Title, level, and category are required`)
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

    let createData = { title: title.trim(), level: level.trim(), category: category.trim(), createdBy: user._id }
    if (description.trim()) {
        createData.description = description.trim()
    }

    if (prerequisiteLesson) {
        const lesson = await Lesson.findById(prerequisiteLesson.trim())
        if (!lesson) {
            response.status(400)
            throw new Error(`Prerequisite lesson with Id: ${prerequisiteLesson} does not exist`)
        }
        if (level.trim() !== lesson.level.trim()) {
            response.status(400)
            throw new Error(`Level of this quiz does not match the level of prerequisite lesson`)
        }
        createData.prerequisiteLesson = prerequisiteLesson.trim()
    }

    // check for duplicate title under same level
    const existing = await Quiz.findOne({ title, level })
    if (existing) {
        response.status(400)
        throw new Error(`Quiz with this title, and level already exists`)
    }

    const quiz = await Quiz.create(createData)
    response.status(201).json({
        message: `Quiz created successfully`,
        quiz
    })
})

const updateQuiz = asyncHandler(async (request, response) => {
    const { id } = request.params
    const user = request.user
    const { title, description, level, category, prerequisiteLesson } = request.body

    if (!title || !level || !category) {
        response.status(400)
        throw new Error(`Title, level, and category are required`)
    }

    const quiz = await Quiz.findById(id)
    if (!quiz) {
        response.status(404)
        throw new Error(`Quiz not found`)
    }

    if (quiz.createdBy.toString() !== user._id.toString()) {
        response.status(403)
        throw new Error(`Access denied, Not authorized to update this quiz`)
    }

    if (quiz.status === 'approved') {
        response.status(401)
        throw new Error(`This quiz has already been approved by admin`)
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

    let updateData = { title: title.trim(), level: level.trim(), category: category.trim() }
    if (description.trim()) {
        updateData.description = description.trim()
    }

    if (prerequisiteLesson !== undefined) {
        if (prerequisiteLesson) {
            const lesson = await Lesson.findById(prerequisiteLesson.trim())
            if (!lesson) {
                response.status(400)
                throw new Error(`Prerequisite lesson with id ${prerequisiteLesson} does not exist`)
            }
            if (level.trim() !== lesson.level.trim()) {
                response.status(400)
                throw new Error(`Level of this quiz does not match the level of prerequisite lesson`)
            }
            updateData.prerequisiteLesson = prerequisiteLesson.trim()
        }
        updateData.prerequisiteLesson = prerequisiteLesson
    }

    const updatedQuiz = await Quiz.findByIdAndUpdate(id, updateData, { new: true })
    response.status(200).json({
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
        throw new Error(`Quiz not found or already deleted`)
    }

    if (quiz.createdBy.toString() !== user._id.toString()) {
        response.status(403)
        throw new Error(`Access denied, Not authorized to delete this quiz`)
    }

    if (quiz.status === 'approved') {
        response.status(403)
        throw new Error(`Cannot delete already approved quiz`)
    }

    await Quiz.findByIdAndDelete(id)
    await Question.deleteMany({ quiz: id })
    await QuizSubmission.deleteMany({ quiz: id })

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

    if (quiz.status === 'approved') {
        response.status(403)
        throw new Error(`Cannot add question to already approved quiz`)
    }

    if (!question || !options || !answer || !marks) {
        response.status(400)
        throw new Error(`Input all fields`)
    }

    const questionExists = await Question.findOne({ quiz: id, question })
    if (questionExists) {
        response.status(400)
        throw new Error(`This quiz already contains the same question`)
    }


    if (!Number.isInteger(marks) || marks < 0) {
        response.status(400)
        throw new Error(`Marks must be a non-negative integer`)
    }

    if (options.length < 2) {
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

    if (quiz.status === 'approved') {
        response.status(403)
        throw new Error(`Cannot update already approved quiz`)
    }

    if (!question || !options || !answer || !marks) {
        response.status(400)
        throw new Error(`Input all fields`)
    }

    if (!Number.isInteger(marks) || marks < 0) {
        response.status(400)
        throw new Error(`Marks must be a non-negative integer`)
    }

    if (options.length < 2) {
        response.status(400)
        throw new Error(`Minimum 2 options are required`)
    }

    if (!options.includes(answer)) {
        response.status(400)
        throw new Error(`answer is not included in the options`)
    }

    let updatedQuestion;
    try {
        updatedQuestion = await Question.findByIdAndUpdate(id, { question, options, answer, marks }, { new: true })
        if (!updatedQuestion) {
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

const deleteQuestion = asyncHandler(async (request, response) => {
    const user = request.user
    const { id } = request.params

    const question = await Question.findById(id)
    if (!question) {
        response.status(404)
        throw new Error(`Question not found`)
    }

    const quiz = await Quiz.findById(question.quiz)
    if (!quiz) {
        response.status(404)
        throw new Error(`The quiz, this question relates to, is not found`)
    }
    if (quiz.createdBy.toString() !== user._id.toString()) {
        response.status(403)
        throw new Error(`Access denied, You are not the author of the quiz`)
    }

    if (quiz.status === 'approved') {
        response.status(403)
        throw new Error(`Cannot delete question of already approved quiz`)
    }

    const deletedQuestion = await Question.findByIdAndDelete(id)
    if (deletedQuestion === null) {
        response.status(500)
        throw new Error(`Question could not be deleted`)
    }
    quiz.totalMarks -= question.marks
    quiz.questions = quiz.questions.filter(question => question.toString() !== id)
    try {
        await quiz.save()
    } catch (error) {
        response.status(500)
        throw new Error('Failed to update totalMarks and questions array of quiz after deleting the question')
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

const submitQuiz = asyncHandler(async (request, response) => {
    const user = request.user
    const { id } = request.params           // quizId
    const { answers } = request.body        // array of object "submittedAnswers"

    const quiz = await Quiz.findById(id).populate('questions', '_id question options answer marks')
    if (!quiz) {
        response.status(404)
        throw new Error(`Quiz not found`)
    }
    if (quiz.status !== 'approved') {
        response.status(400)
        throw new Error('Quiz is not available for submission')
    }
    if (quiz.level.toString() !== user.level.toString()) {
        response.status(401)
        throw new Error(`You are not authorized to submit this quiz`)
    }

    const submissionExists = await QuizSubmission.findOne({ quiz: id, student: user._id })
    if (submissionExists) {
        response.status(400)
        throw new Error(`You have already submitted this quiz`)
    }

    let progress = await Progress.findOne({ user: user._id })

    if (!progress) {
        progress = new Progress({ user: user._id, completedLessons: [], permanentPoints: 0, weeklyPoints: 0 })
        await progress.save()
    }
    
    if (quiz.prerequisiteLesson) {
        const completedLessonIds = progress.completedLessons.map(lesson => lesson.toString())
        if (!completedLessonIds.includes(quiz.prerequisiteLesson.toString())) {
            response.status(401)
            throw new Error('You must watch the prerequisite lesson before submitting this quiz')
        }
    }

    const questions = quiz.questions
    if (!Array.isArray(answers) || answers.length > questions.length) {
        response.status(400)
        throw new Error('Invalid answers provided')
    }

    let obtainedMarks = 0
    const submissionObj = questions.map(question => {
        const questionIdStr = question._id.toString()
        const submittedAnswer = answers.find(ans => ans.questionId.toString() === questionIdStr)

        const selectedOption = submittedAnswer ? submittedAnswer.selectedOption.trim() : ""
        const isCorrect = selectedOption === question.answer.trim()
        if (isCorrect) { obtainedMarks += question.marks }
        return {
            questionId: question._id,
            question: question.question,
            options: question.options,
            selectedOption,
            answer: question.answer,
            marks: question.marks
        }
    })
    try {
        const submission = await QuizSubmission.create({ quiz: id, student: user._id, answers: submissionObj, totalMarks: quiz.totalMarks, obtainedMarks })
        progress.weeklyPoints += (obtainedMarks * 5)
        await progress.save()
        if (submission._id) {
            response.status(201).json({
                message: `Quiz submitted successfully`,
                success: true,
                totalMarks: quiz.totalMarks,
                obtainedMarks
            })
        }
    } catch (error) {
        response.status(500)
        throw new Error(`Something went wrong ${error.message}`)
    }
})

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
    rejectQuiz,
    submitQuiz
}