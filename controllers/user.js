const bcrypt = require('bcrypt');
const User = require("../models/User");
const jwt = require('jsonwebtoken');

// Get all users
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude password from response
        return res.json(users);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// Get user by id
exports.getUserByid = async (req, res) => {
    const id = req.params.id;
    try {
        const user = await User.findById(id).select('-password'); // Exclude password
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.json(user);
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

// Register a new user
exports.createUser = async (req, res) => {
    const { name, email, password } = req.body; // name is optional
    
    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }
    
    try {
        // Check if user already exists
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user object (name is optional)
        const userData = { email, password: hashedPassword };
        if (name) userData.name = name;
        
        const newUser = new User(userData);
        await newUser.save();

        res.status(201).json({ 
            message: "User registered successfully",
            user: {
                id: newUser._id,
                name: newUser.name || null,
                email: newUser.email
            }
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// Login a user
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        // 1. Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // 2. Check if password matches
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // 3. Create JWT token securely
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || "default_jwt_secret",
            { expiresIn: '1h' }
        );

        // 4. Send response
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name || null,
                email: user.email
            }
        });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error" });
    }
};