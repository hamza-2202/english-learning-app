import express from "express"
import authRoutes from "./auth.routes.mjs"
import userRoutes from "./user.routes.mjs"
import lessonRoutes from "./lesson.routes.mjs"
import feedbackRoutes from "./feedback.routes.mjs"
import assignmentRoutes from "./assignment.routes.mjs"
import quizRoutes from "./quiz.routes.mjs"
import announcementRoutes from "./announcement.routes.mjs"
import progressRoutes from "./progress.routes.mjs"
import certificateRoutes from "./certificate.routes.mjs"

const router = express.Router()

router.use("/api/v1/auth", authRoutes)
router.use("/api/v1/user", userRoutes)
router.use("/api/v1/lesson", lessonRoutes)
router.use("/api/v1/lesson/feedback", feedbackRoutes)
router.use("/api/v1/assignment", assignmentRoutes)
router.use("/api/v1/quiz", quizRoutes)
router.use("/api/v1/announcement", announcementRoutes)
router.use("/api/v1", progressRoutes)   // conatains admin dashoard api as well
router.use("/api/v1", certificateRoutes)

export default router;