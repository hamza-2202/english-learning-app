import express from "express"
import authRoutes from "./auth.routes.mjs"
import userRoutes from "./user.routes.mjs"
import lessonRoutes from "./lesson.routes.mjs"
import assignmentRoutes from "./assignment.routes.mjs"
import announcementRoutes from "./announcement.routes.mjs"

const router = express.Router()

router.use("/api/v1/auth", authRoutes)
router.use("/api/v1/user", userRoutes)
router.use("/api/v1/lesson", lessonRoutes)
router.use("/api/v1/assignment", assignmentRoutes)
router.use("/api/v1/announcement", announcementRoutes)

export default router;