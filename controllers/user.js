const bcrypt = require("bcrypt")
const User = require("../models/User")
const jwt = require("jsonwebtoken")
const nodemailer = require("nodemailer")

// Configure ton transporteur nodemailer ici
const transporter = nodemailer.createTransport({
  // Configure selon ton fournisseur (Gmail, etc.)
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

exports.forgotPassword = async (req, res) => {
  const { email } = req.body
  const user = await User.findOne({ email })
  if (!user) return res.status(404).json({ message: "User not found" })

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  user.resetPasswordCode = code
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000 // 15 min
  await user.save()

  // Envoi du mail
  await transporter.sendMail({
    to: email,
    subject: "Your password reset code",
    text: `Your code: ${code} (expires in 15 minutes)`,
  })

  res.json({ message: "Reset code sent to email" })
}

exports.verifyResetCode = async (req, res) => {
  const { email, code } = req.body
  const user = await User.findOne({ email, resetPasswordCode: code })
  if (!user) return res.status(400).json({ message: "Invalid code" })
  if (Date.now() > user.resetPasswordExpires)
    return res.status(400).json({ message: "Code expired" })

  res.json({ message: "Code valid" })
}

exports.resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body
  const user = await User.findOne({ email, resetPasswordCode: code })
  if (!user) return res.status(400).json({ message: "Invalid code" })
  if (Date.now() > user.resetPasswordExpires)
    return res.status(400).json({ message: "Code expired" })

  user.password = newPassword // Hash si besoin !
  user.resetPasswordCode = undefined
  user.resetPasswordExpires = undefined
  await user.save()

  res.json({ message: "Password updated" })
}

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password") // Exclude password from response
    return res.json(users)
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

// Get user by id
exports.getUserByid = async (req, res) => {
  const id = req.params.id
  try {
    const user = await User.findById(id).select("-password") // Exclude password
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    return res.json(user)
  } catch (err) {
    return res.status(400).json({ message: err.message })
  }
}

// Register a new user
exports.createUser = async (req, res) => {
  try {
    console.log("=== REGISTRATION DEBUG ===")
    console.log("Request body:", req.body)
    console.log("Content-Type:", req.headers["content-type"])
    console.log("Body keys:", Object.keys(req.body || {}))

    const { name, fname, lname, email, password } = req.body

    // Combine first and last name if provided separately
    const fullName = name || (fname && lname ? `${fname} ${lname}` : fname || lname || "")

    console.log("Extracted data:")
    console.log("- fullName:", fullName)
    console.log("- email:", email)
    console.log("- password length:", password ? password.length : "undefined")

    // Basic validation
    if (!email || !password) {
      console.log("Validation failed: Missing email or password")
      return res.status(400).json({
        message: "Email and password are required",
        received: { email: !!email, password: !!password },
      })
    }

    if (password.length < 6) {
      console.log("Validation failed: Password too short")
      return res.status(400).json({ message: "Password must be at least 6 characters long" })
    }

    // Check if user already exists
    console.log("Checking if user exists with email:", email)
    const existing = await User.findOne({ email })
    if (existing) {
      console.log("User already exists")
      return res.status(400).json({ message: "Email already exists" })
    }

    // Hash password
    console.log("Hashing password...")
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user object
    const userData = { email, password: hashedPassword }
    if (fullName) userData.name = fullName

    console.log("Creating user with data:", { ...userData, password: "[HASHED]" })

    const newUser = new User(userData)
    const savedUser = await newUser.save()

    console.log("User created successfully with ID:", savedUser._id)

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: savedUser._id,
        name: savedUser.name || null,
        email: savedUser.email,
      },
    })
  } catch (err) {
    console.error("=== REGISTRATION ERROR ===")
    console.error("Error name:", err.name)
    console.error("Error message:", err.message)
    console.error("Full error:", err)

    // Handle specific mongoose errors
    if (err.name === "ValidationError") {
      const validationErrors = Object.values(err.errors).map((e) => e.message)
      return res.status(400).json({
        message: "Validation failed",
        errors: validationErrors,
      })
    }

    if (err.code === 11000) {
      return res.status(400).json({ message: "Email already exists" })
    }

    return res.status(500).json({
      message: err.message,
      error: process.env.NODE_ENV === "development" ? err.stack : undefined,
    })
  }
}

// Login a user
exports.loginUser = async (req, res) => {
  const { email, password } = req.body

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" })
  }

  try {
    // 1. Check if user exists
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" })
    }

    // 2. Check if password matches
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" })
    }

    // 3. Create JWT token securely
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "default_jwt_secret", { expiresIn: "1h" })

    // 4. Send response
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name || null,
        email: user.email,
      },
    })
  } catch (err) {
    console.error("Login error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

exports.verifyToken = async (req, res) => {
  const token = req.headers.authorization
  if (!token) return res.status(401).json({ message: "No token provided" })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)
    if (!user) return res.status(401).json({ message: "Invalid token" })
    res.json({ user })
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" })
  }
}
