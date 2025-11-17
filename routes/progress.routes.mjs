import express from "express"
import { verifyToken } from "../middlewares/verifyToken.mjs";
import { roleMiddleware } from "../middlewares/role.middleware.mjs";
import {
    markLessonAsWatched,
    getLeaderboard,
    getMyProgress,
    getSingleProgress,
    getAdminDashboard
} from "../controllers/progress.controllers.mjs"

const router = express.Router()

router.route("/admin/dashboard").get(verifyToken, roleMiddleware('admin'), getAdminDashboard)
router.route("/progress/lesson/:id").put(verifyToken, roleMiddleware('student'), markLessonAsWatched)
router.route("/leaderboard").get(verifyToken, getLeaderboard)
router.route("/progress").get(verifyToken, roleMiddleware("student"), getMyProgress)
router.route("/progress/:id").get(verifyToken, roleMiddleware(["admin", "teacher"]), getSingleProgress)

export default router;