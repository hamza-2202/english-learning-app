import express from "express"
import { verifyToken } from "../middlewares/verifyToken.mjs";
import { roleMiddleware } from "../middlewares/role.middleware.mjs";
import {
    markLessonAsWatched
} from "../controllers/progress.controllers.mjs"

const router = express.Router()

router.route("/progress/add-lesson/:id").put(verifyToken, roleMiddleware('student'), markLessonAsWatched)

export default router;