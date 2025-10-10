const supabase = require('../models/Course')
const jwt = require('jsonwebtoken')

exports.createUser = async (req, res) => {
  try {
    const { name, fname, lname, email, password } = req.body
    const fullName = name || (fname && lname ? `${fname} ${lname}` : fname || lname || '')

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' })
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: fullName
        }
      }
    })

    if (error) {
      if (error.message.includes('already registered')) {
        return res.status(400).json({ message: 'Email already exists' })
      }
      throw error
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: data.user.id,
        name: fullName,
        email: data.user.email
      }
    })
  } catch (err) {
    console.error('Registration error:', err)
    res.status(500).json({ message: err.message })
  }
}

exports.registerUser = exports.createUser

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return res.status(400).json({ message: 'Invalid email or password' })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle()

    res.json({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        name: profile?.name || '',
        email: data.user.email
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ message: 'Server error' })
  }
}

exports.verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ message: 'No token provided' })

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    res.json({
      user: {
        id: user.id,
        name: profile?.name || '',
        email: user.email
      }
    })
  } catch (err) {
    console.error('Token verification error:', err)
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

exports.getProfile = async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle()

    if (error) throw error

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' })
    }

    res.json({
      success: true,
      data: profile
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone, avatar_url } = req.body

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', req.user.id)
      .select()
      .single()

    if (error) throw error

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: profile
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' })
    }

    const token = req.headers.authorization?.replace('Bearer ', '')
    const { error } = await supabase.auth.updateUser(
      { password: newPassword },
      { accessToken: token }
    )

    if (error) {
      return res.status(400).json({ message: 'Failed to change password' })
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

exports.deleteAccount = async (req, res) => {
  try {
    const { error } = await supabase.auth.admin.deleteUser(req.user.id)

    if (error) throw error

    res.json({
      success: true,
      message: 'Account deleted successfully'
    })
  } catch (error) {
    console.error('Delete account error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ message: 'Email is required' })
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    })

    if (error) throw error

    res.json({ message: 'Password reset email sent' })
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({ message: 'Failed to send reset email' })
  }
}

exports.verifyResetCode = async (req, res) => {
  res.json({ message: 'Use Supabase email link for password reset' })
}

exports.resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' })
    }

    const { error } = await supabase.auth.updateUser(
      { password: newPassword },
      { accessToken: token }
    )

    if (error) throw error

    res.json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

exports.getUsers = async (req, res) => {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')

    if (error) throw error

    res.json(profiles)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getUserByid = async (req, res) => {
  try {
    const { id } = req.params

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error

    if (!profile) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json(profile)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}
