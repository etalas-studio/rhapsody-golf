# RBAC & Use Cases — Rhapsody Golf Connect

**Roles:** `golfer` · `club_admin` · `superadmin`

Data isolation is enforced at two layers:
- **App layer** — role-based routing, UI gating, API guards
- **DB layer** — Supabase Row-Level Security (RLS) policies

---

## 1. Golfer

**Scope:** own data only (`user_id = currentUser.id`), visible across all clubs in the network.

### Read
| Use Case | Endpoint |
|---|---|
| Browse golf courses (public, no login) | `GET /api/clubs` |
| View course detail & tee slots | `GET /api/clubs/:id` · `GET /api/clubs/:id/tee-slots` |
| View own booking history | `GET /api/bookings` |
| View own booking detail | `GET /api/bookings/:id` |
| View own loyalty balances per club | `GET /api/loyalty` |
| View own loyalty transaction history | `GET /api/loyalty/history` |
| View own vouchers | `GET /api/vouchers` |
| View tournament list | `GET /api/tournaments` |
| View tournament detail & leaderboard | `GET /api/tournaments/:id` · `GET /api/tournaments/:id/leaderboard` |
| View own tournament registrations | `GET /api/tournaments/my/registrations` |
| View own scorecards & handicap | `GET /api/scorecards` |
| View own profile | `GET /api/auth/me` |

### Write
| Use Case | Endpoint | Notes |
|---|---|---|
| Sign up / sign in | Supabase Auth | `POST /auth/v1/token` |
| Create booking | `POST /api/bookings` | Auth required |
| Cancel booking | `PATCH /api/bookings/:id/status` | Own bookings only |
| Register for tournament | `POST /api/tournaments/:id/register` | Auth required |
| Cancel tournament registration | `DELETE /api/tournaments/:id/register` | Own registration only |
| Submit tournament score | `POST /api/tournaments/:id/score` | Auth required |
| Save scorecard (new round) | `POST /api/scorecards` | Auth required |

### Not Allowed
- Read or modify another user's data
- Access `/club/*` or `/admin/*` routes
- Issue or delete vouchers
- Modify loyalty rules
- Access audit logs

---

## 2. Club Admin

**Scope:** all data filtered by `club_id = selectedClubId`. Cannot read or write data from other clubs.

### Read
| Use Case | Endpoint |
|---|---|
| View today's tee sheet | `GET /api/admin/teesheet?clubId=&date=` |
| View club member list | `GET /api/admin/members?clubId=` |
| View member 360 profile (club-scoped) | `GET /api/admin/members/:memberId?clubId=` |
| View promotions / campaigns | `GET /api/admin/campaigns?clubId=` |
| View club revenue & analytics | `GET /api/admin/analytics?clubId=` |
| View club audit log | `GET /api/admin/audit?clubId=` |
| View loyalty rules | `GET /api/admin/loyalty-rules/:clubId` |

### Write
| Use Case | Endpoint | Notes |
|---|---|---|
| Check in a booking | `PATCH /api/admin/bookings/:id/checkin` | Club-scoped only |
| Create campaign | `POST /api/admin/campaigns` | Club-scoped |
| Update campaign | `PATCH /api/admin/campaigns/:id` | Own club's campaigns |
| Issue voucher to member | `POST /api/admin/vouchers` | Club-scoped |
| Update loyalty earn rules | `PUT /api/admin/loyalty-rules/:clubId` | Own club only |

### Not Allowed
- Access another club's data (RLS enforces this at DB level)
- Access `/admin/*` superadmin routes
- Create or delete clubs
- Access cross-club member view
- Read or modify audit logs of other clubs

---

## 3. Superadmin

**Scope:** full network access — all clubs, all users, all data.

### Read
| Use Case | Endpoint |
|---|---|
| Network-wide analytics | `GET /api/superadmin/analytics` |
| All clubs with member counts | `GET /api/superadmin/clubs` |
| Network member list (cross-club) | `GET /api/superadmin/members` |
| Member 360 (cross-club view) | `GET /api/superadmin/members/:userId` |
| Full network audit log | `GET /api/superadmin/audit` |
| Integration health status | `GET /api/superadmin/health` |

