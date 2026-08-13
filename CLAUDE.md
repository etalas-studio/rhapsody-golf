# CLAUDE.md — Rhapsody Golf Connect

Rules for every coding session in this repo. Read in full before making any change.

---

## 1. Source of truth

Four documents govern all decisions. Resolve conflicts in this priority order:

1. **`INTEGRATION_PLAN.md`** — backend schema, Supabase setup, AI agent service, phase breakdown
2. **`PRD.md`** — features per role, data model, URL structure, what is in/out of scope
3. **`.lovable/plan.md`** — frontend UI build sequence (Phases 1–7, all on mockData until cloud wiring)
4. **`CLAUDE.md`** (this file) — coding rules and constraints

Never add a feature, route, field, or UI element that contradicts these documents. If a request is absent from all four, ask before building.

---

## 2. UI — never change the design system

The visual layer is **locked**. Do not alter:

- `src/styles.css` — CSS variables, color tokens, typography tokens, utility classes
- `src/components/ui/` — all shadcn/Radix components
- `src/components/ui-bits.tsx` — `KpiCard`, `PageHeader`, `StatusDot`
- `src/components/AppShell.tsx` — sidebar, top bar, bottom tabs, nav structure
- Fonts: `Fraunces` (display/headings), `Inter` (body)
- Color palette: Rhapsody purple primary (`--primary`), gold accent (`--gold`), OKLCH tokens
- Class patterns already in use: `shadow-elegant`, `shadow-glow`, `ring-gold`, `bg-gradient-hero`, `bg-gradient-card`, `font-display`
- Responsive grid patterns: 1-col mobile → 2-col tablet → 3-col desktop

**Allowed:** adding new pages or components that use the existing tokens and components.  
**Forbidden:** new color values, new font families, new shadow utilities, restructuring AppShell, replacing Radix primitives with other libraries.

If a new component is needed, compose it from `src/components/ui/` primitives + existing Tailwind tokens only.

---

## 3. Data — mockData first, then replace

Until backend integration phases are complete, all data comes from `src/lib/mockData.ts`. The source of truth for what data exists and what shapes it has is that file.

Rules:
- **Never add new entities** to `mockData.ts` that are not in `PRD.md` Section 8 (Data Model).
- **Never mutate** the exported arrays at runtime outside of `appContext.tsx`. Context state is the only mutable layer.
- When replacing a mock with a real API call (per `INTEGRATION_PLAN.md`), delete the mock import from that file — don't leave both.
- New fields added to existing mock types must also be reflected in the Prisma schema in `INTEGRATION_PLAN.md`.

---

## 4. Auth rules

Auth behaviour is defined by `appContext.tsx`:
- `user === null` → guest; any mutation must call `requireAuth(...)` before proceeding.
- Hard signup wall triggers: booking confirm step, tournament registration, voucher redemption.
- Soft nudge: after `courseViewCount >= 2` and `!nudgeDismissed`.
- Never bypass `requireAuth` on a mutation. Never make a mutation available to guests.

When integrating Supabase Auth (Phase 1 of `INTEGRATION_PLAN.md`), replace `signIn`/`signUp`/`signOut` in `AppProvider` with `supabase.auth` calls — keep the same interface so call sites don't change.

---

## 5. Roles & data scoping

Three roles: `golfer`, `club_admin`, `superadmin`.

| Role | Can see |
|------|---------|
| `golfer` | Own data only (`user_id = currentUser.id`) |
| `club_admin` | Data scoped to `selectedClubId` only — never another club's data |
| `superadmin` | All clubs, all users |

When writing any data-fetching code (mock or real), enforce this scoping. A club_admin function must always filter by `club_id`. Never write a query that returns cross-club data to a `club_admin`.

---

## 6. Route conventions & URL structure

Five URL namespaces:

| URL prefix | Audience | Layout |
|------------|----------|--------|
| `/` | Public | Landing page |
| `/login` | **all roles** (golfer, club_admin, superadmin) | Desktop-first; redirects by role after login |
| `/app/login` | golfer / member only | Mobile-first login |
| `/golfer/*` | member / golfer | **Web dashboard** — desktop sidebar |
| `/app/*` | member / golfer | **Mobile app** — bottom tab bar, no sidebar |
| `/club/*` | club_admin | Desktop dashboard |
| `/admin/*` | superadmin | Desktop dashboard |
| `/docs` | all | Documentation |
| `/tournaments/:id/live` | public | Live leaderboard (Phase 7) |

