import express from "express"
import {
    getAllAnnouncement,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement
} from "../controllers/announcement.controllers.mjs"
import { verifyToken } from "../middlewares/verifyToken.mjs"
import { roleMiddleware } from "../middlewares/role.middleware.mjs"

const router = express.Router()

router.use(verifyToken)
router.route("/").get(getAllAnnouncement)
router.route("/create").post(roleMiddleware('teacher'), createAnnouncement)
router.route("/update/:id").put(roleMiddleware('teacher'), updateAnnouncement)
router.route("/delete/:id").delete(roleMiddleware('teacher'), deleteAnnouncement)

export default router;