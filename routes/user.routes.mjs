import express from "express"
import { verifyToken } from "../middlewares/verifyToken.mjs";
import { roleMiddleware } from "../middlewares/role.middleware.mjs";
import {
    createUser,
    getAllUsers,
    getSingleUser,
    updateUser,
    deleteUser
} from "../controllers/user.controllers.mjs"

const router = express.Router()

router.route("/").get(verifyToken, roleMiddleware("admin"), getAllUsers)
router.route("/create").post(verifyToken, roleMiddleware('admin'), createUser)
router.route("/:id").get(verifyToken, getSingleUser)
router.route("/update/:id").put(verifyToken, roleMiddleware(['student', 'admin']), updateUser)
router.route("/delete/:id").delete(verifyToken, roleMiddleware(['student', 'admin']), deleteUser)

export default router;