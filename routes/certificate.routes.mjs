import express from 'express'
import { verifyToken } from '../middlewares/verifyToken.mjs'
import { roleMiddleware } from '../middlewares/role.middleware.mjs'
import { generateCertificate, getAllCertificates } from '../controllers/certificate.controllers.mjs'

const router = express.Router()

router.route("/certificate").post(verifyToken, roleMiddleware('student'), generateCertificate)
router.route("/certificate").get(verifyToken, roleMiddleware("student"), getAllCertificates)

export default router