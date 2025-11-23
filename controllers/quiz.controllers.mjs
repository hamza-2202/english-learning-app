import asyncHandler from "express-async-handler"
import { Quiz } from "../models/quiz.model.mjs"
import { Question } from "../models/quiz.question.model.mjs"
import { Lesson } from "../models/lesson.model.mjs"
import { Progress } from "../models/progress.model.mjs"
import { QuizSubmission } from "../models/quizSubmission.model.mjs"
import mongoose from "mongoose"
import { request } from "express"

const getAllQuiz = asyncHandler(async (request, response) => {
    const user = request.user
    let quizzes = []
    let count = 0

    if (user.role === 'student') {
        quizzes = await Quiz.find({ level: user.level, status: 'approved' })
            .select("title description category totalMarks prerequisiteLesson")
            .populate("prerequisiteLesson", "title category url")
            .lean()

        if (quizzes.length === 0) {
            response.status(404)
            throw new Error(`No quizzes available for your level yet`)
        }

        const quizIds = quizzes.map(quiz => quiz._id)

        const submissions = await QuizSubmission.find({
            student: user._id,
            quiz: { $in: quizIds }
        })
            .select("quiz obtainedMarks")
            .lean()

        console.log(submissions);

        const submissionMap = new Map(submissions.map(s => [s.quiz.toString(), s.obtainedMarks]))

        quizzes = quizzes.map(quiz => ({
            ...quiz,
            obtainedMarks: submissionMap.get(quiz._id.toString()) >= 0 ? submissionMap.get(quiz._id.toString()) : null,
            status: submissionMap.get(quiz._id.toString()) >= 0 ? "submitted" : "not submitted"
        }))
        count = quizzes.length
    }

    if (user.role === 'teacher') {
        quizzes = await Quiz.find({ createdBy: user._id })
            .select("-createdBy -__v -questions")
            .populate("prerequisiteLesson", "title category url")
            .sort({ createdAt: -1 })
            .lean()

        if (quizzes.length === 0) {
            response.status(404)
            throw new Error(`You have not created any quiz yet`)
        }
        count = quizzes.length
    }

    if (user.role === 'admin') {
        quizzes = await Quiz.find()
            .select("-__v -questions")
            .populate("createdBy", "name email")
            .populate("prerequisiteLesson", "title category url")
            .sort({ createdAt: -1 })
            .lean()

        if (quizzes.length === 0) {
            response.status(404)
            throw new Error(`Quiz not found`)
        }
        count = quizzes.length
    }
    response.status(200).json({
        count,
        quizzes
    })
})

