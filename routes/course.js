const express = require('express')
const router = express.Router()
const courseController = require('../controllers/course')
const auth = require('../middleware/auth')

router.get('/courses', auth, courseController.getAllCourses)
router.get('/courses/:id', auth, courseController.getCourseById)
router.get('/courses/level/:level', auth, courseController.getCoursesByLevel)
router.post('/courses', auth, courseController.createCourse)
router.put('/courses/:id', auth, courseController.updateCourse)
router.delete('/courses/:id', auth, courseController.deleteCourse)

module.exports = router
