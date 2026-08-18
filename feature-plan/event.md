# Feature Plan: Event

## Overview

Club admin dapat membuat event golf (turnamen, clinic, charity, corporate, dll) yang bisa ditemukan dan didaftari oleh golfer melalui app. Satu registrasi bisa mencakup lebih dari satu pemain (group registration). Pembayaran registration fee menggunakan Midtrans — begitu pembayaran berhasil, peserta langsung terdaftar secara otomatis.

**Tabel yang dimiliki feature ini:** `events` + `event_registrations` + `event_participants`
**Tabel existing yang di-join:** `clubs`, `users`, `payment_transactions`

---

## Data Model

### Perubahan di `prisma/schema.prisma`

#### Enum baru

```prisma
enum EventStatus {
  Draft       // belum dipublish, hanya visible ke club admin
  Open        // buka pendaftaran
  Closed      // pendaftaran ditutup (manual atau deadline terlewat)
  Completed   // event selesai
  Cancelled
}

enum EventRegistrationStatus {
  PendingPayment  // sudah submit form, belum bayar
  Confirmed       // pembayaran berhasil → auto-confirmed
  Cancelled       // dibatalkan oleh admin atau user
  CheckedIn       // hadir di hari H (di-mark oleh admin)
}
```

#### Model `Event`

```prisma
model Event {
  id                   String      @id @default(cuid())
  clubId               String
  title                String
  description          String      // event information / rundown (rich text / markdown)
  heroImageUrl         String?
  venue                String      // nama venue / address
  mapsUrl              String?     // Google Maps URL
  date                 DateTime    // tanggal pelaksanaan
  startingTime         String      // e.g. "07:00" (shotgun start)
  registrationDeadline DateTime
  quota                Int         // max total peserta (bukan registrations)
  entryFee             Int         // IDR, 0 = gratis
  status               EventStatus @default(Draft)
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt

  club                 Club        @relation(fields: [clubId], references: [id])
  registrations        EventRegistration[]

  @@map("events")
}
```

#### Model `EventRegistration` (1 registrasi = 1 grup)

```prisma
model EventRegistration {
  id           String                  @id @default(cuid())
  eventId      String
  userId       String                  // golfer yang mendaftar (registrant)
  status       EventRegistrationStatus @default(PendingPayment)
  totalFee     Int                     // entryFee × jumlah peserta
  paymentTxId  String?                 @unique
  notes        String?
  createdAt    DateTime                @default(now())
  updatedAt    DateTime                @updatedAt

  event        Event                   @relation(fields: [eventId], references: [id])
  user         User                    @relation(fields: [userId], references: [id])
  paymentTx    PaymentTransaction?     @relation(fields: [paymentTxId], references: [id])
  participants EventParticipant[]

  @@map("event_registrations")
}
```

#### Model `EventParticipant` (individual players dalam satu registrasi)

```prisma
model EventParticipant {
  id             String            @id @default(cuid())
  registrationId String
  name           String            // input manual, tidak perlu akun
  phone          String?
  email          String?
  isRegistrant   Boolean           @default(false) // true = golfer yang mendaftar sendiri

  registration   EventRegistration @relation(fields: [registrationId], references: [id])

  @@map("event_participants")
}
```

---

## API Endpoints

### Club Admin

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/club/events` | Buat event baru (status: Draft) |
| `PUT` | `/api/club/events/:id` | Edit detail event |
| `PATCH` | `/api/club/events/:id/status` | Publish (Open), Close, Cancel |
| `GET` | `/api/club/events` | List semua event milik club |
| `GET` | `/api/club/events/:id` | Detail + daftar registrasi |
| `GET` | `/api/club/events/:id/registrations` | List peserta dengan status |
| `PATCH` | `/api/club/events/:id/registrations/:regId` | Update status (CheckedIn, Cancelled) |
| `DELETE` | `/api/club/events/:id` | Hapus event (hanya jika Draft atau Cancelled) |

### Golfer (App)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/events` | List event yang Open (semua club) |
| `GET` | `/api/events/:id` | Detail event |
| `POST` | `/api/events/:id/register` | Daftar + buat Midtrans payment |
| `GET` | `/api/events/:id/my-registration` | Status registrasi user yang login |
| `DELETE` | `/api/events/:id/my-registration` | Cancel registrasi (jika Confirmed dan sebelum deadline) |
| `GET` | `/api/user/event-registrations` | Riwayat semua registrasi user |

---

## Registration & Payment Flow

### Golfer mendaftar

