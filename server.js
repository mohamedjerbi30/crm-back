const express = require("express")
const cors = require("cors")
const userRoutes = require("./routes/user")
const jwt = require("jsonwebtoken")
const dotenv = require("dotenv")
const connectDB = require("./utils/db")

// Load environment variables
dotenv.config()
// Add this temporarily to the top of your server.js file to debug
console.log("=== ENVIRONMENT VARIABLES DEBUG ===")
console.log("EMAIL_USER:", process.env.EMAIL_USER)
console.log("EMAIL_PASS:", process.env.EMAIL_PASS)
console.log("EMAIL_USER type:", typeof process.env.EMAIL_USER)
console.log("EMAIL_PASS type:", typeof process.env.EMAIL_PASS)
console.log("EMAIL_USER length:", process.env.EMAIL_USER ? process.env.EMAIL_USER.length : 0)
console.log("EMAIL_PASS length:", process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0)
console.log("All env keys containing EMAIL:", Object.keys(process.env).filter(key => key.includes('EMAIL')))

// Test nodemailer directly
const nodemailer = require("nodemailer")

const testTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  debug: true,
  logger: true,
})

console.log("=== TESTING EMAIL CONFIGURATION ===")
testTransporter.verify((error, success) => {
  if (error) {
    console.error("Direct email test failed:", error)
  } else {
    console.log("Direct email test successful!")
  }
})
// Initialize app
const app = express()

// Connect to DB
connectDB()

// Middlewares
app.use(
  cors({
    origin: "http://localhost:3000",
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

// Start server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
