const supabase = require('../config/supabase');

/**
 * Verifies the Supabase JWT from the Authorization header.
 * Sets req.userId (public.users.id) and req.role on success.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const token = header.slice(7);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Look up the public.users row for this auth user
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', data.user.id)
    .single();

  if (userErr || !user) {
    return res.status(401).json({ error: 'User profile not found' });
  }

  req.userId = user.id;
  req.role = user.role;
  next();
}

module.exports = { requireAuth };