```
1. Golfer buka detail event → klik "Register"
2. Auth wall jika belum login
3. Cek: quota tersisa ≥ jumlah peserta yang akan didaftarkan
   → Jika tidak cukup: tampilkan error "Quota penuh"
4. Form: daftar pemain (nama + HP opsional + email opsional)
   - Pemain pertama auto-filled dari profil golfer (isRegistrant: true)
   - Bisa tambah player (+ Add Player)
5. Summary: jumlah pemain × entryFee = totalFee
   - Jika entryFee = 0: langsung Confirmed tanpa payment step
6. Jika berbayar: POST /api/events/:id/register
   → Backend buat EventRegistration (PendingPayment) + participants
   → Backend init Midtrans Snap token
   → Frontend buka Midtrans Snap popup
7. Midtrans webhook → backend update status ke Confirmed
8. Golfer redirect ke halaman sukses / "My Events"
```

### Quota check logic

```
slotsUsed      = SUM(participants.count) dari registrasi status = Confirmed atau CheckedIn
slotsAvailable = event.quota - slotsUsed
```

Quota check dilakukan saat `POST /register` dengan row-level lock untuk mencegah race condition.

---

## Frontend Pages

### App (Mobile — `/app/events/*`)

#### `/app/events` — Event Browser
- List card: hero image, title, club name, date, entryFee (atau "Free"), sisa quota
- Filter: All / Free / This Week / By Club
- Tab "My Events": upcoming + past registrasi user

#### `/app/events/:id` — Event Detail
- Hero image full-width
- Title, club name (dengan logo), venue + Maps link
- Date, starting time, registration deadline
- Entry fee + quota (sudah terdaftar / total)
- Deskripsi / rundown (markdown render)
- CTA: "Register" / "Registered ✓" / "Quota Penuh" / "Pendaftaran Ditutup"

#### `/app/events/:id/register` — Form Registrasi
- List player (pemain pertama = diri sendiri, auto-filled)
- Tambah player: nama (required), HP (optional), email (optional)
- Summary: N players × Rp X = Rp Y
- Tombol "Proceed to Payment" → Midtrans Snap
- Jika gratis: tombol "Confirm Registration"

#### `/app/events/:id/my-registration` — Konfirmasi & Status
- Status badge (Confirmed / Pending Payment / Cancelled)
- Daftar pemain yang terdaftar
- Opsi cancel (jika sebelum deadline)

### Club Admin (Desktop — `/club/events/*`)

#### `/club/events` — Event List
- Tabel: title, date, status, quota, jumlah terdaftar, action
- CTA: "Create Event"

#### `/club/events/new` + `/club/events/:id/edit` — Form
- Fields: title, description (textarea/markdown), hero image upload, venue, Maps URL, date, starting time, registration deadline, quota, entry fee
- Status toggle: Draft → Publish (Open) / Close / Cancel

#### `/club/events/:id/participants` — Manage Peserta
- Tabel: nama peserta, registrant, tanggal daftar, status, total fee, action
- Filter: All / Confirmed / Pending / Cancelled / Checked-In
- Action per row: Check-In, Cancel
- Export CSV (nama peserta + kontak)

---

## Business Rules

1. **Quota** dihitung dari total `EventParticipant` (bukan jumlah registrasi). Grup 3 orang mengambil 3 slot.
2. **entryFee = 0** → skip Midtrans, langsung `Confirmed`.
3. **Deadline** lewat → backend scheduler set status event ke `Closed` otomatis.
4. **Cancel oleh golfer** hanya bisa sebelum `registrationDeadline`. Refund dilakukan manual oleh club (out of scope untuk v1).
5. **Draft** event tidak muncul di golfer view.
6. **Delete** event hanya bisa kalau status `Draft` atau `Cancelled` — tidak boleh hapus yang sudah ada registrasi Confirmed.
7. Club admin hanya bisa melihat event `clubId = selectedClubId` (club-scoped, sesuai aturan RBAC).

---

## Development Steps

> **Konteks existing codebase:**
> - Tabel `tournaments` + `tournament_registrations` sudah ada di Prisma schema — perlu di-extend, bukan dibuat ulang
> - Route backend `/api/tournaments` sudah ada di `backend/src/routes/tournaments.js` (GET list, GET detail, POST register, DELETE cancel)
> - Frontend `/app/tournaments/*` sudah ada tapi belum support group registration dan hero image
> - **Belum ada sama sekali:** club admin event management, `event_participants` table, Midtrans untuk registration

---

### Step 1 — Migrasi Database

**File:** `supabase/migrations/023_events.sql`
**Prisma:** update `prisma/schema.prisma`

Yang perlu dilakukan:

1. Rename tabel `tournaments` → `events` dan `tournament_registrations` → `event_registrations`
2. Tambah kolom baru ke `events`:
   - `hero_image_url TEXT`
   - `venue TEXT` (address)
   - `maps_url TEXT`
   - `starting_time TEXT` (rename dari `shotgun_time` yang sudah ada)
   - `status` enum perlu tambah value `Draft` dan `Cancelled`
