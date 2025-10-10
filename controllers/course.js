const supabase = require('../models/Course')

exports.getAllCourses = async (req, res) => {
  try {
    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        *,
        instructor:instructors(*),
        schedules:course_schedules(*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    res.json({
      success: true,
      data: courses
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params

    const { data: course, error } = await supabase
      .from('courses')
      .select(`
        *,
        instructor:instructors(*),
        schedules:course_schedules(*)
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      })
    }

    res.json({
      success: true,
      data: course
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

exports.createCourse = async (req, res) => {
  try {
    const {
      title,
      level,
      description,
      about,
      price,
      currency,
      image_url,
      instructor_id,
      duration_minutes,
      max_participants,
      schedules
    } = req.body

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        title,
        level,
        description,
        about,
        price,
        currency: currency || 'DT',
        image_url,
        instructor_id,
        duration_minutes: duration_minutes || 75,
        max_participants: max_participants || 10,
        is_active: true
      })
      .select()
      .single()

    if (courseError) throw courseError

    if (schedules && schedules.length > 0) {
      const scheduleData = schedules.map(schedule => ({
        course_id: course.id,
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
        duration_minutes: schedule.duration_minutes || duration_minutes || 75
      }))

      const { error: scheduleError } = await supabase
        .from('course_schedules')
        .insert(scheduleData)

      if (scheduleError) throw scheduleError
    }

    const { data: fullCourse, error: fetchError } = await supabase
      .from('courses')
      .select(`
        *,
        instructor:instructors(*),
        schedules:course_schedules(*)
      `)
      .eq('id', course.id)
      .single()

    if (fetchError) throw fetchError

    res.status(201).json({
      success: true,
      data: fullCourse,
      message: 'Course created successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params
    const {
      title,
      level,
      description,
      about,
      price,
      currency,
      image_url,
      instructor_id,
      duration_minutes,
      max_participants,
      is_active,
      schedules
    } = req.body

    const updateData = {}
    if (title !== undefined) updateData.title = title
    if (level !== undefined) updateData.level = level
    if (description !== undefined) updateData.description = description
    if (about !== undefined) updateData.about = about
    if (price !== undefined) updateData.price = price
    if (currency !== undefined) updateData.currency = currency
    if (image_url !== undefined) updateData.image_url = image_url
    if (instructor_id !== undefined) updateData.instructor_id = instructor_id
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes
    if (max_participants !== undefined) updateData.max_participants = max_participants
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (courseError) throw courseError

    if (schedules) {
      await supabase
        .from('course_schedules')
        .delete()
        .eq('course_id', id)

      if (schedules.length > 0) {
        const scheduleData = schedules.map(schedule => ({
          course_id: id,
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          duration_minutes: schedule.duration_minutes || duration_minutes || 75
        }))

        const { error: scheduleError } = await supabase
          .from('course_schedules')
          .insert(scheduleData)

        if (scheduleError) throw scheduleError
      }
    }

    const { data: fullCourse, error: fetchError } = await supabase
      .from('courses')
      .select(`
        *,
        instructor:instructors(*),
        schedules:course_schedules(*)
      `)
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    res.json({
      success: true,
      data: fullCourse,
      message: 'Course updated successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id)

    if (error) throw error

    res.json({
      success: true,
      message: 'Course deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

exports.getCoursesByLevel = async (req, res) => {
  try {
    const { level } = req.params

    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        *,
        instructor:instructors(*),
        schedules:course_schedules(*)
      `)
      .eq('level', level)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    res.json({
      success: true,
      data: courses
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}
