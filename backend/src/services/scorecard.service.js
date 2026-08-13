const supabase = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Save a scorecard after a round.
 * Computes gross score from strokes array.
 * After saving, recalculates and updates handicap_index on the user row.
 */
async function saveScorecard({ userId, clubId, date, courseName, strokes, pars }) {
  if (!Array.isArray(strokes) || strokes.length !== 18) {
    throw new Error('strokes must be an array of 18 numbers');
  }
  if (!Array.isArray(pars) || pars.length !== 18) {
    throw new Error('pars must be an array of 18 numbers');
  }

  const score = strokes.reduce((a, b) => a + b, 0);

  const { data, error } = await supabase
    .from('scorecards')
    .insert({
      club_id: clubId,
      user_id: userId,
      date,
      score,
      course_name: courseName,
      strokes,
      pars,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Update handicap index asynchronously (best 8 of last 20)
  updateHandicap(userId).catch((e) =>
    logger.warn('Handicap update failed', { message: e.message })
  );

  logger.info('Scorecard saved', { userId, clubId, score });
  return data;
}

/**
 * Handicap calculation: best 8 score differentials from last 20 rounds.
 * Differential = (gross - course_par) — simplified (no slope/rating in schema).
 * USGA formula uses slope/rating, but we use gross - par as proxy.
 */
async function updateHandicap(userId) {
  const { data: cards, error } = await supabase
    .from('scorecards')
    .select('score, pars')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(20);

  if (error || !cards || cards.length < 3) return; // need at least 3 rounds

  const differentials = cards.map((c) => {
    const par = c.pars.reduce((a, b) => a + b, 0);
    return c.score - par;
  });

  differentials.sort((a, b) => a - b);
  const best = differentials.slice(0, Math.min(8, differentials.length));
  const avg = best.reduce((a, b) => a + b, 0) / best.length;
  const handicap = Math.max(0, Math.min(54, Math.round(avg * 10) / 10));

  await supabase
    .from('users')
    .update({ handicap_index: handicap, handicap_updated: new Date().toISOString() })
    .eq('id', userId);
}

/**
 * Get scorecards for a user, optionally filtered by clubId.
 */
async function getScorecards(userId, { clubId, limit = 20, offset = 0 } = {}) {
  let query = supabase
    .from('scorecards')
    .select('id, club_id, date, score, course_name, strokes, pars, created_at, clubs(short_name)')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (clubId) query = query.eq('club_id', clubId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

module.exports = { saveScorecard, getScorecards, updateHandicap };
