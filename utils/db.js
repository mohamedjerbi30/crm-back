const mongoose = require('mongoose');
//chat-app-db?retryWrites=true&w=majority&appName=Cluster0
const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://baccar:xRHtJF0l2qTb6fJd@cluster0.e7sj9am.mongodb.net/chat-app-db?retryWrites=true&w=majority&appName=Cluster0");
        console.log('MongoDB connected');
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
