import express from "express"
import {
    getAllAssignments,
    getSingleAssignment,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    submitAssignment
} from "../controllers/assignment.controllers.mjs"
import { verifyToken } from "../middlewares/verifyToken.mjs"
import { roleMiddleware } from "../middlewares/role.middleware.mjs"

const router = express.Router()

router.use(verifyToken)

router.route("/").get(getAllAssignments)
router.route("/:id").get(getSingleAssignment)
router.route("/create").post(roleMiddleware('teacher'), createAssignment)
router.route("/update/:id").put(roleMiddleware('teacher'), updateAssignment)
router.route("/delete/:id").delete(roleMiddleware('teacher'), deleteAssignment)
router.route("/:id/submit").put(roleMiddleware(['student', 'teacher']), submitAssignment)


export default router;