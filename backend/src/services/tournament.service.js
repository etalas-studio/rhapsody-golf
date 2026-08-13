const supabase = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * List tournaments with optional filters.
 * Filters: clubId, status, format
 */
async function listTournaments({ clubId, status, format, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from('tournaments')
    .select(`
      id, club_id, title, date, status, participants, max_participants,
      fee, format, description, registration_deadline, shotgun_time,
      prize_pool, rules, includes, contact, schedule, created_at,
      clubs(name, short_name, location)
    `)
    .order('date')
    .range(offset, offset + limit - 1);

  if (clubId) query = query.eq('club_id', clubId);
  if (status) query = query.eq('status', status);
  if (format) query = query.ilike('format', `%${format}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Get a single tournament with registration count.
 */
async function getTournament(id) {
  const { data, error } = await supabase
    .from('tournaments')
    .select(`
      *,
      clubs(name, short_name, location, logo_url, banner_url),
      registrations:tournament_registrations(count)
    `)
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Tournament not found');
  return data;
}

/**
 * Register a user for a tournament.
 * Creates TournamentRegistration + PaymentTransaction.
 * Moves to Waitlist if max_participants reached.
 */
async function registerForTournament({ tournamentId, userId }) {
  const { data: t, error: tErr } = await supabase
    .from('tournaments')
    .select('id, club_id, title, fee, status, participants, max_participants, registration_deadline')
    .eq('id', tournamentId)
    .single();

  if (tErr || !t) throw new Error('Tournament not found');
  if (t.status !== 'Open') throw new Error(`Registration is ${t.status}`);
  if (new Date(t.registration_deadline) < new Date()) throw new Error('Registration deadline has passed');

  // Check not already registered
  const { data: existing } = await supabase
    .from('tournament_registrations')
    .select('id, status')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .single();

  if (existing && existing.status !== 'Cancelled') {
    throw new Error('Already registered for this tournament');
  }

  const isFull = t.participants >= t.max_participants;
  const regStatus = isFull ? 'Waitlist' : 'Registered';

  // Upsert registration (re-register after cancel)
  const { data: reg, error: regErr } = await supabase
    .from('tournament_registrations')
    .upsert(
      {
        tournament_id: tournamentId,
        user_id: userId,
        status: regStatus,
        registered_at: new Date().toISOString(),
        payment_status: isFull ? 'Pending' : 'Paid',
      },
      { onConflict: 'tournament_id,user_id' }
    )
    .select()
    .single();

  if (regErr) throw new Error(regErr.message);

  if (!isFull) {
    // Increment participants count
    await supabase
      .from('tournaments')
      .update({ participants: t.participants + 1 })
      .eq('id', tournamentId);

    // Mock payment record
    const ref = `TREG-${Date.now()}`;
    await supabase.from('payments').insert({
      club_id: t.club_id,
      user_id: userId,
      amount: t.fee,
      payment_method_type: 'EWallet',
      transaction_status: 'Paid',
      reference_number: ref,
      settlement_status: 'Settled',
      category: 'Tournament',
    });
  }

  logger.info('Tournament registration', { tournamentId, userId, status: regStatus });
  return { registration: reg, waitlisted: isFull };
}

/**
 * Cancel a tournament registration.
 * Only the registrant can cancel their own.
 */
async function cancelRegistration({ tournamentId, userId }) {
  const { data: reg, error } = await supabase
    .from('tournament_registrations')
    .select('id, status, tournament_id')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .single();

  if (error || !reg) throw new Error('Registration not found');
  if (reg.status === 'Cancelled') throw new Error('Already cancelled');
  if (['CheckedIn', 'Completed'].includes(reg.status)) {
    throw new Error('Cannot cancel after check-in');
  }

  const { error: updErr } = await supabase
    .from('tournament_registrations')
    .update({ status: 'Cancelled' })
    .eq('id', reg.id);

  if (updErr) throw new Error(updErr.message);

  // Decrement participants if was Registered (not Waitlist)
  if (reg.status === 'Registered' || reg.status === 'Confirmed') {
    const { data: t } = await supabase
      .from('tournaments')
      .select('participants')
      .eq('id', tournamentId)
      .single();
    if (t && t.participants > 0) {
      await supabase
        .from('tournaments')
        .update({ participants: t.participants - 1 })
        .eq('id', tournamentId);
    }
  }

  logger.info('Tournament registration cancelled', { tournamentId, userId });
  return { cancelled: true };
}

module.exports = { listTournaments, getTournament, registerForTournament, cancelRegistration };
