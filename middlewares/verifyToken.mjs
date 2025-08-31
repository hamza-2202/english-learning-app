import asyncHandler from "express-async-handler"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.mjs"


export const verifyToken = asyncHandler(async (request, response, next) => {
    let token =""
    if (request.headers.authorization || request.headers.authorization.startsWith("Bearer")) {
        token = request.headers.authorization.split(" ")[1]
        console.log(token);
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)
        console.log(decoded);
        const user = await User.findById(decoded._id).select("-password")

        if (!user) {
            response.status(404)
            throw new Error(`User not found.`)
        }

        request.user = user
        next()
    }
    if (!token) {
        response.status(401)
        throw new Error(`Token not found.`)
    }
})