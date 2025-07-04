const User = require("../models/User");


exports.getUsers = async (req, res) => {
    const users = await User.find();
    return res.json(users);
};
exports.getUserByid = async (req, res) => {
    const id = req.params.id;
    try {
        const user = await User.findById(id);
        return res.json(user);
    } catch (e) {
        return res.status(400).json({ message: err.message });
    }

};

// @desc    Create new user
exports.createUser = async (req, res) => {
    const { password, email } = req.body;
    console.log(password)
    console.log(email);
    let user;

    try {
        user = new User({ email, password });
        await user.save();
        return res.status(201).json(user);

    } catch (err) {
        return res.status(400).json({ message: err.message });
    }

};