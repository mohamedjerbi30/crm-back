const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization');
        
        // Check if token exists
        if (!token) {
            return res.status(401).json({ message: 'Access denied' });
        }
        
        // Remove 'Bearer ' from token if present
        const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
        
        // FIXED: Use same secret as in controller (JWT_ACCESS_SECRET)
        const decoded = jwt.verify(cleanToken, process.env.JWT_ACCESS_SECRET || 'default_jwt_secret');
        
        // Get user from token (optional - for additional verification)
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        
        // Add user to request object
        req.user = user;
        next();
        
    } catch (err) {
        console.error('Auth middleware error:', err);
        res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = auth;