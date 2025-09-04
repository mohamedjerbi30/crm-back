const bcrypt = require("bcrypt")
const User = require("../models/User")
const jwt = require("jsonwebtoken")
const nodemailer = require("nodemailer")

// Configure nodemailer transporter with better error handling
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Add these for better Gmail compatibility
  secure: true,
  port: 465,
})

// Verify transporter configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("Email transporter configuration error:", error)
  } else {
    console.log("Email server is ready to take our messages")
  }
})

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    
    // Validate input
    if (!email) {
      return res.status(400).json({ message: "Email is required" })
    }

    // Check if email credentials are available
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("Missing email credentials:")
      console.error("EMAIL_USER:", process.env.EMAIL_USER ? "Present" : "Missing")
      console.error("EMAIL_PASS:", process.env.EMAIL_PASS ? "Present" : "Missing")
      return res.status(500).json({ 
        message: "Email service not configured. Please contact support." 
      })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    user.resetPasswordCode = code
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000 // 15 min
    await user.save()

    // Create a new transporter for this request (fallback approach)
    let requestTransporter;
    try {
      requestTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        debug: true,
        logger: true,
      })
      
      console.log("Created request-specific transporter")
    } catch (transporterError) {
      console.error("Failed to create transporter:", transporterError)
      return res.status(500).json({ 
        message: "Failed to configure email service" 
      })
    }

    // Enhanced mail options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Code - Your App",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You have requested a password reset. Please use the following code:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
            ${code}
          </div>
          <p><strong>This code will expire in 15 minutes.</strong></p>
          <p>If you didn't request this password reset, please ignore this email.</p>
        </div>
      `,
      text: `Your password reset code: ${code} (expires in 15 minutes)`,
    }

    // Use the global transporter first, fallback to request transporter
    const emailTransporter = transporter || requestTransporter

    console.log("Attempting to send email with credentials:")
    console.log("From:", process.env.EMAIL_USER)
    console.log("To:", email)

    // Send email with better error handling
    await emailTransporter.sendMail(mailOptions)
    console.log("Password reset email sent successfully to:", email)

    res.json({ message: "Reset code sent to email" })
  } catch (error) {
    console.error("Erreur forgotPassword:", error)
    console.error("Error details:")
    console.error("- Code:", error.code)
    console.error("- Command:", error.command)
    console.error("- Response:", error.response)
    
    // Handle specific email errors
    if (error.code === 'EAUTH') {
      return res.status(500).json({ 
        message: "Email authentication failed. Please check email configuration." 
      })
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNECTION') {
      return res.status(500).json({ 
        message: "Cannot connect to email server. Please try again later." 
      })
    }
    
    res.status(500).json({ 
      message: "Failed to send reset email. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    })
  }
}

exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body
    
    // Validate input
    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" })
    }

    const user = await User.findOne({ email, resetPasswordCode: code })
    if (!user) {
      return res.status(400).json({ message: "Invalid code" })
    }
    
    if (Date.now() > user.resetPasswordExpires) {
      return res.status(400).json({ message: "Code expired" })
    }

    res.json({ message: "Code valid" })
  } catch (error) {
    console.error("Verify reset code error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body
    
    // Validate input
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: "Email, code, and new password are required" })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" })
    }

    const user = await User.findOne({ email, resetPasswordCode: code })
    if (!user) {
      return res.status(400).json({ message: "Invalid code" })
    }
    
    if (Date.now() > user.resetPasswordExpires) {
      return res.status(400).json({ message: "Code expired" })
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedPassword
    user.resetPasswordCode = undefined
    user.resetPasswordExpires = undefined
    await user.save()

    res.json({ message: "Password updated successfully" })
  } catch (error) {
    console.error("Reset password error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password")
    return res.json(users)
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

// Get user by id
exports.getUserByid = async (req, res) => {
  const id = req.params.id
  try {
    const user = await User.findById(id).select("-password")
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
  console.log('Login request body:', req.body)
  try {
    const { email, password } = req.body

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

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

    // 3. Create JWT token securely - use JWT_ACCESS_SECRET from your env
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_ACCESS_SECRET || "default_jwt_secret", 
      { expiresIn: "1h" }
    )

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
    console.error('Login error:', err)
    res.status(500).json({ message: "Server error" })
  }
}

exports.verifyToken = async (req, res) => {
  console.log('Verify token header:', req.headers.authorization)
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ message: "No token provided" })

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || "default_jwt_secret")
    const user = await User.findById(decoded.id).select("-password")
    if (!user) return res.status(401).json({ message: "Invalid token" })
    res.json({ user })
  } catch (err) {
    console.error('Token verification error:', err)
    return res.status(401).json({ message: "Invalid or expired token" })
  }
}

// Register a new user (alternative version with debug logs)
exports.registerUser = async (req, res) => {
  console.log('Register request body:', req.body)
  try {
    const { name, fname, lname, email, password } = req.body

    // Combine first and last name if provided separately
    const fullName = name || (fname && lname ? `${fname} ${lname}` : fname || lname || "")

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
        received: { email: !!email, password: !!password },
      })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" })
    }

    // Check if user already exists
    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(400).json({ message: "Email already exists" })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user object
    const userData = { email, password: hashedPassword }
    if (fullName) userData.name = fullName

    const newUser = new User(userData)
    const savedUser = await newUser.save()

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: savedUser._id,
        name: savedUser.name || null,
        email: savedUser.email,
      },
    })
  } catch (err) {
    console.error('Register error:', err)
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