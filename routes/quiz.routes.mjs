import express from "express"
import { verifyToken } from "../middlewares/verifyToken.mjs"
import {
    getAllQuiz,
    getSingleQuiz,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    approveQuiz,
    rejectQuiz
} from "../controllers/quiz.controllers.mjs"
import { roleMiddleware } from "../middlewares/role.middleware.mjs"

const router = express.Router()

router.use(verifyToken)

router.route("/").get(getAllQuiz)
router.route("/:id").get(getSingleQuiz)
router.route("/create").post(roleMiddleware('teacher'), createQuiz)
router.route("/update/:id").put(roleMiddleware('teacher'), updateQuiz)
router.route("/delete/:id").delete(roleMiddleware('teacher'), deleteQuiz)
router.route("/question/add/:id").post(roleMiddleware('teacher'), addQuestion)
router.route("/question/update/:id").put(roleMiddleware('teacher'), updateQuestion)
router.route("/question/delete/:id").delete(roleMiddleware('teacher'), deleteQuestion)
router.route("/approve/:id").put(roleMiddleware('admin'), approveQuiz)
router.route("/reject/:id").put(roleMiddleware('admin'), rejectQuiz)

export default router;