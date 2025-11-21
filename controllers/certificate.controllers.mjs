import asyncHandler from "express-async-handler";
import { Progress } from "../models/progress.model.mjs";
import { Certificate } from "../models/certificate.models.mjs";
import { Lesson } from "../models/lesson.model.mjs";
import { Quiz } from "../models/quiz.model.mjs";
import { Assignment } from "../models/assignment.model.mjs";
import { QuizSubmission } from "../models/quizSubmission.model.mjs";
import { Submission } from "../models/assignment.submissions.model.mjs";
import crypto from 'crypto'

const getAllCertificates = asyncHandler(async (request, response) => {
    const studentId = request.user._id;

    const certificates = await Certificate.find({ student: studentId })
        .populate('student', 'name email role')
        .lean()

    if (certificates.length === 0) {
        return response.status(200).json({
            message: `No certificates earned yet. Keep learning!`
        })
    }
    const levelOrder = { beginner: 1, intermediate: 2, advance: 3 };
    certificates.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

    response.status(200).json({
        certificates
    })
})


const generateCertificate = asyncHandler(async (request, response) => {
    const user = request.user

    const progress = await Progress.findOne({ user: user._id })
    if (!progress) {
        if (!progress) {
            response.status(404)
            throw new Error(`Student progress not found`)
        }
    }

    const currentLevel = progress.level
    if (!currentLevel) {
        response.status(400)
        throw new Error(`Student has no active level`)
    }

    const existing = await Certificate.findOne({ student: user._id, level: currentLevel })
    if (existing) {
        response.status(400)
        throw new Error(`Certificate already exist for student's ${currentLevel} level`)
    }

    const [lessons, quizzes, assignments] = await Promise.all([
        Lesson.find({ level: currentLevel }).select('_id').lean(),
        Quiz.find({ level: currentLevel, status: 'approved' }).select('_id').lean(),
        Assignment.find({ level: currentLevel, status: 'approved' }).select('_id').lean()
    ])

    const lessonIds = new Set(lessons.map(l => l._id.toString()))
    const quizIds = new Set(quizzes.map(q => q._id.toString()))
    const assignmentIds = new Set(assignments.map(a => a._id.toString()))


    const completedLessons = new Set(progress.completedLessons.map(String))
    const allLessonsDone = [...lessonIds].every(id => completedLessons.has(id))

    if (!allLessonsDone) {
        response.status(400)
        throw new Error(`You must watch all lessons for your level`)
    }

    const [quizSub, assignmentSub] = await Promise.all([
        await QuizSubmission.find({ student: user._id, quiz: { $in: quizzes.map(q => q._id) } }).select('quiz totalMarks obtainedMarks').lean(),
        await Submission.find({ student: user._id, assignment: { $in: assignments.map(a => a._id) } }).populate('assignment', 'marks').select('assignment result status').lean()
    ])
    const allQuizSub = new Set(quizSub.map(s => s.quiz.toString()))
    const allAssignSub = new Set(assignmentSub.map(s => s.assignment._id.toString()))

    const allQuizSubDone = [...quizIds].every(id => allQuizSub.has(id))
    const allAssignSubDone = [...assignmentIds].every(id => allAssignSub.has(id))

    if (!allQuizSubDone) {
        response.status(400)
        throw new Error(`You must complete all quizzes for your level`)
    }

    if (!allAssignSubDone) {
        response.status(400)
        throw new Error(`You must submit all assignments for your level`)
    }

    const allSubmissionsMarked = assignmentSub.every(sub => sub.status === "marked")
    if (!allSubmissionsMarked) {
        response.status(400)
        throw new Error(`Some assignments are not yet marked by teacher`)
    }

    // --------------- Quiz Average Percentage -----------------

    let quizTotalObtained = 0
    let quizTotalPossible = 0

    quizSub.forEach(q => {
        quizTotalObtained += q.obtainedMarks
        quizTotalPossible += q.totalMarks
    })
    const quizAvgPercentage = quizTotalPossible > 0 ? parseFloat(((quizTotalObtained / quizTotalPossible) * 100).toFixed(2)) : null

    // ------------ Assignment Average Percentage --------------

    let assignmentTotalObtained = 0
    let assignmentTotalPossible = 0
    assignmentSub.forEach(ass => {
        assignmentTotalObtained += ass.result
        assignmentTotalPossible += ass.assignment.marks
    })

    const assignmentAvgPercentage = assignmentTotalPossible > 0 ? parseFloat(((assignmentTotalObtained / assignmentTotalPossible) * 100).toFixed(2)) : null


    // ------------ Final Percentage --------------

    const validAverages = []
    if (quizAvgPercentage !== null) {
        validAverages.push(quizAvgPercentage)
    }
    if (assignmentAvgPercentage !== null) {
        validAverages.push(assignmentAvgPercentage)
    }

    let overallPercentage = validAverages.length > 0
        ? validAverages.reduce((a, b) => a + b, 0) / validAverages.length
        : 100   // only lessons → 100%
    const finalPercentage = Number(overallPercentage.toFixed(2))


    const certificate = await Certificate.create({
        student: user._id,
        level: currentLevel,
        finalPercentage,
        summary: {
            quizAvgPercentage,
            assignmentAvgPercentage
        },
        certificateNumber: `CERT-${crypto.randomUUID().split('-')[0].toUpperCase()}${Math.round(Math.random() * 10000)}`,
    })

    response.status(201).json({
        message: `Certificate generated successfully`,
        certificate
    })
})

export {
    getAllCertificates,
    generateCertificate
}