3. Tambah kolom baru ke `event_registrations`:
   - `total_fee INT` (entryFee × jumlah peserta)
   - `payment_tx_id TEXT UNIQUE`
   - `notes TEXT`
4. Buat tabel baru `event_participants`:
   ```sql
   CREATE TABLE event_participants (
     id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
     registration_id TEXT NOT NULL REFERENCES event_registrations(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     phone TEXT,
     email TEXT,
     is_registrant BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
5. Tambah RLS policies untuk `events` dan `event_participants`
6. Update Prisma schema untuk semua perubahan di atas
7. Run `npx prisma generate` setelah schema update

---

### Step 2 — Backend: Club Admin Event Management

**File baru:** `backend/src/routes/admin.events.js`
**Daftar ke:** `backend/src/app.js`

Endpoints yang dibangun:

```
POST   /api/club/events                            → create event (status: Draft)
GET    /api/club/events                            → list events milik club (dengan filter status)
GET    /api/club/events/:id                        → detail event
PUT    /api/club/events/:id                        → edit event
PATCH  /api/club/events/:id/status                 → publish/close/cancel
DELETE /api/club/events/:id                        → hapus (hanya jika Draft/Cancelled)
GET    /api/club/events/:id/registrations          → list peserta (join event_participants)
PATCH  /api/club/events/:id/registrations/:regId   → check-in atau cancel peserta
```

Catatan implementasi:
- Semua endpoint wajib middleware `requireAuth` + `requireRole('club_admin')`
- Filter `clubId = req.clubId` (dari JWT) di setiap query — jangan expose event club lain
- Upload hero image: terima `multipart/form-data`, upload ke Supabase Storage bucket `club-images`, simpan URL ke `hero_image_url`
- Export CSV untuk `/registrations`: stream response dengan header `Content-Disposition: attachment; filename=...`

---

### Step 3 — Backend: Update Golfer Registration Flow

**File existing:** `backend/src/routes/tournaments.js` → rename jadi `events.js`

Perubahan pada route yang sudah ada:

**`GET /api/events`** — tambah filter:
- `?status=Open` default
- Exclude status `Draft`

**`GET /api/events/:id`** — tambah field baru:
- Return `heroImageUrl`, `venue`, `mapsUrl`, `startingTime`
- Return `slotsUsed` (count dari event_participants yang Confirmed/CheckedIn)

**`POST /api/events/:id/register`** — revamp total:
```
Body: {
  players: [{ name, phone?, email? }]  // min 1 (diri sendiri)
}

Logic:
1. Hitung slotsNeeded = players.length
2. Cek quota: slotsAvailable >= slotsNeeded (gunakan SELECT FOR UPDATE untuk race condition)
3. Hitung totalFee = event.entryFee × slotsNeeded
4. Buat EventRegistration (status: PendingPayment jika berbayar, Confirmed jika gratis)
5. Buat EventParticipant rows untuk setiap player
6. Jika totalFee > 0:
   → Init Midtrans Snap token
   → Return { snapToken, registrationId }
7. Jika totalFee = 0:
   → Langsung return { status: 'Confirmed', registrationId }
```

**`GET /api/events/:id/my-registration`** — endpoint baru:
- Return registration + daftar participants milik user yang login

---

### Step 4 — Backend: Midtrans Webhook untuk Event Registration

**File existing:** `backend/src/routes/payments.js`

Tambah handler untuk order type `event_registration`:

```
POST /api/payments/midtrans-webhook

Existing handler cek order_id prefix:
- "BKG-..." → booking handler (sudah ada)
- "EVT-..." → event registration handler (baru)

