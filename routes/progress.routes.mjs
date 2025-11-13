import express from "express"
import { verifyToken } from "../middlewares/verifyToken.mjs";
import { roleMiddleware } from "../middlewares/role.middleware.mjs";
import {
    markLessonAsWatched,
    getLeaderboard,
    getMyProgress
} from "../controllers/progress.controllers.mjs"

const router = express.Router()

router.route("/progress/add-lesson/:id").put(verifyToken, roleMiddleware('student'), markLessonAsWatched)
router.route("/leaderboard").get(verifyToken, getLeaderboard)
router.route("/my-progress").get(verifyToken, roleMiddleware("student"), getMyProgress)

export default router;