### Login redirect logic (implement in `/login` route)

```
on successful auth:
  if role === "golfer"     → redirect to /golfer
  if role === "club_admin" → redirect to /club
  if role === "superadmin" → redirect to /admin
```

`/app/login` always redirects to `/app` — no role check needed (golfer only).

### Key rule: `golfer/*` and `app/*` are two separate interfaces, not one

- `golfer/*` = web dashboard (existing, keep as-is, desktop-first, sidebar nav)
- `app/*` = mobile app (new, mobile-first, bottom tab bar, no sidebar)
- Both use the same Supabase Auth JWT and the same backend data
- **Do not merge them.** Different layouts, different nav, different component compositions.
- In-app AI chat (`/app/chat`) is mobile-only — never add to `golfer/*`.

### TanStack Router file naming

| File prefix | Route namespace |
|-------------|----------------|
| `golfer.*` | `/golfer/*` |
| `app.*` | `/app/*` (including `app.login.tsx`) |
| `club.*` | `/club/*` |
| `admin.*` | `/admin/*` |

After adding a route file, run `cd frontend && bun run dev` to update `frontend/src/routeTree.gen.ts`. Never hand-edit it.

---

## 7. Build phases — respect the sequence

### Frontend (follows `.lovable/plan.md` + routing refactor)

| Phase | Focus | Status |
|-------|-------|--------|
| 0 | Landing page `/` + role-redirect on `/login` + `app.login.tsx` + `app.*` mobile shell | **Next** |
| 1 | Entry & Signup (auth wall, guest mode) | Implemented on `golfer.*` |
| 2 | Wallet — GHV/GHP split + top-up | Pending |
| 3 | Checkout waterfall (rate → voucher → GHV → GHP → gateway) | Pending |
| 4 | Booking lifecycle states + cancellation | Pending |
| 5 | Tournament filters, team register, pass QR | Partial |
| 6 | Live tournament scoring route | Pending |
| 7 | Public live leaderboard | Pending |
| 8 | In-app chat/inbox (AI agent integration) | Pending |

### Backend (follows `INTEGRATION_PLAN.md`)

Phases 1–6: DB + auth → booking → loyalty → club admin → tournaments → superadmin.  
Phase 7: AI agent Node.js service (`backend/` folder).

Do not implement Phase N+1 features while Phase N is incomplete unless explicitly asked.

### Interface rules

**`golfer/*` — web dashboard (existing):**
- Desktop-first. Keep the existing sidebar + AppShell layout as-is.
- Do not redesign or restructure.

**`app/*` — mobile app (new):**
- All routes must render on **375px–430px viewport** (iPhone range).
- Bottom tab bar is the only navigation — no sidebar, no hamburger.
- Use `useIsMobile()` from `use-mobile.tsx` if conditional logic is needed.
- In-app AI chat (`/app/chat`) is mobile-only — never add to `golfer/*`.

**`/` and `/login`** — desktop-first layouts. `/app/login` — mobile-first.

---

## 8. Monorepo structure

Single repo, two packages + one root orchestrator. No workspace hoisting.

```
repo root/
  package.json        ← orchestrator only (concurrently dev scripts) — uses npm
  frontend/           ← Vite + TanStack Start + Cloudflare Workers
    package.json      ← uses Bun — do NOT npm install here
    bun.lock
    src/              ← all frontend source code
    vite.config.ts · wrangler.jsonc · tsconfig.json · components.json
  backend/            ← Node.js Express + AI agent
    package.json      ← uses npm — do NOT bun add here
    src/
  prisma/
    schema.prisma     ← shared, owned by both
  supabase/
    migrations/
```

Rules:
- Root: `npm install --save-dev <pkg>` for orchestration tools only (e.g. concurrently). Never add app dependencies here.
- Frontend: always `cd frontend && bun add <pkg>`. Never `npm install` inside `frontend/`.
- Backend: always `cd backend && npm install <pkg>`. Never `bun add` inside `backend/`.
- All frontend source is under `frontend/src/`. When editing routes, components, or styles, paths start with `frontend/src/`.
- Prisma schema changes affect both packages — migrate carefully and update both.
- Do not add a workspace manager (Turborepo, Nx, pnpm workspaces) unless explicitly approved.

