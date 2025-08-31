import asyncHandler from "express-async-handler"
import { User } from "../models/user.model.mjs";
import bcrypt from "bcrypt"
import { generateToken } from "../utils/generateToken.mjs"

const register = asyncHandler(async (request, response) => {

    const { name, email, password, level } = request.body;

    if (!name || !email || !password || !level) {
        response.status(400)
        throw new Error(`Input all fields`)
    }

    let user = await User.findOne({ email });
    if (user) {
        response.status(400)
        throw new Error(`User already exists`)
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({
        name,
        email,
        password: hashedPassword,
        level,
        provider: 'email'
    });
    await user.save();

    response.status(201).json({
        message: `User registered successfully`,
        user: {
            name,
            email,
            level
        }
    });
})

const login = asyncHandler(async (request, response) => {
    const { email, password } = request.body;

    const user = await User.findOne({ email, provider: 'email' });
    if (!user) return response.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return response.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user._id);
    response.status(200).json({
        message: `User logged in successfully`,
        success: true,
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            level: user.level,
            role: user.role
        }
        // user: { id: user._id, email: user.email, name: user.name, role: user.role },
    })
})

const loginWithGoogle = (request, response) => {
    const token = generateToken(request.user._id);
    response.status(200).json({
        message: `User logged in successfully`,
        success: true,
        token,
        user: request.user
    });
}

const loginWithFacebook = (request, response) => {
    const token = generateToken(request.user._id);
    response.status(200).json({
        message: `User logged in successfully`,
        success: true,
        token,
        user: request.user
    });
}

const profile = asyncHandler(async (request, response) => {

})

export {
    register,
    login,
    loginWithGoogle,
    loginWithFacebook,
    profile
}