EVT handler:
1. Verifikasi signature Midtrans
2. Parse registrationId dari order_id
3. Update event_registrations.status = 'Confirmed'
4. Update event_registrations.payment_tx_id
```

Konvensi `order_id`: `EVT-{registrationId}-{timestamp}`

---

### Step 5 — Backend: Scheduler Auto-Close Event

**File existing:** `backend/src/services/scheduler.service.js`

Tambah job baru (jalankan setiap jam, sudah ada pattern dari booking auto-expire):

```js
// Auto-close events past registration deadline
async function autoCloseEvents() {
  await supabase
    .from('events')
    .update({ status: 'Closed' })
    .eq('status', 'Open')
    .lt('registration_deadline', new Date().toISOString());
}
```

---

### Step 6 — Frontend: Update App Tournament Pages → Event

**Files existing yang diupdate:**
- `frontend/src/routes/app.tournaments.index.tsx`
- `frontend/src/routes/app.tournaments.$tournamentId.tsx`

Perubahan di `app.tournaments.index.tsx`:
- Update label "Tournaments" → "Events"
- Tambah hero image thumbnail di card
- Tambah filter tabs: All / Free / This Week
- Update `useMyTournamentRegistrations` → `useMyEventRegistrations`

Perubahan di `app.tournaments.$tournamentId.tsx`:
- Tambah render hero image full-width di atas
- Tampilkan `venue` + link ke `mapsUrl`
- Tampilkan `startingTime` (shotgun start)
- Tampilkan quota: `{slotsUsed} / {quota}` terdaftar
- Update CTA logic:
  - `status === 'Draft'` → tidak ditampilkan (unreachable dari golfer)
  - `slotsAvailable === 0` → "Quota Penuh" (button disabled)
  - `past registrationDeadline` → "Pendaftaran Ditutup"
  - `userAlreadyRegistered` → "Registered ✓" + link ke my-registration
  - else → "Register"

---

### Step 7 — Frontend: Form Registrasi Multi-Player

**File baru:** `frontend/src/routes/app.tournaments.$tournamentId.register.tsx`

Flow UI:

```
1. Halaman load → tampilkan form
2. Player section:
   - Player 1: auto-filled (nama dari profil user, tidak bisa dihapus)
   - "+ Add Player" button → tambah row baru (nama required, HP/email optional)
   - Max player: event.quota sisa (jangan bisa tambah lebih dari slotsAvailable)
3. Summary section:
   - {N} player(s) × {formatIDR(entryFee)} = {formatIDR(totalFee)}
   - Jika entryFee = 0: tampilkan "Free Event"
4. CTA:
   - Berbayar: "Proceed to Payment" → POST /api/events/:id/register → open Midtrans Snap
   - Gratis: "Confirm Registration" → POST /api/events/:id/register → redirect ke sukses
5. Setelah Midtrans selesai → redirect ke /app/tournaments/:id?registered=true
```

State management: `react-hook-form` + `zod` untuk validasi (nama tidak boleh kosong).

---

### Step 8 — Frontend: Club Admin Event Management

**File baru yang dibuat:**

```
frontend/src/routes/club.events.index.tsx          → list + create button
frontend/src/routes/club.events.new.tsx             → create form
frontend/src/routes/club.events.$eventId.edit.tsx   → edit form
frontend/src/routes/club.events.$eventId.participants.tsx → manage peserta
```

**`club.events.index.tsx`:**
- Tabel: title, tanggal, status badge, quota (terdaftar/total), action (Edit, Manage Peserta)
- Filter dropdown: All / Draft / Open / Closed / Completed
- CTA: "Create Event" → navigasi ke `/club/events/new`

**`club.events.new.tsx` + `club.events.$eventId.edit.tsx`** (share satu form component):
- Fields: title, description (textarea), hero image (file input → upload), venue, maps URL, date, starting time, registration deadline, quota, entry fee
- Status control: tombol "Publish" (Draft → Open), "Close Registration", "Cancel Event"
- Validation: `react-hook-form` + `zod`

**`club.events.$eventId.participants.tsx`:**
- Tabel: nama peserta, nama registrant, tanggal daftar, status, total fee
- Kolom actions: "Check In" (PATCH status → CheckedIn), "Cancel" (dengan confirm dialog)
- Filter tabs: All / Confirmed / Checked-In / Pending / Cancelled
- Tombol "Export CSV" (download daftar peserta)

---

### Step 9 — Wiring & Cleanup

1. Daftarkan `admin.events.js` ke `backend/src/app.js`
2. Tambah `useEvents`, `useEvent`, `useMyEventRegistrations` ke `frontend/src/lib/useApi.ts`
3. Tambah type `ApiEvent`, `ApiEventRegistration`, `ApiEventParticipant` ke `frontend/src/lib/api.ts`
4. Hapus/rename referensi `tournament` yang tersisa di frontend agar konsisten dengan nama `event`
5. Test end-to-end: create event (admin) → publish → golfer register (free) → check-in (admin)
6. Test: create event berbayar → Midtrans Snap → webhook → Confirmed

---

## Open Questions (untuk diputuskan sebelum implementasi)

- [ ] Apakah cancel oleh golfer trigger refund otomatis via Midtrans Refund API, atau manual saja untuk v1?
- [ ] Hero image: size limit dan format apa yang diizinkan? (default: max 5MB, JPEG/PNG/WebP)
- [ ] Apakah superadmin perlu halaman `/admin/events` untuk lihat semua event lintas club?
- [ ] Notifikasi (email/push) saat registrasi berhasil — in-scope v1 atau nanti?
