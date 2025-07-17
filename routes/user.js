const express = require('express');
const router = express.Router();

// Import controllers
const { getUsers, createUser, getUserByid, loginUser } = require('../controllers/user');

// Import auth middleware (create this file if it doesn't exist)
const auth = require('../middleware/auth');

// Debug log to verify controller functions are imported
console.log('Controller functions loaded:', { 
    getUsers: typeof getUsers,
    createUser: typeof createUser,
    getUserByid: typeof getUserByid,
    loginUser: typeof loginUser
});

// Public routes (no authentication required)
router.post('/register', createUser);     // Register a new user
router.post('/login', loginUser);         // Login user

// Public routes for getting users
router.get('/all', getUsers);             // Get all users (consider making this protected)
router.get('/:id', getUserByid);          // Get user by ID

// Protected routes (require authentication)
router.get('/profile/me', auth, (req, res) => {
    res.json({ 
        message: "Protected profile data",
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email
        }
    });
});

// Alternative protected route (your original)
router.get('/private', auth, (req, res) => {
    res.json({ message: "Protected data for " + req.user._id });
});

module.exports = router;