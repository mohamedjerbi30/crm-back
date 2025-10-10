const express = require("express")
const cors = require("cors")
const userRoutes = require("./routes/user")
const courseRoutes = require("./routes/course")
const dotenv = require("dotenv")

dotenv.config()

const app = express()

// Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true, // if using cookies or auth headers
  }),
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Add direct routes for frontend compatibility
app.post("/api/register", require("./controllers/user").createUser)
app.post("/api/login", require("./controllers/user").loginUser)
app.post("/api/forgot-password", require("./controllers/user").forgotPassword)
app.post("/api/verify-reset-code", require("./controllers/user").verifyResetCode)
app.post("/api/reset-password", require("./controllers/user").resetPassword)

// Routes
app.use("/api/users", userRoutes)
app.use("/api", courseRoutes)

//app.use('/api/profile', require('./routes/profile'))
// Profile routes are now handled in /api/users/profile/*

// Start server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))