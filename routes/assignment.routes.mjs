import express from "express"
import {
    getAllAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    submitAssignment,
    approveAssignment,
    rejectAssignment,
    getAllSubmissions,
    markSubmission
} from "../controllers/assignment.controllers.mjs"
import { verifyToken } from "../middlewares/verifyToken.mjs"
import { roleMiddleware } from "../middlewares/role.middleware.mjs"

const router = express.Router()

router.use(verifyToken)

router.route("/").get(getAllAssignments)
router.route("/create").post(roleMiddleware('teacher'), createAssignment)
router.route("/update/:id").put(roleMiddleware('teacher'), updateAssignment)
router.route("/delete/:id").delete(roleMiddleware('teacher'), deleteAssignment)
router.route("/approve/:id").put(roleMiddleware('admin'), approveAssignment)
router.route("/reject/:id").put(roleMiddleware('admin'), rejectAssignment)
router.route("/:id/submit").post(roleMiddleware('student'), submitAssignment)
router.route("/:id/submissions").get(roleMiddleware('teacher'), getAllSubmissions)
router.route("/submission/:id/mark").put(roleMiddleware('teacher'), markSubmission)


export default router;