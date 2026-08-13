const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');

const router = Router();

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile from public.users.
 * Frontend uses this to hydrate app state after Supabase auth — keeps DB access server-side.
 */
router.get('/me', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, auth_id, rhapsody_id, name, email, role, handicap_index, handicap_updated, club_admins(club_id, clubs(id, name, short_name, theme_color))')
    .eq('id', req.userId)
    .single();

  if (error || !data) {
    logger.error('GET /auth/me error', { userId: req.userId, message: error?.message });
    return res.status(404).json({ error: 'User profile not found' });
  }

  const ca = data.club_admins?.[0];
  const club_id = ca?.club_id ?? null;
  const club_name = ca?.clubs?.short_name ?? ca?.clubs?.name ?? null;
  const club_theme_color = ca?.clubs?.theme_color ?? null;
  const { club_admins: _ca2, ...userFields } = data;
  res.json({ user: { ...userFields, club_id, club_name, club_theme_color } });
});

module.exports = router;
