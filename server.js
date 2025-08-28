const express = require("express")
const cors = require("cors")
const userRoutes = require("./routes/user")
const jwt = require("jsonwebtoken")
const dotenv = require("dotenv")
const connectDB = require("./utils/db")

// Load environment variables
dotenv.config()

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

// Routes
app.use("/api/users", userRoutes)

// Start server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
