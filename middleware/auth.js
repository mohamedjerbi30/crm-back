const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        console.log('=== AUTH MIDDLEWARE DEBUG ===');
        console.log('Request headers:', req.headers);
        console.log('Authorization header:', req.headers.authorization);
        
        // Get token from header
        const token = req.header('Authorization') || req.headers.authorization;
        
        // Check if token exists
        if (!token) {
            console.log('No token provided');
            return res.status(401).json({ message: 'Access denied - No token provided' });
        }
        
        // Remove 'Bearer ' from token if present
        const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
        console.log('Clean token (first 10 chars):', cleanToken.substring(0, 10) + '...');
        
        // Verify token using the same secret as in login
        const jwtSecret = process.env.JWT_ACCESS_SECRET || 'default_jwt_secret';
        console.log('Using JWT secret (first 5 chars):', jwtSecret.substring(0, 5) + '...');
        
        const decoded = jwt.verify(cleanToken, jwtSecret);
        console.log('Token decoded successfully, user ID:', decoded.id);
        
        // Get user from token (optional - for additional verification)
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            console.log('User not found in database');
            return res.status(401).json({ message: 'Invalid token - User not found' });
        }
        
        console.log('User found:', user.email);
        
        // Add user to request object
        req.user = { id: user._id, email: user.email, name: user.name };
        console.log('Auth successful, proceeding to next middleware');
        next();
        
    } catch (err) {
        console.error('=== AUTH MIDDLEWARE ERROR ===');
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token format' });
        }
        
        res.status(401).json({ message: 'Token verification failed' });
    }
};

module.exports = auth;