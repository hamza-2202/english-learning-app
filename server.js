import express from "express"
import dotenv from "dotenv/config"
import { connectDB } from "./config/db.js"
import routes from "./routes/index.routes.mjs"
import { errorHandler } from "./middlewares/error.middleware.mjs"
import passport from "./utils/passport.mjs"

const app = express()
const port = process.env.PORT
connectDB()

app.use(express.json())
app.use(passport.initialize())
app.use(routes)


app.use(errorHandler)

app.listen(port, () => {
    console.log(`server is running at port: ${port}`);
})




// how to create Google & Facebook credentials in their developer consoles and whitelist callback URLs

