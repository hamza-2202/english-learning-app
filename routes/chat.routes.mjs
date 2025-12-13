import express from 'express'
import { verifyToken } from '../middlewares/verifyToken.mjs'
import { roleMiddleware } from '../middlewares/role.middleware.mjs'
import { getUserChats } from '../controllers/chat.controllers.mjs'

const router = express.Router()

router.route("/chats").get(verifyToken, roleMiddleware('student'), getUserChats)

export default router