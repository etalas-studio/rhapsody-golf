const supabase = require('../config/supabase');

/**
 * Resolves req.clubId from query/body/params for club-scoped requests.
 * club_admin: must match their own club (verified via club_admins table).
 * superadmin: can pass any clubId.
 *
 * Usage: router.get('/', requireClubAdmin, scopeClub, handler)
 * After this middleware: req.clubId is set and verified.
 */
async function scopeClub(req, res, next) {
  const clubId = req.query.clubId || req.body.clubId || req.params.clubId;

  if (!clubId) return res.status(400).json({ error: 'clubId is required' });

  if (req.role === 'club_admin') {
    const { data } = await supabase
      .from('club_admins')
      .select('club_id')
      .eq('user_id', req.userId)
      .single();

    if (!data || data.club_id !== clubId) {
      return res.status(403).json({ error: 'Access denied to this club' });
    }
  }

  req.clubId = clubId;
  next();
}

module.exports = { scopeClub };
