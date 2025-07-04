const express = require('express');
const router = express.Router();
const { getUsers, createUser, getUserByid } = require('../controllers/user');

router.get('/getUser/:id', getUserByid);
router.get('/getAll', getUsers);
router.post('/add', createUser);


module.exports = router;