### Write
| Use Case | Notes |
|---|---|
| Manage club settings & feature toggles | Via app management panel (`/admin/apps`) |
| Create / deactivate clubs | Planned — not yet implemented |
| Create superadmin users | Via Supabase Auth directly |

### Not Allowed
- Bypassing RLS via frontend (all data access goes through backend with `SERVICE_ROLE_KEY` — never exposed to browser)
- Modifying `auth.users` directly via API (Supabase Auth manages this)

---

## 4. Cross-Role Flows

Berikut alur kerja yang melibatkan interaksi antar role — artinya aksi satu role menghasilkan data yang dikonsumsi role lain.

---

### Flow A: Booking Tee Time

```
Golfer                          Club Admin               Superadmin
  │                                  │                       │
  ├─ Browse courses (public)         │                       │
  ├─ Pilih tanggal & slot            │                       │
  ├─ Konfirmasi booking ─────────────► Muncul di Tee Sheet   │
  │   POST /api/bookings             │   /club/teesheet       │
  │                                  │                       │
  │                              Club Admin                  │
  │                              check-in golfer ────────────► Tercatat di
  │                              PATCH .../checkin           │  Audit Log
  │                                  │                       │
  │   Status → Completed ────────────► Booking count naik    ► Analytics
  │   (setelah selesai main)         │  di dashboard club     network-wide
  │                                  │                       │
  │   Loyalty points earned          │                       │
  │   (sistem append ke ledger)      │                       │
```

---

### Flow B: Voucher — Dari Club Admin ke Golfer

```
Club Admin                       Golfer
  │                                 │
  ├─ Issue voucher ke member        │
  │   POST /api/admin/vouchers      │
  │                                 │
  │                             Golfer lihat voucher
  │                             GET /api/vouchers
  │                                 │
  │                             Pakai saat booking
  │                             (diskon applied di checkout)
  │                                 │
  │   Status → Redeemed ◄───────────┤
  │   (voucher tidak bisa dipakai lagi)
  │                                 │
  ├─ Lihat redemption stats         │
  │   GET /api/admin/analytics      │
```

---

### Flow C: Loyalty Points

```
Golfer                          Club Admin               Superadmin
  │                                  │                       │
  ├─ Booking selesai (Completed)     │                       │
  │                                  │                       │
  │   Sistem earn points             │                       │
  │   (append ke loyalty_ledger)     │                       │
  │                                  │                       │
  │   Golfer lihat balance ──────────► Club Admin lihat      ► Superadmin lihat
  │   GET /api/loyalty               │  total pts issued      total pts
  │                                  │  di analytics          network-wide
  │                                  │                       │
  ├─ Redeem points ──────────────────► Tercatat sebagai       │
  │   (negative entry di ledger)     │  Redeem di ledger      │
  │                                  │                       │
  │   Ledger append-only:            │                       │
  │   tidak ada delete,              │                       │
  │   hanya Earn / Redeem / Adjust   │                       │
```

---

### Flow D: Tournament

```
Superadmin / Club Admin          Golfer                   Public
  │                                 │                       │
  ├─ Tournament dibuat              │                       │
  │   (via DB / backend langsung)   │                       │
  │                                 │                       │
  │                             Browse & register ──────────► Live leaderboard
  │                             POST .../register           │  /tournaments/:id/live
  │                                 │                       │  (public, no login)
  │                             Submit skor                 │
  │                             POST .../score              │
  │                                 │                       │
  ├─ Lihat peserta &                │                       │
  │  leaderboard real-time          │                       │
  │                                 │                       │
  ├─ Verify skor marker             │                       │
  │  (allVerified flag)             │                       │
```

---

### Flow E: Member 360 — Data Golfer Visible ke Admin

