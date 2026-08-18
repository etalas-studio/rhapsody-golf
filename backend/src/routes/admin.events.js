const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { scopeClub } = require('../middleware/clubScope');
const { audit } = require('../services/audit.service');
const {
  listClubEvents,
  getClubEvent,
  createEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent,
  updateRegistrationStatus,
} = require('../services/event.service');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');

const router = Router();

function requireClubAdmin(req, res, next) {
  if (req.role !== 'club_admin' && req.role !== 'superadmin') {
    return res.status(403).json({ error: 'Club admin access required' });
  }
  next();
}

router.use(requireAuth, requireClubAdmin);

// ─── List events ───────────────────────────────────────────────────────────────

/**
 * GET /api/admin/events?clubId=&status=&limit=&offset=
 */
router.get('/events', scopeClub, async (req, res) => {
  const { status, limit, offset } = req.query;
  try {
    const events = await listClubEvents({
      clubId: req.clubId,
      status,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ events });
  } catch (err) {
    logger.error('GET /admin/events error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── Get single event ──────────────────────────────────────────────────────────

/**
 * GET /api/admin/events/:id?clubId=
 */
router.get('/events/:id', scopeClub, async (req, res) => {
  try {
    const event = await getClubEvent({ eventId: req.params.id, clubId: req.clubId });
    res.json({ event });
  } catch (err) {
    const code = err.message === 'Event not found' ? 404 : 500;
    res.status(code).json({ error: err.message });
  }
});

// ─── Create event ──────────────────────────────────────────────────────────────

/**
 * POST /api/admin/events
 * Body: { clubId, title, description, venue, maps_url, date, starting_time,
 *         registration_deadline, quota, entry_fee, hero_image_url? }
 */
router.post('/events', scopeClub, async (req, res) => {
  const { title, description, venue, maps_url, date, starting_time,
          registration_deadline, quota, entry_fee, hero_image_url } = req.body;

  if (!title || !description || !date || !starting_time || !registration_deadline
      || quota === undefined || entry_fee === undefined) {
    return res.status(400).json({
      error: 'title, description, date, starting_time, registration_deadline, quota, entry_fee are required',
    });
  }

  try {
    const event = await createEvent({
      clubId: req.clubId,
      fields: {
        title,
        description,
        venue: venue ?? null,
        maps_url: maps_url ?? null,
        date,
        starting_time,
        registration_deadline,
        quota: Number(quota),
        entry_fee: Number(entry_fee),
        hero_image_url: hero_image_url ?? null,
      },
    });
    audit(req, 'create_event', { detail: { eventId: event.id, title } });
    res.status(201).json({ event });
  } catch (err) {
    logger.error('POST /admin/events error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── Upload hero image ─────────────────────────────────────────────────────────

/**
 * POST /api/admin/events/:id/hero-image?clubId=
 * multipart/form-data: file field "image"
 * Returns { hero_image_url }
 */
router.post('/events/:id/hero-image', scopeClub, async (req, res) => {
  // Multer or busboy should be wired at server level; here we use raw buffer approach
  // via express.raw or the existing multipart middleware on the server.
  // If multipart middleware is not global, wire it per-route at server.js.
  const file = req.file; // populated by multer middleware (wire in server.js)
  if (!file) return res.status(400).json({ error: 'image file required' });

  const ext = file.originalname.split('.').pop().toLowerCase();
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return res.status(400).json({ error: 'Only jpg, png, webp allowed' });
  }
  if (file.size > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'Max file size 5MB' });
  }

  const path = `events/${req.params.id}/hero.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from('club-images')
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });

  if (uploadErr) {
    logger.error('Hero image upload error', { message: uploadErr.message });
    return res.status(500).json({ error: uploadErr.message });
  }

  const { data: { publicUrl } } = supabase.storage
    .from('club-images')
    .getPublicUrl(path);

  // Persist URL to event row
  await supabase
    .from('events')
    .update({ hero_image_url: publicUrl })
    .eq('id', req.params.id)
    .eq('club_id', req.clubId);

  res.json({ hero_image_url: publicUrl });
});

// ─── Update event ──────────────────────────────────────────────────────────────

/**
 * PUT /api/admin/events/:id
 * Body: { clubId, ...editableFields }
 */
router.put('/events/:id', scopeClub, async (req, res) => {
  try {
    const event = await updateEvent({
      eventId: req.params.id,
      clubId: req.clubId,
      fields: req.body,
    });
    audit(req, 'update_event', { detail: { eventId: req.params.id } });
    res.json({ event });
  } catch (err) {
    const code = err.message === 'Event not found' ? 404
      : err.message === 'No valid fields provided' ? 400 : 500;
    res.status(code).json({ error: err.message });
  }
});

// ─── Update event status ───────────────────────────────────────────────────────

/**
 * PATCH /api/admin/events/:id/status
 * Body: { clubId, status: 'Open'|'Closed'|'Completed'|'Cancelled' }
 */
router.patch('/events/:id/status', scopeClub, async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status is required' });

  try {
    const event = await updateEventStatus({
      eventId: req.params.id,
      clubId: req.clubId,
      status,
    });
    audit(req, 'update_event_status', { detail: { eventId: req.params.id, status } });
    res.json({ event });
  } catch (err) {
    const code = err.message === 'Event not found' ? 404
      : err.message.startsWith('Cannot transition') ? 400 : 500;
    res.status(code).json({ error: err.message });
  }
});

// ─── Delete event ──────────────────────────────────────────────────────────────

/**
 * DELETE /api/admin/events/:id?clubId=
 */
router.delete('/events/:id', scopeClub, async (req, res) => {
  try {
    await deleteEvent({ eventId: req.params.id, clubId: req.clubId });
    audit(req, 'delete_event', { detail: { eventId: req.params.id } });
    res.json({ deleted: true });
  } catch (err) {
    const code = err.message === 'Event not found' ? 404
      : err.message.startsWith('Can only') || err.message.startsWith('Cannot delete') ? 400
      : 500;
    res.status(code).json({ error: err.message });
  }
});

// ─── Registrations list ────────────────────────────────────────────────────────

/**
 * GET /api/admin/events/:id/registrations?clubId=&status=
 * Returns flat list of participants (one row per participant, not per registration).
 */
router.get('/events/:id/registrations', scopeClub, async (req, res) => {
  const { status } = req.query;
  try {
    let query = supabase
      .from('event_registrations')
      .select(`
        id, status, total_fee, registered_at, notes,
        users(id, name, email, phone, rhapsody_id),
        event_participants(id, name, phone, email, is_registrant),
        events!inner(club_id)
      `)
      .eq('tournament_id', req.params.id)
      .eq('events.club_id', req.clubId)
      .order('registered_at');

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    res.json({ registrations: data ?? [] });
  } catch (err) {
    logger.error('GET /admin/events/:id/registrations error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── Update registration (check-in / cancel) ───────────────────────────────────

/**
 * PATCH /api/admin/events/:id/registrations/:regId
 * Body: { clubId, status: 'CheckedIn'|'Cancelled' }
 */
router.patch('/events/:id/registrations/:regId', scopeClub, async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status is required' });

  try {
    const reg = await updateRegistrationStatus({
      eventId: req.params.id,
      registrationId: req.params.regId,
      clubId: req.clubId,
      status,
    });
    audit(req, 'update_event_registration', {
      detail: { eventId: req.params.id, registrationId: req.params.regId, status },
    });
    res.json({ registration: reg });
  } catch (err) {
    const code = err.message === 'Registration not found' ? 404
      : err.message.includes('must be') || err.message.includes('already') ? 400
      : 500;
    res.status(code).json({ error: err.message });
  }
});

// ─── Export CSV ────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/events/:id/registrations/export-csv?clubId=
 * Streams a CSV of all participants (Confirmed + CheckedIn).
 */
router.get('/events/:id/registrations/export-csv', scopeClub, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('event_registrations')
      .select(`
        status, registered_at,
        users(name, email, phone),
        event_participants(name, phone, email, is_registrant),
        events!inner(club_id, title)
      `)
      .eq('tournament_id', req.params.id)
      .eq('events.club_id', req.clubId)
      .in('status', ['Confirmed', 'CheckedIn']);

    if (error) throw new Error(error.message);

    const rows = [];
    for (const reg of data ?? []) {
      for (const p of reg.event_participants ?? []) {
        rows.push([
          p.is_registrant ? reg.users?.name ?? p.name : p.name,
          p.phone ?? reg.users?.phone ?? '',
          p.email ?? reg.users?.email ?? '',
          reg.status,
          new Date(reg.registered_at).toISOString().slice(0, 10),
          p.is_registrant ? 'Yes' : 'No',
        ]);
      }
    }

    const header = 'Name,Phone,Email,Status,Registered Date,Is Registrant\n';
    const body = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

    const eventTitle = data?.[0]?.events?.title ?? 'event';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${eventTitle.replace(/[^a-z0-9]/gi, '_')}_participants.csv"`);
    res.send(header + body);
  } catch (err) {
    logger.error('GET /admin/events/export-csv error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
