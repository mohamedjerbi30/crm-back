const supabase = require('../models/Course')

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization') || req.headers.authorization

    if (!token) {
      return res.status(401).json({ message: 'Access denied - No token provided' })
    }

    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token

    const { data: { user }, error } = await supabase.auth.getUser(cleanToken)

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    req.user = {
      id: user.id,
      email: user.email,
      name: profile?.name || '',
      role: profile?.role || 'member'
    }

    next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    res.status(401).json({ message: 'Token verification failed' })
  }
}

module.exports = auth
