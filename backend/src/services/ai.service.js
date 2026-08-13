const fs = require('fs');
const path = require('path');
const anthropic = require('../config/claude');
const supabase = require('../config/supabase');
const config = require('../config');
const logger = require('../utils/logger');
const { todayWIB, nowTimeWIB } = require('../utils/time');
const { createBooking } = require('./booking.service');
const { getBalances } = require('./loyalty.service');
const { getUserVouchers } = require('./voucher.service');
const { generateInvoice } = require('./invoice.service');
const { snap } = require('../config/midtrans');

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '../prompts/booking.prompt.md'),
  'utf-8'
);

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'GetCustomerProfileTool',
    description:
      'Look up whether this user has booked before, by user_id. Call once at the start of a new conversation.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'ListGolfCoursesTool',
    description:
      'List active golf courses from the database. Always call this before naming any course.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'CheckAvailabilityTool',
    description:
      'Check slot availability for a course on a date. Omit time to get all slots for that date.',
    input_schema: {
      type: 'object',
      properties: {
        course_name: {
          type: 'string',
          description: 'Exact course name from ListGolfCoursesTool',
        },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        time: { type: 'string', description: 'HH:MM — optional, omit to list all slots' },
      },
      required: ['date'],
    },
  },
  {
    name: 'CreateBookingTool',
    description: 'Create a booking after the user has confirmed the summary.',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        slot_id: { type: 'string', description: 'UUID of the tee slot to book' },
        players: { type: 'number' },
        cart: { type: 'boolean' },
        caddie: { type: 'boolean' },
        voucher_code: { type: 'string', description: 'Optional voucher code to apply' },
      },
      required: ['user_id', 'slot_id', 'players'],
    },
  },
  {
    name: 'GetLoyaltyPointsTool',
    description: "Get the user's loyalty points balance per club.",
    input_schema: {
      type: 'object',
      properties: { user_id: { type: 'string' } },
      required: ['user_id'],
    },
  },
  {
    name: 'CheckVoucherTool',
    description: "Get the user's active vouchers for a specific club.",
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        club_id: { type: 'string' },
      },
      required: ['user_id', 'club_id'],
    },
  },
  {
    name: 'GenerateInvoiceTool',
    description: 'Generate a PDF invoice for a paid booking and send it to the user via in-app message. Call this after payment is confirmed.',
    input_schema: {
      type: 'object',
      properties: {
        booking_id: { type: 'string', description: 'UUID of the confirmed booking' },
      },
      required: ['booking_id'],
    },
  },
  {
    name: 'SendInAppMessageTool',
    description:
      'Send a message to the in-app chat UI. Set with_confirm_buttons=true ONLY for the booking confirmation summary step. After CreateBookingTool succeeds, call this with the booking_id in booking_payload — payment is handled on the booking detail page.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        with_confirm_buttons: { type: 'boolean' },
        booking_payload: {
          type: 'object',
          description: 'Booking details to attach when with_confirm_buttons is true (pre-payment summary)',
          properties: {
            booking_id: { type: 'string', description: 'ID from CreateBookingTool — required after booking is created' },
            slot_id: { type: 'string' },
            club_id: { type: 'string' },
            course_name: { type: 'string' },
            date: { type: 'string' },
            time: { type: 'string' },
            players: { type: 'number' },
            amount: { type: 'number' },
            cart: { type: 'boolean' },
            caddie: { type: 'boolean' },
            voucher_code: { type: 'string' },
          },
        },
        snap_token: {
          type: 'string',
          description: 'Midtrans Snap token from GeneratePaymentTool — triggers payment popup in app',
        },
        order_id: {
          type: 'string',
          description: 'Midtrans order_id from GeneratePaymentTool — used to poll payment status',
        },
        invoice_url: {
          type: 'string',
          description: 'PDF invoice URL from GenerateInvoiceTool — shown after payment confirmed',
        },
      },
      required: ['text'],
    },
  },
];

const STATE_BY_TOOL = {
  CheckAvailabilityTool: 'CHECK_AVAILABILITY',
  CreateBookingTool: 'BOOKED',
  GenerateInvoiceTool: 'DONE',
};

// ─── Real tool handlers ───────────────────────────────────────────────────────

