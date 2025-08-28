const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: false, // Make optional if you want to register without name
        trim: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true, // Automatically convert to lowercase
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: { 
        type: String, 
        required: true,
        minlength: 6 // Minimum password length
    },
    resetPasswordCode: { type: String },
    resetPasswordExpires: { type: Date }
},
 {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Add index for better query performance
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);