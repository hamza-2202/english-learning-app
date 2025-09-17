import express from "express"
import {
    createFeedback,
    updateFeedback,
    deleteFeedback,
    createReply,
    updateReply,
    deleteReply
} from "../controllers/feedback.controllers.mjs"
import { verifyToken } from "../middlewares/verifyToken.mjs"
import { roleMiddleware } from "../middlewares/role.middleware.mjs"

const router = express.Router()

router.use(verifyToken)
router.route("/create/:id").post(roleMiddleware(['student', 'teacher']), createFeedback)
router.route("/update/:id").put(roleMiddleware(['student', 'teacher']), updateFeedback)
router.route("/delete/:id").delete(roleMiddleware(['student', 'teacher']), deleteFeedback)
router.route("/reply/create/:feedbackId").post(roleMiddleware(['student', 'teacher']), createReply)
router.route("/:feedbackId/update/:replyId").put(roleMiddleware(['student', 'teacher']), updateReply)
router.route("/:feedbackId/delete/:replyId").delete(roleMiddleware(['student', 'teacher']), deleteReply)    


export default router