function buildToolHandlers({ userId }) {
  return {
    // Returns user profile + last booking date
    GetCustomerProfileTool: async () => {
      const { data: user } = await supabase
        .from('users')
        .select('id, name, email, rhapsody_id, handicap_index')
        .eq('id', userId)
        .single();

      if (!user) return { found: false };

      const { data: lastBooking } = await supabase
        .from('bookings')
        .select('tee_time, clubs(short_name)')
        .eq('user_id', userId)
        .order('tee_time', { ascending: false })
        .limit(1)
        .single();

      return {
        found: true,
        name: user.name,
        email: user.email,
        rhapsody_id: user.rhapsody_id,
        handicap_index: user.handicap_index,
        last_booking: lastBooking
          ? {
              date: lastBooking.tee_time?.slice(0, 10),
              club: lastBooking.clubs?.short_name,
            }
          : null,
      };
    },

    // Lists all active clubs/courses
    ListGolfCoursesTool: async () => {
      const { data: clubs, error } = await supabase
        .from('clubs')
        .select('id, name, short_name, location, number_of_holes, par')
        .order('name');

      if (error) {
        logger.error('ListGolfCoursesTool error', { message: error.message });
        return { courses: [] };
      }

      return {
        courses: (clubs || []).map((c) => ({
          id: c.id,
          name: c.name,
          short_name: c.short_name,
          location: c.location,
          holes: c.number_of_holes,
          par: c.par,
        })),
      };
    },

    // Checks tee slot availability for a course + date
    CheckAvailabilityTool: async ({ course_name, date, time }) => {
      // Resolve club by name (partial match, case-insensitive) — include interval for end_time fallback
      const { data: clubs } = await supabase
        .from('clubs')
        .select('id, name, tee_interval_minutes')
        .ilike('name', `%${course_name || ''}%`)
        .limit(3);

      if (!clubs || clubs.length === 0) {
        return { slots: [], alternatives: [], error: 'Course not found' };
      }
      const club = clubs[0];
      const intervalMins = club.tee_interval_minutes ?? 30;

      let query = supabase
        .from('tee_slots')
        .select('id, time, end_time, price, available')
        .eq('club_id', club.id)
        .eq('date', date)
        .eq('available', true)
        .order('time');

      if (time) query = query.eq('time', time);

      const { data: slots, error } = await query;
      if (error) {
        logger.error('CheckAvailabilityTool error', { message: error.message });
        return { slots: [], alternatives: [] };
      }

      // Compute end_time server-side so AI never has to infer it
      function addMinutes(hhmm, mins) {
        const [h, m] = hhmm.split(':').map(Number);
        const total = h * 60 + m + mins;
        return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
      }
      // Strip seconds from HH:MM:SS → HH:MM (Supabase time columns return HH:MM:SS)
      function toHHMM(t) { return t ? t.slice(0, 5) : t; }

      // Group slots by band, numbered sequentially across bands
      let counter = 1;
      const bandMap = {};
      for (const s of slots || []) {
        const slotTime = toHHMM(s.time); // always HH:MM
        const hour = parseInt(slotTime.split(':')[0], 10);
        const band = hour <= 10 ? 'Early' : hour <= 13 ? 'Prime' : 'Twilight';
        if (!bandMap[band]) bandMap[band] = { band, price_idr: s.price, price_display: `Rp ${s.price.toLocaleString('id-ID')}`, slots: [] };
        // Always include club_id per slot so AI can reliably copy it into booking_payload
        const endTime = toHHMM(s.end_time) ?? addMinutes(slotTime, intervalMins);
        bandMap[band].slots.push({ no: counter++, slot_id: s.id, club_id: club.id, time: slotTime, end_time: endTime });
      }
      const formatted = Object.values(bandMap);

      // Suggest next available date if none found for this date
      let alternatives = [];
      if (formatted.length === 0) {
        const { data: altSlots } = await supabase
          .from('tee_slots')
          .select('date, time, price_band, price')
          .eq('club_id', club.id)
          .eq('available', true)
          .gt('date', date)
          .order('date')
          .order('time')
          .limit(3);
        alternatives = altSlots || [];
      }

      return { club_id: club.id, club_name: club.name, date, slots: formatted, alternatives };
    },

    // Creates booking — returns booking_id for GeneratePaymentTool to use next
    CreateBookingTool: async ({ user_id, slot_id, players, cart, caddie, voucher_code }) => {
      try {
        const result = await createBooking({
          userId: user_id || userId,
          slotId: slot_id,
          players: players || 1,
          cart: cart || false,
          caddie: caddie || false,
          voucherCode: voucher_code || null,
          channelTag: 'GH_APP',
        });
        return {
          success: true,
          booking_id: result.booking.id,
          tee_time: result.booking.tee_time,
          amount: result.booking.amount,
          ref_code: result.booking.ref_code,
        };
      } catch (err) {
        logger.error('CreateBookingTool error', { message: err.message });
        return { success: false, error: err.message };
      }
    },

    // Reads the Snap token already created by createBooking() — avoids duplicate order_id
    GeneratePaymentTool: async ({ booking_id }) => {
      try {
        const { data: booking } = await supabase
          .from('bookings')
          .select('id, ref_code, amount, snap_token')
          .eq('id', booking_id)
          .single();

        if (!booking) return { success: false, error: 'Booking not found' };
        if (!booking.snap_token) return { success: false, error: 'Snap token not found' };

        return {
          success: true,
          snap_token: booking.snap_token,
          order_id: booking.ref_code,
          amount: booking.amount,
        };
      } catch (err) {
        logger.error('GeneratePaymentTool error', { message: err.message });
        return { success: false, error: err.message };
      }
    },

    // Generates PDF invoice and returns URL — called from webhook after payment confirmed
    GenerateInvoiceTool: async ({ booking_id }) => {
      try {
        const { data: booking } = await supabase
          .from('bookings')
          .select('id, ref_code, amount, tee_time, players, club_id, user_id, status')
          .eq('id', booking_id)
          .single();

        if (!booking || booking.status !== 'Confirmed') {
          return { success: false, error: 'Booking not confirmed' };
        }

        const [{ data: user }, { data: club }] = await Promise.all([
          supabase.from('users').select('name, email, rhapsody_id').eq('id', booking.user_id).single(),
          supabase.from('clubs').select('name').eq('id', booking.club_id).single(),
        ]);

        const invoice = await generateInvoice({ booking, user, club });

        return {
          success: true,
          pdf_url: invoice.pdf_url,
          invoice_number: invoice.invoice_number,
        };
      } catch (err) {
        logger.error('GenerateInvoiceTool error', { message: err.message });
        return { success: false, error: err.message };
      }
    },

    // Returns loyalty points balance per club
    GetLoyaltyPointsTool: async ({ user_id }) => {
      try {
        const result = await getBalances(user_id || userId);
        return result;
      } catch (err) {
        logger.error('GetLoyaltyPointsTool error', { message: err.message });
        return { balances: [], total: 0 };
      }
    },

    // Returns active vouchers for a club
    CheckVoucherTool: async ({ user_id, club_id }) => {
      try {
        const vouchers = await getUserVouchers({
          userId: user_id || userId,
          clubId: club_id,
        });
        return { vouchers };
      } catch (err) {
        logger.error('CheckVoucherTool error', { message: err.message });
        return { vouchers: [] };
      }
    },

    // Sends message to in-app chat (return value is picked up by the loop)
    SendInAppMessageTool: async ({ text, with_confirm_buttons, booking_payload, snap_token, order_id, invoice_url }) => ({
      sent: true,
      text,
      with_confirm_buttons: with_confirm_buttons ?? false,
      booking_payload: booking_payload ?? null,
      snap_token: snap_token ?? null,
      order_id: order_id ?? null,
      invoice_url: invoice_url ?? null,
    }),
  };
}

