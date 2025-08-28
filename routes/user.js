const express = require("express");
const router = express.Router();
const userController = require("../controllers/user");
const auth = require("../middleware/auth");

// Get all users (protected route)
router.get("/", auth, userController.getUsers);

// Get user by ID (protected route)
router.get("/:id", auth, userController.getUserByid);

// Register user
router.post("/register", userController.createUser);

// Login user
router.post("/login", userController.loginUser);

// Forgot password
router.post("/forgot-password", userController.forgotPassword);
// Verify reset code
router.post("/verify-reset-code", userController.verifyResetCode);
// Reset password
router.post("/reset-password", userController.resetPassword);

// Verify token
router.get('/verify-token', userController.verifyToken);

module.exports = router;
