import express from "express"
import passport from "passport"
import {
    register,
    login,
    loginWithGoogle,
    loginWithFacebook,
    forgotPassword,
    resetPassword
} from "../controllers/auth.controllers.mjs"

const router = express.Router()

router.post("/register", register)
router.post("/login", login)


// Google Auth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback", passport.authenticate("google", { session: false, failureRedirect: `${process.env.FRONTEND_URL}/auth/success?error=Authentication%20failed` }), loginWithGoogle);


// Facebook Auth
router.get("/facebook", passport.authenticate("facebook", { scope: ["email"] }));
router.get("/facebook/callback", passport.authenticate("facebook", { session: false, failureRedirect: `${process.env.FRONTEND_URL}/auth/success?error=Authentication%20failed` }), loginWithFacebook);

router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)



export default router;