// ─── Chat history persistence ─────────────────────────────────────────────────

/**
 * Get or create a chat session for the user.
 * Returns the session id.
 */
async function getOrCreateSession(userId) {
  // Reuse session created today only — fresh session each day
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: existing } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('state', 'IDLE')
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) return existing.id;

  const now = new Date().toISOString();
  const { data: created, error } = await supabase
    .from('chat_sessions')
    .insert({ user_id: userId, state: 'IDLE', messages: [], created_at: now, updated_at: now })
    .select('id')
    .single();

  if (error) {
    logger.warn('Could not create chat session', { message: error.message });
    return null;
  }
  return created.id;
}

/**
 * Persist a single message to chat_messages.
 * Non-blocking — logs on failure.
 */
async function persistMessage(sessionId, role, content) {
  if (!sessionId) return;
  const { error } = await supabase
    .from('chat_messages')
    .insert({ session_id: sessionId, role, content });
  if (error) logger.warn('Could not persist chat message', { message: error.message });
}

/**
 * Load message history from a session (Anthropic Messages API format).
 * Returns [] if session not found.
 */
async function loadHistory(sessionId) {
  if (!sessionId) return [];
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at')
    .limit(100);

  if (error) {
    logger.warn('Could not load chat history', { message: error.message });
    return [];
  }

  // Rebuild Anthropic messages format — content is stored as text
  return (data || []).map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

// ─── Main conversation loop ───────────────────────────────────────────────────

/**
 * Runs one Claude tool-calling turn for an in-app chat conversation.
 * `history` is the prior messages array in Anthropic Messages API format.
 * When sessionId is provided, history is loaded from DB and the new messages are persisted.
 * Returns { finalText, confirmButtons, bookingPayload, messages, state, sessionId }
 */
async function runConversationTurn({
  userId,
  userText,
  history = [],
  currentState,
  sessionId,
}) {
  const handlers = buildToolHandlers({ userId });

  // Load from DB only if an explicit sessionId was passed — otherwise start fresh
  let workingHistory = history;
  let activeSessionId = sessionId || null;

  if (userId && activeSessionId) {
    workingHistory = await loadHistory(activeSessionId);
  } else if (userId && !activeSessionId && (!history || history.length === 0)) {
    activeSessionId = await getOrCreateSession(userId);
    // new session — no history yet
  }

  // ── Intercept __action:confirm_booking ──────────────────────────────────────
  // Frontend sends this when user taps "✅ Konfirmasi" — bypass AI loop,
  // directly call CreateBookingTool with the confirmed payload.
  if (userText.startsWith('__action:confirm_booking:')) {
    const payloadStr = userText.slice('__action:confirm_booking:'.length);
    let payload;
    try { payload = JSON.parse(payloadStr); } catch { payload = {}; }

    logger.info('confirm_booking intercept', { payload });

    // Always do a fresh DB lookup by club+date+time when available — prevents stale/wrong slot_id issues.
    // Falls back to payload.slot_id only if lookup fields are missing.
    // Normalize time: strip " WIB" suffix, extract only start time from range ("07:00–07:30" → "07:00"),
    // strip seconds if present ("07:00:00" → "07:00"), ensure 2-digit hour ("7:00" → "07:00").
    const rawTime = (payload.time || '').replace(/\s*WIB$/i, '').trim().split(/[–\-]/)[0].trim().slice(0, 5).replace(/^(\d):/, '0$1:');
    // Normalize date: AI may send display format ("Jumat, 14 Agustus 2026") instead of YYYY-MM-DD.
    // Try to parse it to ISO date if it doesn't look like YYYY-MM-DD already.
    const ID_MONTHS = { januari:1,februari:2,maret:3,april:4,mei:5,juni:6,juli:7,agustus:8,september:9,oktober:10,november:11,desember:12 };
    function normalizeDate(raw) {
      if (!raw) return raw;
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw; // already ISO
      // "Jumat, 14 Agustus 2026" or "14 Agustus 2026"
      const m = raw.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
      if (m) {
        const mon = ID_MONTHS[m[2].toLowerCase()];
        if (mon) return `${m[3]}-${String(mon).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
      }
      return raw;
    }
    const rawDate = normalizeDate(payload.date);
    let resolvedClubId = payload.club_id;

    // If AI omitted club_id but gave course_name, resolve it now
    if (!resolvedClubId && payload.course_name) {
      const { data: clubRow } = await supabase
        .from('clubs')
        .select('id')
        .ilike('name', `%${payload.course_name}%`)
        .limit(1)
        .single();
      if (clubRow) resolvedClubId = clubRow.id;
      logger.info('confirm_booking club_id resolved from course_name', { course_name: payload.course_name, resolved: resolvedClubId });
    }

    let slotId = payload.slot_id;
    if (resolvedClubId && rawDate && rawTime) {
      // Fresh lookup by (club_id, date, time) — authoritative, avoids stale/hallucinated slot_id
      const { data: foundSlot, error: lookupErr } = await supabase
        .from('tee_slots')
        .select('id, available')
        .eq('club_id', resolvedClubId)
        .eq('date', rawDate)
        .eq('time', rawTime)
        .maybeSingle();
      logger.info('confirm_booking slot lookup', {
        club_id: resolvedClubId, date: rawDate, time: rawTime,
        payload_slot_id: payload.slot_id,
        found: foundSlot?.id ?? null,
        available: foundSlot?.available ?? null,
        lookupErr: lookupErr?.message ?? null,
      });
      if (foundSlot) slotId = foundSlot.id;
    }

    if (!slotId) {
      return {
        finalText: 'Maaf, slot tidak ditemukan. Slot mungkin sudah tidak tersedia — silakan pilih jam lain.',
        confirmButtons: false,
        bookingPayload: null,
        snapToken: null,
        orderId: null,
        invoiceUrl: null,
        messages: workingHistory,
        state: currentState,
        sessionId: activeSessionId,
      };
    }

    const result = await handlers.CreateBookingTool({
      user_id: userId,
      slot_id: slotId,
      players: payload.players || 1,
      cart: payload.cart || false,
      caddie: payload.caddie || false,
      voucher_code: payload.voucher_code || null,
    });

    if (!result.success) {
      return {
        finalText: `Maaf, booking gagal: ${result.error}. Mau coba lagi?`,
        confirmButtons: false,
        bookingPayload: null,
        snapToken: null,
        orderId: null,
        invoiceUrl: null,
        messages: workingHistory,
        state: currentState,
        sessionId: activeSessionId,
      };
    }

    const bookingPayload = {
      booking_id: result.booking_id,
      course_name: payload.course_name,
      date: payload.date,
      time: payload.time,
      players: payload.players || 1,
      amount: result.amount || payload.amount,
    };

    const confirmText = `Booking berhasil dibuat! Lanjutkan ke pembayaran ya, Kak.`;
    if (activeSessionId) {
      persistMessage(activeSessionId, 'user', '✅ Konfirmasi').catch(() => {});
      persistMessage(activeSessionId, 'assistant', confirmText).catch(() => {});
    }

    return {
      finalText: confirmText,
      confirmButtons: false,
      bookingPayload,
      snapToken: null,
      orderId: null,
      invoiceUrl: null,
      messages: workingHistory,
      state: 'BOOKED',
      sessionId: activeSessionId,
    };
  }
  // ────────────────────────────────────────────────────────────────────────────

  const messages = [...workingHistory, { role: 'user', content: userText }];

  // Persist user message non-blocking
  if (activeSessionId) {
    persistMessage(activeSessionId, 'user', userText).catch(() => {});
  }

  let nextState = currentState;
  let pendingConfirm = false;
  let pendingBookingPayload = null;
  let pendingSnapToken = null;
  let pendingOrderId = null;
  let pendingInvoiceUrl = null;

  const today = todayWIB();
  const nowTime = nowTimeWIB();
  const systemPrompt = `${SYSTEM_PROMPT}\n\n---\n\nToday: ${today}, current time: ${nowTime} WIB.`;

  const mustUseTool = currentState === 'CHECK_AVAILABILITY';

  for (let i = 0; i < 16; i++) {
    const response = await anthropic.messages.create({
      model: config.anthropic.model,
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      tool_choice: mustUseTool && i === 0 ? { type: 'any' } : undefined,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    const toolUses = response.content.filter((b) => b.type === 'tool_use');

    if (toolUses.length === 0) {
      const finalText = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n');

      if (activeSessionId) {
        persistMessage(activeSessionId, 'assistant', finalText).catch(() => {});
      }

      return {
        finalText,
        confirmButtons: false,
        bookingPayload: null,
        messages,
        state: nextState,
        sessionId: activeSessionId,
      };
    }

    const toolResults = [];
    let messageSentDirectly = false;
    let sentText = '';

    for (const toolUse of toolUses) {
      // 9router appends "_ide" (or "_ide_ide") suffixes to tool names — strip them
      const canonicalName = toolUse.name.replace(/(_ide)+$/, '');
      const handler = handlers[canonicalName];
      let resultContent;
      try {
        const result = handler ? await handler(toolUse.input) : { error: 'Unknown tool' };
        resultContent = JSON.stringify(result);

        if (STATE_BY_TOOL[canonicalName]) nextState = STATE_BY_TOOL[canonicalName];

        if (canonicalName === 'SendInAppMessageTool') {
          messageSentDirectly = true;
          sentText = result.text ?? '';
          pendingConfirm = result.with_confirm_buttons ?? false;
          pendingBookingPayload = result.booking_payload ?? null;
          pendingSnapToken = result.snap_token ?? null;
          pendingOrderId = result.order_id ?? null;
          pendingInvoiceUrl = result.invoice_url ?? null;
        }
      } catch (err) {
        logger.error(`Tool ${toolUse.name} failed`, { message: err.message });
        resultContent = JSON.stringify({ error: err.message });
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: resultContent,
      });
    }

    messages.push({ role: 'user', content: toolResults });

    if (messageSentDirectly) {
      if (activeSessionId) {
        persistMessage(activeSessionId, 'assistant', sentText).catch(() => {});
      }
      return {
        finalText: sentText,
        confirmButtons: pendingConfirm,
        bookingPayload: pendingBookingPayload,
        snapToken: pendingSnapToken,
        orderId: pendingOrderId,
        invoiceUrl: pendingInvoiceUrl,
        messages,
        state: nextState,
        sessionId: activeSessionId,
      };
    }
  }

  logger.error('Tool-calling loop exhausted', { userId, currentState });
  return {
    finalText: 'Maaf, ada kendala teknis. Coba lagi ya.',
    confirmButtons: false,
    bookingPayload: null,
    snapToken: null,
    orderId: null,
    invoiceUrl: null,
    messages,
    state: nextState,
    sessionId: activeSessionId,
  };
}

module.exports = { runConversationTurn, TOOLS, getOrCreateSession, loadHistory };