```
Golfer (aktivitas)               Club Admin               Superadmin
  │                                  │                       │
  ├─ Booking di club A               │                       │
  ├─ Redeem voucher club A           │                       │
  ├─ Earn loyalty di club A          │                       │
  │                                  │                       │
  │                              Club Admin                  │
  │                              lihat member detail         │
  │                              GET /admin/members/:id      │
  │                              → bookings club A saja      │
  │                              → loyalty club A saja       │
  │                              → vouchers club A saja      │
  │                              (RLS: club-scoped)          │
  │                                  │                       │
  ├─ Booking di club B               │                   Superadmin
  ├─ Earn loyalty di club B          │                   lihat member 360
  │                                  │                   GET /superadmin/members/:id
  │                                  │                   → semua club
  │                                  │                   → semua bookings
  │                                  │                   → cross-club spending
  │                                  │                   (full network view)
```

---

### Flow F: Audit Trail

```
Siapapun (golfer / club_admin)       Superadmin
  │                                      │
  ├─ Setiap aksi privileged              │
  │  (checkin, issue voucher,            │
  │   update loyalty rules, dll)         │
  │  → append ke audit_logs             ─► GET /api/superadmin/audit
  │                                      │  Lihat: actor, role, action,
  │                                      │  club, IP, timestamp
  │                                      │
  │  Audit log immutable:                │
  │  tidak ada update/delete             │
```

---

### Ringkasan Interaksi Antar Role

| Aksi oleh | Menghasilkan data untuk |
|---|---|
| Golfer booking | Club Admin (tee sheet), Superadmin (analytics) |
| Golfer selesai main | Loyalty earn (ledger), Club Admin (visit count) |
| Club Admin issue voucher | Golfer (voucher tersedia di wallet) |
| Club Admin set loyalty rules | Golfer (earn rate berubah saat booking) |
| Club Admin checkin booking | Superadmin (audit log), sistem (status update) |
| Golfer submit skor tournament | Public (leaderboard), Club Admin (verify) |
| Semua aksi privileged | Superadmin (audit trail) |

---

## 5. CRUD Summary

| Entity | C | R | U | D | Who |
|---|---|---|---|---|---|
| User profile | ✓ (signup) | ✓ | — | — | golfer (own) |
| Booking | ✓ | ✓ | ✓ (status) | — | golfer (own), club_admin (checkin) |
| Scorecard | ✓ | ✓ | — | — | golfer (own) |
| Tournament registration | ✓ | ✓ | — | ✓ (cancel) | golfer (own) |
| Tournament score | ✓ | ✓ | — | — | golfer (own) |
| Voucher | ✓ (issue) | ✓ | — | — | club_admin |
| Campaign | ✓ | ✓ | ✓ | — | club_admin |
| Loyalty rules | — | ✓ | ✓ | — | club_admin |
| Loyalty ledger | append-only | ✓ | — | — | system (never manual delete) |
| Club settings | — | ✓ | ✓ | — | superadmin |
| Audit log | append-only | ✓ | — | — | system (immutable) |

**Delete is intentionally absent from most entities:**
- Loyalty ledger is append-only by design (financial audit trail)
- Audit log is immutable
- Bookings are cancelled (status change), never deleted
- Vouchers expire, not deleted

---

## 5. Auth Wall Rules

| Action | Auth required |
|---|---|
| Browse courses, view tournaments, view leaderboard | No (public) |
| Book a tee time | Yes — hard signup wall at confirm step |
| Register for tournament | Yes — hard signup wall |
| Redeem voucher | Yes — hard signup wall |
| Save scorecard | Yes |
| View own bookings / loyalty / wallet | Yes |
| **Soft nudge** | After 2 course page views as guest |

---

## 6. Data Isolation Enforcement

```
golfer      → can only query rows where user_id = auth.uid()
club_admin  → can only query rows where club_id = their assigned club_id
superadmin  → no row-level restriction (uses service role via backend)
```

RLS policies are defined in `supabase/migrations/002_rls_policies.sql`.  
All backend routes additionally enforce role checks via `requireAuth` middleware.  
`SUPABASE_SERVICE_ROLE_KEY` is **never** sent to the browser — only used in `backend/`.
