import nodemailer from "nodemailer"

export const transporter = nodemailer.createTransport({
    // service: "google",
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})