Dev commands (from repo root):
```bash
npm run dev            # frontend + backend concurrently
npm run dev:frontend   # frontend only (port 8080)
npm run dev:backend    # backend only (port 3001)
npm run install:all    # first-time install both packages
```

## 9. Component rules

- Compose from `src/components/ui/` first. Only create a new component if nothing in that folder covers the use case.
- New shared components go in `src/components/`. Page-local components stay inline in the route file unless reused.
- Do not add new dependencies to `package.json` without explicit approval. All needed UI is already covered by Radix UI, Tailwind, Lucide, Recharts, shadcn primitives, and date-fns.
- Charts: use Recharts (`recharts` is installed). Do not reach for another charting library.
- Icons: use `lucide-react` only. No other icon library.
- Forms: `react-hook-form` + `zod` (both installed). No uncontrolled forms.

---

## 10. Booking & pricing rules

From PRD Section 5.4 and `.lovable/plan.md` Phase 3:

- Tee slot pricing: Early (06:00–10:30) = Rp 1,250,000 · Prime (11:00–13:30) = Rp 1,450,000 · Twilight (14:00–16:30) = Rp 1,100,000
- Member discount: **25%** applied automatically if `ClubMember.membershipStatus === "Paid Member"`
- Checkout waterfall order (Phase 3): Rate → Voucher → GHV → GHP → gateway. Never reorder this.
- Rate lock: once a booking reaches CONFIRMED, `amount` never changes.
- Channel tag `GH_APP` must be stored on every booking created through the app.

---

## 11. Loyalty rules

- Points are club-scoped. `club_id = "network"` is for Rhapsody-wide bonuses only.
- Earn triggers after booking `status` changes to `Completed`.
- Earn rate is governed by `LoyaltyRule` per club (configurable by club admin, defaults in `INTEGRATION_PLAN.md` schema).
- Redeem is a negative-points `LoyaltyEntry`. Never delete entries — the ledger is append-only.

---

## 12. Code style

- TypeScript strict mode. No `any` unless casting from an external API response with a comment explaining why.
- No unused imports.
- No `console.log` left in committed code.
- Formatting via Prettier (`cd frontend && bun run format`). Run before committing.
- Prefer early returns over deeply nested conditionals.
- All currency values are **integers in IDR (Rupiah)**. Format for display using `formatIDR()` from `mockData.ts` (or its future API equivalent). Never store floats for money.
- Dates: use ISO strings (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`) in data. Use `date-fns` for any display formatting.

---

## 13. In-app chat (AI agent)

Chat/inbox feature lives at `/app/chat` — a floating bubble UI inside the mobile view.

Architecture:
- **Frontend:** chat bubble component + conversation thread UI, calls `POST /api/chat/message`
- **Backend:** Node.js Express service in `backend/` folder — same pattern as resvai `ai.service.js`
- **AI:** Anthropic Claude with tool-calling loop (agentic, not single-shot)
- **Tools the agent uses:** `CheckAvailabilityTool`, `CreateBookingTool`, `GetLoyaltyPointsTool`, `CheckVoucherTool`, `GetCustomerProfileTool`, `ListGolfCoursesTool`, `SendInAppMessageTool` (replaces Telegram tool)

Rules:
- The agent **only** acts on data from its tools — never invents course names, slot times, or prices.
- `CreateBookingTool` must not be called before the user confirms the booking summary.
- The frontend must display a typing indicator while the agentic loop is running.
- Chat history is persisted in `chat_sessions` table (Supabase), not in-memory.
- Do not import AI service code into the Cloudflare Workers bundle — the agent runs on Node.js only.

## 14. What is out of scope — do not build

Taken directly from `PRD.md` Section 10 and `.lovable/plan.md`:

- Real payment gateway integration
- Real Supabase auth (until `INTEGRATION_PLAN.md` Phase 1 is explicitly started)
- Club admin: real-time tee sheet, rate authoring UI, tournament creation UI
- Club-branded embed widget / shell
- Benchmark UI
- Telegram bot integration (resvai pattern stays in resvai; Rhapsody uses in-app web chat)
- Native mobile app (iOS/Android) — mobile view is a responsive web app only
- Any route or feature not listed in `PRD.md` or this file

If asked to build something on this list, clarify whether the integration phase has started before proceeding.
