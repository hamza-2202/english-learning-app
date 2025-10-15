import express from "express"
import {
    getAllLesson,
    getMyLessons,
    createLesson,
    updateLesson,
    deleteLesson
} from "../controllers/lesson.controllers.mjs"
import { verifyToken } from "../middlewares/verifyToken.mjs"
import { roleMiddleware } from "../middlewares/role.middleware.mjs"

const router = express.Router()

router.route("/").get(verifyToken, getAllLesson)
router.route("/my-lessons").get(verifyToken, roleMiddleware('teacher'), getMyLessons)
router.route("/create").post(verifyToken, roleMiddleware(['admin', 'teacher']), createLesson)
router.route("/update/:id").put(verifyToken, roleMiddleware(['admin', 'teacher']), updateLesson)
router.route("/delete/:id").delete(verifyToken, roleMiddleware(['admin', 'teacher']), deleteLesson)


export default router