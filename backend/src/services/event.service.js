const supabase = require('../config/supabase');
const { snap } = require('../config/midtrans');
const logger = require('../utils/logger');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Count confirmed/checked-in participants for an event (slot usage).
 */
async function getSlotsUsed(eventId) {
  const { data, error } = await supabase
    .from('event_registrations')
    .select('event_participants(id)', { count: 'exact' })
    .eq('tournament_id', eventId)
    .in('status', ['Confirmed', 'CheckedIn']);

  if (error) throw new Error(error.message);

  // Supabase returns nested arrays — flatten to count
  return (data ?? []).reduce((sum, reg) => sum + (reg.event_participants?.length ?? 0), 0);
}

// ─── Golfer queries ───────────────────────────────────────────────────────────

/**
 * List public events (Open only, excluding Draft).
 */
async function listEvents({ clubId, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from('events')
    .select(`
      id, club_id, title, description, hero_image_url, venue, maps_url,
      date, starting_time, registration_deadline, quota, entry_fee, status,
      clubs(name, short_name, location, logo_url)
    `)
    .eq('status', 'Open')
    .order('date')
    .range(offset, offset + limit - 1);

  if (clubId) query = query.eq('club_id', clubId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Get single event detail with slot usage count.
 */
async function getEvent(id) {
  const { data, error } = await supabase
    .from('events')
    .select(`
      id, club_id, title, description, hero_image_url, venue, maps_url,
      date, starting_time, registration_deadline, quota, entry_fee, status,
      clubs(id, name, short_name, location, logo_url, banner_url)
    `)
    .eq('id', id)
    .neq('status', 'Draft')
    .single();

  if (error || !data) throw new Error('Event not found');

  const slotsUsed = await getSlotsUsed(id);
  return { ...data, slots_used: slotsUsed, slots_available: data.quota - slotsUsed };
}

/**
 * Get a user's registration for an event, including participants.
 */
async function getMyRegistration({ eventId, userId }) {
  const { data, error } = await supabase
    .from('event_registrations')
    .select(`
      id, status, total_fee, notes, registered_at,
      event_participants(id, name, phone, email, is_registrant)
    `)
    .eq('tournament_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data; // null if not registered
}

/**
 * Get all event registrations for a user (history).
 */
async function getUserEventRegistrations(userId) {
  const { data, error } = await supabase
    .from('event_registrations')
    .select(`
      id, tournament_id, status, total_fee, registered_at,
      events(id, title, date, starting_time, venue, hero_image_url, clubs(name)),
      event_participants(id, name, phone, email, is_registrant)
    `)
    .eq('user_id', userId)
    .order('registered_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

// ─── Registration ──────────────────────────────────────────────────────────────

/**
 * Register a user (and optional additional players) for an event.
 *
 * players: [{ name, phone?, email? }]  — first entry = the registrant themselves
 *
 * Returns:
 *   - { status: 'Confirmed', registration } for free events
 *   - { snapToken, registrationId } for paid events
 */
async function registerForEvent({ eventId, userId, players }) {
  if (!players?.length) throw new Error('At least one player is required');

  // ── 1. Load event
  const { data: event, error: evErr } = await supabase
    .from('events')
    .select('id, club_id, title, entry_fee, quota, status, registration_deadline')
    .eq('id', eventId)
    .single();

  if (evErr || !event) throw new Error('Event not found');
  if (event.status !== 'Open') throw new Error(`Registration is ${event.status}`);
  if (new Date(event.registration_deadline) < new Date()) {
    throw new Error('Registration deadline has passed');
  }

  // ── 2. Check for duplicate registration
  const { data: existing } = await supabase
    .from('event_registrations')
    .select('id, status')
    .eq('tournament_id', eventId)
    .eq('user_id', userId)
    .in('status', ['PendingPayment', 'Confirmed', 'CheckedIn'])
    .maybeSingle();

  if (existing) {
    if (existing.status === 'PendingPayment') {
      // Abandoned payment — delete stale row so unique (tournament_id, user_id) is freed
      await supabase.from('event_registrations').delete().eq('id', existing.id);
    } else {
      throw new Error('Already registered for this event');
    }
  }

  // ── 3. Quota check (count confirmed+checkedIn participants)
  const slotsUsed = await getSlotsUsed(eventId);
  const slotsNeeded = players.length;
  if (slotsUsed + slotsNeeded > event.quota) {
    throw new Error('Not enough quota available');
  }

  const totalFee = event.entry_fee * slotsNeeded;
  const isFree = totalFee === 0;

  // ── 4. Create registration
  const { data: reg, error: regErr } = await supabase
    .from('event_registrations')
    .insert({
      tournament_id: eventId,
      user_id: userId,
      status: isFree ? 'Confirmed' : 'PendingPayment',
      total_fee: totalFee,
    })
    .select('id')
    .single();

  if (regErr) throw new Error(regErr.message);

  // ── 5. Create participant rows
  const participantRows = players.map((p, i) => ({
    registration_id: reg.id,
    name: p.name,
    phone: p.phone ?? null,
    email: p.email ?? null,
    is_registrant: i === 0,
  }));

  const { error: partErr } = await supabase
    .from('event_participants')
    .insert(participantRows);

  if (partErr) {
    // Roll back registration if participants fail
    await supabase.from('event_registrations').delete().eq('id', reg.id);
    throw new Error(partErr.message);
  }

  if (isFree) {
    return { status: 'Confirmed', registrationId: reg.id };
  }

  // ── 6. Init Midtrans Snap token
  const orderId = `EVT-${reg.id}-${Date.now()}`;
  const { data: user } = await supabase
    .from('users')
    .select('name, email, phone')
    .eq('id', userId)
    .single();

  const snapParams = {
    transaction_details: {
      order_id: orderId,
      gross_amount: totalFee,
    },
    item_details: [
      {
        id: eventId,
        price: event.entry_fee,
        quantity: slotsNeeded,
        name: event.title.substring(0, 50),
      },
    ],
    customer_details: {
      first_name: user?.name ?? 'Golfer',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    },
    custom_field1: reg.id,
    custom_field2: event.club_id,
  };

  let snapToken;
  try {
    const snapRes = await snap.createTransaction(snapParams);
    snapToken = snapRes.token;
  } catch (err) {
    logger.error('Midtrans snap error for event', { message: err.message, regId: reg.id });
    // Save order_id for manual recovery even if snap fails
    await supabase
      .from('event_registrations')
      .update({ notes: `order_id:${orderId}` })
      .eq('id', reg.id);
    throw new Error('Payment gateway error, please try again');
  }

  // Store snap_token + order_id (token valid 24h, used for resume payment)
  await supabase
    .from('event_registrations')
    .update({ notes: `order_id:${orderId}`, snap_token: snapToken })
    .eq('id', reg.id);

  return { snapToken, registrationId: reg.id };
}

/**
 * Get stored snap_token for a PendingPayment registration (resume payment).
 */
async function getEventSnapToken({ eventId, userId }) {
  const { data, error } = await supabase
    .from('event_registrations')
    .select('id, status, snap_token')
    .eq('tournament_id', eventId)
    .eq('user_id', userId)
    .eq('status', 'PendingPayment')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('No pending payment found');
  if (!data.snap_token) throw new Error('Payment token expired or unavailable');
  return { snap_token: data.snap_token, registration_id: data.id };
}

/**
 * Cancel a user's registration for an event.
 * Only allowed before registration_deadline.
 */
async function cancelMyRegistration({ eventId, userId }) {
  const { data: event } = await supabase
    .from('events')
    .select('registration_deadline')
    .eq('id', eventId)
    .single();

  if (!event) throw new Error('Event not found');
  if (new Date(event.registration_deadline) < new Date()) {
    throw new Error('Cannot cancel after registration deadline');
  }

  const { data: reg, error } = await supabase
    .from('event_registrations')
    .update({ status: 'Cancelled' })
    .eq('tournament_id', eventId)
    .eq('user_id', userId)
    .in('status', ['Confirmed', 'PendingPayment'])
    .select('id')
    .single();

  if (error || !reg) throw new Error('Registration not found or already cancelled');
  return { cancelled: true, registrationId: reg.id };
}

// ─── Club admin queries ───────────────────────────────────────────────────────

/**
 * List all events for a club (all statuses).
 */
async function listClubEvents({ clubId, status, limit = 50, offset = 0 }) {
  let query = supabase
    .from('events')
    .select('id, title, date, starting_time, status, quota, entry_fee, hero_image_url, created_at')
    .eq('club_id', clubId)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Enrich with slots_used count
  const enriched = await Promise.all(
    (data ?? []).map(async (ev) => {
      const used = await getSlotsUsed(ev.id);
      return { ...ev, slots_used: used };
    })
  );
  return enriched;
}

/**
 * Get event detail with full registration + participant list.
 */
async function getClubEvent({ eventId, clubId }) {
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('club_id', clubId)
    .single();

  if (error || !event) throw new Error('Event not found');

  const { data: registrations, error: rErr } = await supabase
    .from('event_registrations')
    .select(`
      id, status, total_fee, notes, registered_at,
      users(id, name, email, phone, rhapsody_id),
      event_participants(id, name, phone, email, is_registrant)
    `)
    .eq('tournament_id', eventId)
    .order('registered_at');

  if (rErr) throw new Error(rErr.message);

  return { ...event, registrations: registrations ?? [] };
}

/**
 * Create a new event (status: Draft).
 */
async function createEvent({ clubId, fields }) {
  const { data, error } = await supabase
    .from('events')
    .insert({ club_id: clubId, ...fields, status: 'Draft' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Update event fields (restricted to allowed columns).
 */
async function updateEvent({ eventId, clubId, fields }) {
  const ALLOWED = [
    'title', 'description', 'hero_image_url', 'venue', 'maps_url',
    'date', 'starting_time', 'registration_deadline', 'quota', 'entry_fee',
  ];
  const patch = {};
  for (const k of ALLOWED) {
    if (fields[k] !== undefined) patch[k] = fields[k];
  }
  if (!Object.keys(patch).length) throw new Error('No valid fields provided');

  const { data, error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', eventId)
    .eq('club_id', clubId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Event not found');
  return data;
}

/**
 * Change event status (publish / close / cancel / complete).
 */
async function updateEventStatus({ eventId, clubId, status }) {
  const ALLOWED_TRANSITIONS = {
    Draft: ['Open', 'Cancelled'],
    Open: ['Closed', 'Cancelled'],
    Closed: ['Completed', 'Cancelled'],
  };

  const { data: current } = await supabase
    .from('events')
    .select('status')
    .eq('id', eventId)
    .eq('club_id', clubId)
    .single();

  if (!current) throw new Error('Event not found');

  const allowed = ALLOWED_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(status)) {
    throw new Error(`Cannot transition from ${current.status} to ${status}`);
  }

  const { data, error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId)
    .eq('club_id', clubId)
    .select('id, status')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete an event (only Draft or Cancelled with no Confirmed registrations).
 */
async function deleteEvent({ eventId, clubId }) {
  const { data: event } = await supabase
    .from('events')
    .select('status')
    .eq('id', eventId)
    .eq('club_id', clubId)
    .single();

  if (!event) throw new Error('Event not found');
  if (!['Draft', 'Cancelled'].includes(event.status)) {
    throw new Error('Can only delete Draft or Cancelled events');
  }

  // Guard: no confirmed registrations
  const { count } = await supabase
    .from('event_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', eventId)
    .in('status', ['Confirmed', 'CheckedIn']);

  if (count > 0) throw new Error('Cannot delete event with confirmed registrations');

  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) throw new Error(error.message);
  return { deleted: true };
}

/**
 * Update a single registration status (CheckedIn or Cancelled) by club admin.
 */
async function updateRegistrationStatus({ eventId, registrationId, clubId, status }) {
  if (!['CheckedIn', 'Cancelled'].includes(status)) {
    throw new Error('status must be CheckedIn or Cancelled');
  }

  // Verify registration belongs to this event + club
  const { data: reg } = await supabase
    .from('event_registrations')
    .select('id, status, events!inner(club_id)')
    .eq('id', registrationId)
    .eq('tournament_id', eventId)
    .single();

  if (!reg || reg.events?.club_id !== clubId) throw new Error('Registration not found');
  if (reg.status === 'Cancelled') throw new Error('Registration already cancelled');

  const { data, error } = await supabase
    .from('event_registrations')
    .update({ status })
    .eq('id', registrationId)
    .select('id, status')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

module.exports = {
  listEvents,
  getEvent,
  getMyRegistration,
  getUserEventRegistrations,
  getEventSnapToken,
  registerForEvent,
  cancelMyRegistration,
  listClubEvents,
  getClubEvent,
  createEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent,
  updateRegistrationStatus,
};
