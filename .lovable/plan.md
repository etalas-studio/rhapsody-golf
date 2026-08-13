# v1 UI Build Plan — Golfer Journey End-to-End (Prototype on mockData)

Backend stays mocked. Every screen reads from `src/lib/mockData.ts`. Cloud gets wired in a later phase after UX is signed off.

## Scope: the complete golfer journey

The build walks the app the way a real user does, in order. Every step gets shipped as a working, clickable flow before we move to the next.

## Sequence

### Phase 1 — Entry & Signup (hard wall at checkout)
- Polish `/login` into a real-looking signup + login screen (email/password + Google/Apple buttons, all mock).
- Add `guest mode`: golfer can browse `/golfer/courses`, view detail pages, see tournaments, see prices — but the "Book" / "Register" / "Redeem" CTA opens a signup sheet.
- Soft nudges after 2nd course view ("Save this course? Sign up in 10 seconds").
- Hard wall: at `/golfer/book/$courseId` confirm step, and at tournament register.
- New route: `/signup` (or modal-based).

### Phase 2 — Wallet split (GHV / GHP visible)
- Refactor `/golfer/wallet` to show two balances side-by-side: **GHV (Value, IDR)** and **GHP (Points)**.
- Add top-up mock flow: pick amount → pick method (bank transfer / QRIS / e-wallet) → success screen. GHV balance goes up (mockData mutation via app context).
- Transaction history filtered by source (GHV in/out vs GHP earn/redeem).

### Phase 3 — Checkout stack order
Rewire `/golfer/book/$courseId` to enforce the locked waterfall:
1. **Rate selection** — Public / Member / Card (auto-preselect cheapest eligible).
2. **Vouchers** — dropdown of applicable vouchers for the rate scope.
3. **GHV apply** — slider or full-balance toggle, up to remaining amount.
4. **GHP apply** — capped (default 20%), fixed conversion display.
5. **Remaining** → payment gateway (mock QR + tokenised card).
6. Confirm → lifecycle indicator (DRAFT → HELD → CONFIRMED) with 60s hold countdown before final confirm.

### Phase 4 — Booking lifecycle states
- Booking confirmation page shows current state chip (CONFIRMED → CHECKED_IN → PLAYED → SETTLED).
- Add cancellation modal with refund preview (>72h / 24-72h / <24h windows), source-preserving refund routing displayed.
- One free reschedule button (>48h out only) with rate-tier preservation notice.

### Phase 5 — Tournament browse & register
- Extend `/golfer/tournaments` filters: format (Stroke / Stableford / System 36 / Match / Team), club, date, fee.
- Detail page shows: format, handicap basis, flights (with organizer-defined names), tie-break rule, prize slots, entry cap + waitlist state.
- Individual register vs team register (captain picks members by Rhapsody ID). Payment goes through checkout stack from Phase 3.
- Registration success → tournament pass with QR + tee time assignment.

### Phase 6 — Live tournament scoring
New route: `/golfer/tournaments/$tournamentId/score`.
- Hole-by-hole entry (par + strokes + net calculation for gross/net/Stableford/System 36).
- Marker sign-off panel: playing partner taps "I verify this hole" — provisional until signed, awaiting-verify after.
- Offline resilience UI: pending-sync indicator when writes queue locally (visual only in prototype).
- Format-aware scorecard: System 36 shows running points, Stableford shows point totals, Match play shows hole win/loss.

### Phase 7 — Live public leaderboard
New route: `/tournaments/$tournamentId/live` (PUBLIC, no auth required).
- Auto-refreshing leaderboard (simulated in prototype with interval).
- Filter by flight, gross/net toggle, format-appropriate columns.
- Shareable URL, meta tags for social sharing (tournament name, live status).
- Provisional vs verified score indicator per player.

## Cross-cutting: what carries through every phase
- **Channel tag** (GH_APP) on every booking created in the flow so club-admin tee sheet can display it later.
- **Rate lock** — once booking hits CONFIRMED, the price on the row never changes.
- **Signup wall** — every mutation (book, register, redeem voucher, apply GHV) checks auth guard; guest triggers signup modal.
- Design system stays as-is; no visual refactor.

## Out of scope for this pass
- Club admin new screens (tee sheet realtime, rate authoring UI, tournament creation) — separate build plan after golfer journey lands.
- Club-branded shell / embed widget.
- Cloud backend, real auth, real payments, RLS.
- Benchmark UI.

## Approach
Ship Phase 1, review, then Phase 2, and so on. Each phase is 1–3 turns of build work. Every phase ends with the flow clickable end-to-end on mockData.

## Kickoff
Start Phase 1 (Entry & Signup) as soon as this plan is approved.
