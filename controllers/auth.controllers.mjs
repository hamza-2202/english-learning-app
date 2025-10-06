import asyncHandler from "express-async-handler"
import { User } from "../models/user.model.mjs";
import bcrypt from "bcrypt"
import { generateToken } from "../utils/generateToken.mjs"
import jwt from "jsonwebtoken"
import { transporter } from "../utils/nodemailer.mjs";

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

    const user = await User.findOne({ email });     // provider: 'email' 

    if (!user) return response.status(400).json({ message: 'Invalid credentials' });

    if (user.provider !== 'email') {
        response.status(400)
        throw new Error(`This email is linked with ${user.provider} signup.`)
    }

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
    const user = { id: request.user._id, email: request.user.email, name: request.user.name, role: request.user.role };
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`;
    response.redirect(redirectUrl);
}

const loginWithFacebook = (request, response) => {
    const token = generateToken(request.user._id);
    const user = { id: request.user._id, email: request.user.email, name: request.user.name, role: request.user.role };
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`;
    response.redirect(redirectUrl);
}

const forgotPassword = asyncHandler(async (request, response) => {
    const { email } = request.body
    try {
        const user = await User.findOne({ email })
        if (!user) {
            response.status(404)
            throw new Error(`User not found or not registered with this email`)
        }
        const resetToken = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_RESET_SECRET, { expiresIn: '1h' })

        const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset Request',
            html: `
        <h3>Password Reset</h3>
        <p>You requested a password reset for your account.</p>
        <p>Click <a href="${resetURL}">here</a> to reset your password.</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
        }
        await transporter.sendMail(mailOptions);
        response.status(200).json({ message: 'Reset password email sent successfully' });
    } catch (error) {
        console.error('Forgot password error:', error.message)
        response.status(500).json({ message: 'Server error' })
    }

})

const resetPassword = asyncHandler(async (request, response) => {
    const { token, password } = request.body

    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET)

    const user = await User.findById(decoded.id)
    if (!user || user.provider !== 'email') {
        response.status(400)
        throw new Error(`Invalid or expired token`)
    }
    const hashedPassword = await bcrypt.hash(password, 10)

    user.password = hashedPassword;
    await user.save()

    response.status(200).json({
        message: `Password reset successfully`
    })
})


export {
    register,
    login,
    loginWithGoogle,
    loginWithFacebook,
    forgotPassword,
    resetPassword
}