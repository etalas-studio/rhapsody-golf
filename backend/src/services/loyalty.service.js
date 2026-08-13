const supabase = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Fetch the LoyaltyRule for a club, or return defaults if none exists.
 */
async function getRule(clubId) {
  const { data } = await supabase
    .from('loyalty_rules')
    .select('*')
    .eq('club_id', clubId)
    .single();

  return data ?? {
    pts_per_spending: 1,      // 1 pt per Rp 1,000 spent
    bonus_per_visit: 0,
    weekday_multiplier: 1.0,
    enable_spending: true,
    enable_visit: false,
    enable_weekday: false,
  };
}

/**
 * Earn points after a booking reaches Completed status.
 * Append-only — never updates existing entries.
 *
 * Points formula: floor(amount / 1000) * pts_per_spending
 *   × weekday_multiplier if enable_weekday and teeTime is Mon–Fri
 *   + bonus_per_visit if enable_visit
 */
async function earnPoints({ userId, clubId, bookingId, amount, teeTime }) {
  const rule = await getRule(clubId);
  if (!rule.enable_spending) return { points: 0 };

  let pts = Math.floor(amount / 1_000) * rule.pts_per_spending;

  if (rule.enable_weekday && rule.weekday_multiplier !== 1.0) {
    const day = new Date(teeTime).getDay(); // 0 Sun, 6 Sat
    if (day >= 1 && day <= 5) pts = Math.round(pts * rule.weekday_multiplier);
  }

  if (rule.enable_visit && rule.bonus_per_visit > 0) {
    pts += rule.bonus_per_visit;
  }

  if (pts <= 0) return { points: 0 };

  const { error } = await supabase.from('loyalty_ledger').insert({
    club_id: clubId,
    user_id: userId,
    points: pts,
    transaction_type: 'Earn',
    description: `Round at club — booking ${bookingId}`,
  });

  if (error) throw new Error(error.message);

  logger.info('Loyalty earned', { userId, clubId, points: pts, bookingId });
  return { points: pts };
}

/**
 * GET /api/loyalty — points balance per club for a user.
 * Returns: { balances: [{ club_id, club_name, points }], total }
 */
async function getBalances(userId) {
  const { data, error } = await supabase
    .from('loyalty_ledger')
    .select('club_id, points, clubs(name, short_name)')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);

  // Aggregate per club
  const map = {};
  for (const row of data ?? []) {
    const cid = row.club_id ?? 'network';
    if (!map[cid]) map[cid] = { club_id: cid, club_name: row.clubs?.short_name ?? 'Rhapsody Network', points: 0 };
    map[cid].points += row.points;
  }

  const balances = Object.values(map).sort((a, b) => b.points - a.points);
  const total = balances.reduce((s, b) => s + b.points, 0);
  return { balances, total };
}

/**
 * GET /api/loyalty/history — paginated ledger for a user.
 */
async function getLedger(userId, { clubId, limit = 30, offset = 0 } = {}) {
  let query = supabase
    .from('loyalty_ledger')
    .select('id, club_id, points, transaction_type, description, created_at, clubs(short_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (clubId) query = query.eq('club_id', clubId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

/**
 * GET /api/admin/loyalty-rules/:clubId
 */
async function getAdminRule(clubId) {
  return getRule(clubId);
}

/**
 * PUT /api/admin/loyalty-rules/:clubId
 * Upserts the rule for a club.
 */
async function upsertRule(clubId, fields) {
  const allowed = [
    'pts_per_spending', 'bonus_per_visit', 'weekday_multiplier',
    'birthday_reward_pts', 'tier_upgrade_threshold',
    'enable_spending', 'enable_visit', 'enable_weekday', 'enable_birthday', 'enable_tier',
  ];
  const patch = {};
  for (const k of allowed) {
    if (fields[k] !== undefined) patch[k] = fields[k];
  }

  const { data, error } = await supabase
    .from('loyalty_rules')
    .upsert({ club_id: clubId, ...patch }, { onConflict: 'club_id' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

module.exports = { earnPoints, getBalances, getLedger, getAdminRule, upsertRule };