const getSingleQuiz = asyncHandler(async (request, response) => {
    const user = request.user
    const { id } = request.params

    if (user.role === 'student') {
        const quiz = await Quiz.findById(id)
            .populate('questions', '_id question options marks')
            .select("-prerequisiteLesson -createdBy -createdAt -updatedAt -__v")
            .lean()

        if (!quiz) {
            response.status(404)
            throw new Error(`Quiz not found`)
        }

        if (quiz.status !== "approved") {
            response.status(400)
            throw new Error(`This quiz is not approved`)
        }

        let progress = await Progress.findOne({ user: user._id })
        if (!progress) {
            progress = new Progress({ user: user._id, level: user.level, completedLessons: [], completedQuizzes: [], completedAssignments: [] })
            await progress.save()
        }
        if (quiz.prerequisiteLesson && !progress.completedLessons.includes(quiz.prerequisiteLesson.toString())) {
            response.status(401)
            throw new Error(`You must watch prerequisite lesson to start this quiz`)
        }

        const isSubmitted = await QuizSubmission.findOne({ quiz: id, student: user._id }).select('obtainedMarks').lean()
        if (isSubmitted) {
            response.status(400)
            throw new Error(`You have already submitted this quiz`)
        }

        response.status(200).json({
            quiz
        })
    }

    if (user.role === 'teacher') {
        const quiz = await Quiz.findById(id)
            .populate('questions', '_id question options answer marks')
            .populate("prerequisiteLesson", "title level category url")
            .lean()

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
        const quiz = await Quiz.findById(id)
            .populate('questions', '_id question options answer marks')
            .populate('prerequisiteLesson', 'title category url')
            .populate('createdBy', 'name email role')
            .lean()

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
    if (description) {
        createData.description = description.trim()
    } else {
        createData.description = null
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
    } else {
        createData.prerequisiteLesson = null
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
        response.status(400)
        throw new Error(`Invalid quiz id`)
    }

    const quiz = await Quiz.findById(id).populate("prerequisiteLesson", "level")
    if (!quiz) {
        response.status(404)
        throw new Error(`Quiz not found`)
    }

    if (quiz.createdBy.toString() !== user._id.toString()) {
        response.status(403)
        throw new Error(`Access denied, Not authorized to update this quiz`)
    }

    if (quiz.status === 'approved') {
        response.status(403)
        throw new Error(`This quiz has already been approved by admin`)
    }

    const allowedLevel = ['beginner', 'intermediate', 'advance']
    if (!allowedLevel.includes(level.trim())) {
        response.status(400)
        throw new Error(`Level: ${level} is not a valid level value`)
    }

    const allowedCategory = ['grammar', 'vocabulary', 'reading', 'writing', 'listening', 'speaking']
    if (!allowedCategory.includes(category.trim())) {
        response.status(400)
        throw new Error(`Category: ${category} is not valid a category value`)
    }

    let updateData = { title: title.trim(), level: level.trim(), category: category.trim() }
    if (description) {
        updateData.description = description?.trim()
    }

    let isPrerequisiteLesson;
    if (prerequisiteLesson) {
        const lesson = await Lesson.findById(prerequisiteLesson.trim()).select("level").lean()
        if (!lesson) {
            response.status(400)
            throw new Error(`Prerequisite lesson with id ${prerequisiteLesson} does not exist`)
        }
        if (level !== lesson.level) {
            response.status(400)
            throw new Error(`Level '${level}' does not match the level '${lesson.level}' of prerequisite lesson`)
        }
        isPrerequisiteLesson = prerequisiteLesson.trim()
    }
    if (prerequisiteLesson === undefined) {
        if (quiz.prerequisiteLesson && level !== quiz.prerequisiteLesson.level) {
            response.status(400)
            throw new Error(`Level '${level}' does not match the level '${quiz.prerequisiteLesson.level}' of prerequisite lesson`)
        }
    }
    if (prerequisiteLesson === null) {
        isPrerequisiteLesson = prerequisiteLesson
    }
    updateData.prerequisiteLesson = isPrerequisiteLesson

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
    let { question, options, answer, marks } = request.body
    const { id } = request.params

    const session = await mongoose.startSession()
    session.startTransaction()
    try {
        const quiz = await Quiz.findById(id).session(session)
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

        const questionExists = await Question.findOne({ quiz: id, question }).session(session)
        if (questionExists) {
            response.status(400)
            throw new Error(`This quiz already contains the same question`)
        }

        question = question.trim()
        options = options.map(option => option.trim())
        answer = answer.trim()
        marks = Number(marks)

        if (!Number.isInteger(marks) || marks < 0) {
            response.status(400)
            throw new Error(`Marks must be a non-negative integer`)
        }

        if (options.length < 2 || options.length > 5) {
            response.status(400)
            throw new Error(`Options must be between 2 - 5`)
        }

        if (!options.includes(answer)) {
            response.status(400)
            throw new Error(`answer is not included in the options`)
        }

        const [newQuestion] = await Question.create([{ question, options, answer, marks, quiz: quiz._id }], { session })

        // Use atomic update for quiz
        await Quiz.findByIdAndUpdate(quiz._id, {
            $push: { questions: newQuestion._id },
            $inc: { totalMarks: marks }
        }, { session })

        await session.commitTransaction()

        response.status(200).json({
            message: `Question added successfully`,
            question: newQuestion
        })

    } catch (error) {
        await session.abortTransaction()

        throw new Error(error.message)
    } finally {
        await session.endSession()
    }
})

const updateQuestion = asyncHandler(async (request, response) => {
    const user = request.user
    let { question, options, answer, marks } = request.body
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

    question = question.trim()
    options = options.map(option => option.trim())
    answer = answer.trim()
    marks = Number(marks)

    if (!question || !options || !answer || !marks) {
        response.status(400)
        throw new Error(`Input all fields`)
    }

    if (!Number.isInteger(marks) || marks < 0) {
        response.status(400)
        throw new Error(`Marks must be a non-negative integer`)
    }

    if (options.length < 2 || options.length > 5) {
        response.status(400)
        throw new Error(`Options must be between 2 - 5`)
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
        throw new Error(`Error: ${error.message}`)
    }

    response.status(200).json({
        message: `Question updated successfully`,
        question: updatedQuestion
    })
})

const deleteQuestion = asyncHandler(async (request, response) => {
    const user = request.user
    const { id } = request.params

    const session = await mongoose.startSession()
    session.startTransaction()
    try {
        const question = await Question.findById(id).session(session)
        if (!question) {
            response.status(404)
            throw new Error(`Question not found`)
        }

        const quiz = await Quiz.findById(question.quiz).session(session)
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

        const deletedQuestion = await Question.findByIdAndDelete(id).session(session)
        if (deletedQuestion === null) {
            response.status(500)
            throw new Error(`Question could not be deleted`)
        }
        quiz.totalMarks -= question.marks
        quiz.questions = quiz.questions.filter(question => question.toString() !== id)

        await quiz.save({ session })

        await session.commitTransaction()
        response.status(200).json({
            message: `Question deleted successfully`
        })
    } catch (error) {
        await session.abortTransaction()

        throw new Error(error.message)
    } finally {
        await session.endSession()
    }
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
    const { id } = request.params   // quizId
    const { answers } = request.body    // array of "submittedAnswers"

    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        // 1. Get the user's progress (session data)
        let progress = await Progress.findOne({ user: user._id }).select('completedLessons completedQuizzes permanentPoints weeklyPoints').session(session)

        if (!progress) {
            progress = new Progress({ user: user._id, level: user.level })
            await progress.save({ session })
        }

        // 2. Check if the user has already submitted this quiz
        if (progress.completedQuizzes.includes(id)) {
            response.status(400)
            throw new Error(`You have already submitted this quiz`)
        }

        // 3. Find the quiz and check its status, level, and prerequisites
        const quiz = await Quiz.findById(id).populate('questions', '_id question options answer marks').lean().session(session)
        if (!quiz) {
            response.status(404)
            throw new Error(`Quiz not found`)
        }
        if (quiz.status !== 'approved') {
            response.status(400)
            throw new Error('Quiz is not available for submission')
        }
        if (quiz.level !== user.level) {
            response.status(403)
            throw new Error(`You are not authorized to submit this quiz`)
        }

        // 4. Check if the user has completed the prerequisite lesson (if any)
        if (quiz.prerequisiteLesson) {
            const completedLessonIds = progress.completedLessons.map(lesson => lesson.toString())
            if (!completedLessonIds.includes(quiz.prerequisiteLesson.toString())) {
                response.status(401)
                throw new Error('You must watch the prerequisite lesson before submitting this quiz')
            }
        }

        if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
            response.status(400)
            throw new Error('Invalid answers provided')
        }

        // 6. Calculate obtained marks
        const { questions } = quiz
        const answersMap = new Map(answers.map(a => [a.questionId.toString(), a.selectedOption]))

        let obtainedMarks = 0
        const submissionObj = questions.map(question => {
            const submittedAnswer = answersMap.get(question._id.toString())
            const selectedOption = submittedAnswer ? submittedAnswer : ""

            if (selectedOption && selectedOption.trim().toLowerCase() === question.answer.toLowerCase()) {
                obtainedMarks += question.marks
            }
            return {
                questionId: question._id,
                question: question.question,
                options: question.options,
                selectedOption,
                answer: question.answer,
                marks: question.marks
            }
        })

        // 7. Create the quiz submission and update the user's progressx
        await QuizSubmission.create([{ quiz: id, student: user._id, answers: submissionObj, totalMarks: quiz.totalMarks, obtainedMarks }], { session })

        // Update progress (completedQuizzes and weeklyPoints)
        progress.weeklyPoints += (obtainedMarks * 5)
        progress.completedQuizzes.push(quiz._id)
        await progress.save({ session })

        // Commit the transaction
        await session.commitTransaction()

        response.status(201).json({
            message: `Quiz submitted successfully`,
            success: true,
            totalMarks: quiz.totalMarks,
            obtainedMarks
        })

    } catch (error) {
        // If something fails, abort the transaction
        await session.abortTransaction()

        if (error.code === 11000) {
            response.status(400)
            throw new Error(`You have already submitted this quiz`)
        }

        // Send generic failure response if error is not a duplicate
        response.status(500);
        throw new Error(`${error.message}`)
    } finally {
        await session.endSession()
    }
})

const deleteSubmission = asyncHandler(async (request, response) => {
    const user = request.user
    const { quizId, studentId } = request.params

    const submission = await QuizSubmission.findOne({ quiz: quizId, student: studentId })
        .populate('quiz', 'createdBy')
    if (!submission) {
        response.status(404)
        throw new Error(`Submission not found`)
    }
    if (submission.quiz.createdBy.toString() !== user._id.toString()) {
        response.status(403)
        throw new Error(`Access denied, You are not the author of the quiz`)
    }

    let progress = await Progress.findOne({ user: studentId })
    if (!progress) {
        response.status(500)
        throw new Error(`Student progress not found)`)
    }
    if (progress && progress.completedQuizzes.includes(quizId)) {
        let index = progress.completedQuizzes.indexOf(quizId)
        progress.completedQuizzes.splice(index, 1)
        progress.weeklyPoints -= submission.obtainedMarks * 5
        await progress.save()
    }

    await QuizSubmission.findByIdAndDelete(submission._id)

    response.status(200).json({ message: `Submission deleted successfully` })
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
    submitQuiz,
    deleteSubmission
}