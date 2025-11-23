import express from "express"
import dotenv from "dotenv/config"
import { connectDB } from "./config/db.js"
import routes from "./routes/index.routes.mjs"
import { errorHandler } from "./middlewares/error.middleware.mjs"
import passport from "./utils/passport.mjs"
import cors from "cors"

const app = express()
const port = process.env.PORT
await connectDB()

import "./utils/resetWeeklyPoints.cron.mjs"

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}))

app.use(express.json())
app.use(passport.initialize())
app.use(routes)

app.use(errorHandler)

app.get('/', (request, response) => {
  response.status(200).json({ 
    message: 'Server is running! Check /api or other routes for functionality.' 
  });
});

app.listen(port, () => {
    console.log(`server is running at port: ${port}`);
})
// export default app