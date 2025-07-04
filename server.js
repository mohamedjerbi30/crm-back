const express = require('express');
const userRoutes = require('./routes/user');
//const dotenv = require('dotenv');
const connectDB = require('./utils/db');

//dotenv.config();
connectDB();

const app = express();
app.use(express.json());


app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
