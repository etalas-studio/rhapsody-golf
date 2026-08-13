# Feature Plan: Voucher Management

## Overview

Club admin dapat membuat dan mengelola voucher yang bisa digunakan golfer saat booking di club tersebut. Sistem voucher bersifat club-scoped — golfer hanya bisa memakai voucher dari club tempat mereka booking.

**Tabel yang dimiliki feature ini:** `vouchers` + `voucher_redemptions`  
**Tabel existing yang di-join:** `clubs`, `users`, `bookings`

---

## Data Model

### Perubahan di `prisma/schema.prisma`

#### Enum baru

```prisma
enum DiscountType {
  Percentage   // diskon persen, e.g. 25%
  FixedAmount  // potongan harga tetap IDR, e.g. Rp 150,000
}
```

#### Model `Voucher` yang direvisi

```prisma
model Voucher {
  id               String        @id @default(cuid())
  clubId           String
  userId           String?       // null = publik (semua golfer bisa pakai)
  voucherCode      String        @unique
  title            String
  description      String?
  discountType     DiscountType
  discountValue    Int           // Percentage: 1–100; FixedAmount: IDR integer
  maxDiscountCap   Int?          // batas max potongan IDR (untuk Percentage saja)
  type             VoucherType   // Green Fee | F&B | Cart | Pro Shop
  status           VoucherStatus @default(Active)
  quota            Int
  usedCount        Int           @default(0) // cache; sumber kebenaran = COUNT(redemptions)
  startsAt         DateTime
  expiryDate       DateTime
  minBookingAmount Int?          // minimum subtotal IDR agar voucher berlaku
  isPublic         Boolean       @default(false)
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  club        Club                @relation(fields: [clubId], references: [id])
  user        User?               @relation(fields: [userId], references: [id])
  redemptions VoucherRedemption[]

  @@map("vouchers")
}
```

#### Model baru: `VoucherRedemption`

Log siapa pakai voucher mana, kapan, dan di booking mana. Ini adalah sumber kebenaran untuk pertanyaan "apakah golfer A sudah pakai voucher X?"

```prisma
model VoucherRedemption {
  id         String   @id @default(cuid())
  voucherId  String
  userId     String
  bookingId  String   @unique  // satu booking hanya pakai satu voucher
  redeemedAt DateTime @default(now())

  voucher Voucher @relation(fields: [voucherId], references: [id])
  user    User    @relation(fields: [userId], references: [id])
  booking Booking @relation(fields: [bookingId], references: [id])

  @@unique([voucherId, userId])  // satu golfer tidak bisa redeem voucher yang sama dua kali
  @@map("voucher_redemptions")
}
```

#### Tambahan field di model `Booking` (existing)

Diperlukan agar booking detail bisa menampilkan breakdown harga sebelum dan sesudah diskon.

```prisma
model Booking {
  // ... field yang sudah ada ...
  subtotal       Int     @default(0)  // total sebelum diskon voucher
  discountAmount Int     @default(0)  // potongan voucher dalam IDR
  voucherId      String?              // FK ke vouchers (nullable)

  voucher Voucher? @relation(fields: [voucherId], references: [id])
}
```

### Perubahan di `mockData.ts`

#### Interface `Voucher` direvisi

```ts
export interface Voucher {
  id: string;
  club_id: string;
  user_id: string | null;
  voucher_code: string;
  title: string;
  description?: string;
  discount_type: "Percentage" | "FixedAmount";
  discount_value: number;       // persen (1–100) atau IDR integer
  max_discount_cap?: number;    // IDR, untuk Percentage saja
  type: "Green Fee" | "F&B" | "Cart" | "Pro Shop";
  status: "Active" | "Redeemed" | "Expired" | "Cancelled";
  quota: number;
  used_count: number;
  starts_at: string;            // ISO date
  expiry_date: string;          // ISO date
  min_booking_amount?: number;  // IDR
  is_public: boolean;
}
```

#### Interface baru: `VoucherRedemption`

```ts
export interface VoucherRedemption {
  id: string;
  voucher_id: string;
  user_id: string;
  booking_id: string;
  redeemed_at: string; // ISO datetime
}
```

#### Update field `Booking` di mock

Tambah field `subtotal`, `discount_amount`, `voucher_id` pada interface dan data booking yang menggunakan voucher.

Update mock data voucher yang ada (vc-1 s/d vc-6) agar mengikuti shape baru.

---

## Field Penjelasan

| Field | Wajib | Keterangan |
|-------|-------|-----------|
| `title` | ✓ | Nama voucher, tampil ke golfer |
| `description` | — | Keterangan singkat (opsional) |
| `discount_type` | ✓ | `Percentage` atau `FixedAmount` |
| `discount_value` | ✓ | Persen (mis. 25) atau IDR (mis. 150000) |
| `max_discount_cap` | — | Batas max potongan IDR jika type Percentage |
| `type` | ✓ | Kategori: Green Fee / F&B / Cart / Pro Shop |
| `status` | auto | Active / Redeemed / Expired / Cancelled |
| `quota` | ✓ | Total voucher yang bisa digunakan |
| `used_count` | auto | Cache count; sumber kebenaran = `voucher_redemptions` |
| `starts_at` | ✓ | Tanggal mulai berlaku |
| `expiry_date` | ✓ | Tanggal kadaluarsa |
| `min_booking_amount` | — | Minimum total booking (IDR) agar voucher berlaku |
| `is_public` | ✓ | `true` = semua golfer bisa gunakan; `false` = hanya yang di-assign |

---

## Logika Bisnis

### Validasi saat golfer apply voucher (checkout step 4)

1. `status === "Active"`
2. `used_count < quota`
3. `today >= starts_at && today <= expiry_date`
4. `voucher.club_id === booking.club_id`
5. `voucher.user_id === currentUser.id || voucher.is_public === true`
6. Belum ada row di `voucher_redemptions` dengan `voucher_id = X AND user_id = currentUser.id`
7. `voucher.type` sesuai dengan kategori booking (e.g. voucher "Green Fee" tidak berlaku untuk F&B)
8. Jika `min_booking_amount` ada: `booking.subtotal >= min_booking_amount`

### Perhitungan diskon

```ts
function calculateDiscount(voucher: Voucher, subtotal: number): number {
  if (voucher.discount_type === "FixedAmount") {
    return Math.min(voucher.discount_value, subtotal);
  }
  const raw = Math.floor(subtotal * (voucher.discount_value / 100));
  return voucher.max_discount_cap ? Math.min(raw, voucher.max_discount_cap) : raw;
}
```

### Saat booking dikonfirmasi (commit voucher)

1. Insert row ke `voucher_redemptions`
2. `voucher.used_count += 1`
3. Simpan `discount_amount` dan `voucher_id` di tabel `bookings`

### Saat booking dibatalkan (kembalikan kuota)

1. Hapus row dari `voucher_redemptions` yang sesuai `booking_id`
2. `voucher.used_count -= 1`
3. Set `booking.voucher_id = null`, `booking.discount_amount = 0`

Kuota kembali sehingga golfer lain (atau golfer yang sama) bisa menggunakannya kembali.

### Auto-expire

Voucher dengan `expiry_date < today` ditampilkan sebagai `Expired` di UI. Backend: cron job atau DB trigger update status.

### Kuota habis

Jika `used_count >= quota`, voucher tidak bisa di-apply (validasi #2). Status tetap `Active` — admin yang putuskan apakah mau di-cancel.

---

## UI — Club Admin (`/club/vouchers`)

### Halaman daftar voucher

| Kolom | Keterangan |
|-------|-----------|
| Kode (mono) | `voucher_code` |
| Nama | `title` |
| Tipe Diskon | badge "%" atau "IDR" + nilai |
| Kategori | Green Fee / F&B / Cart / Pro Shop |
| Kuota | `used_count / quota` (mis. "8/20") |
| Masa Berlaku | `starts_at` – `expiry_date` |
| Status | badge Active / Redeemed / Expired / Cancelled |
| Aksi | Edit · Nonaktifkan |

Filter: Status · Kategori · Cari kode/nama

### Form "Create Voucher"

1. **Nama Voucher** — text input
2. **Kode Voucher** — text input, auto-suggest `{CLUB_CODE}-{RANDOM}`, bisa custom
3. **Deskripsi** — textarea (opsional)
4. **Kategori** — dropdown: Green Fee / F&B / Cart / Pro Shop
5. **Jenis Diskon** — radio: "Persentase (%)" | "Potongan Harga (IDR)"
6. **Nilai Diskon** — number input (tampilkan "%" atau "Rp" sesuai pilihan #5)
7. **Batas Max Diskon** — number input IDR (muncul hanya jika jenis = Persentase)
8. **Minimum Booking** — number input IDR (opsional)
9. **Kuota** — number input
10. **Masa Berlaku** — date range picker: starts_at → expiry_date
11. **Visibilitas** — toggle: "Publik" | "Khusus (assign ke golfer)"
12. Jika Khusus: field assign golfer by Rhapsody ID atau nama

Validasi: `react-hook-form` + `zod`.

### Edit Voucher

Semua field bisa diedit selama status `Active`. Field `used_count` read-only. Nonaktifkan → status `Cancelled` (dengan AlertDialog konfirmasi).

---

## UI — Golfer

### Halaman Loyalty & Vouchers (`/app/loyalty`) — tab Vouchers

- Badge tipe diskon: "25% OFF" atau "Rp 150.000"
- Badge kategori: Green Fee / F&B / Cart / Pro Shop
- Masa berlaku prominent
- Sisa kuota tidak ditampilkan ke golfer

### Booking flow Step 4 — Apply Voucher

- Dropdown hanya tampilkan voucher valid untuk club + kategori yang sesuai
- Setelah pilih voucher: baris "Voucher Discount" muncul di price summary dengan nilai IDR
- Jika kuota habis / sudah pernah dipakai / expired: voucher tidak bisa dipilih, tampil pesan jelas

### Booking Detail (konfirmasi & history)

Jika booking menggunakan voucher, tampilkan breakdown:

```
Green fee × N players    Rp X.XXX.XXX
Member discount (25%)   -Rp XXX.XXX
Voucher: [KODE]         -Rp XXX.XXX
─────────────────────────────────────
Total                    Rp X.XXX.XXX
```

---

## UI — Golfer Web Dashboard (`/golfer/loyalty`)

Sama dengan mobile, layout tabel (bukan card stack).

---

## Checkout Waterfall (CLAUDE.md Rule 10)

Urutan tetap: **Rate → Voucher → GHV → GHP → Gateway**

```
subtotal           = green_fee × players (+ cart + caddie)
after_member       = subtotal × 0.75 (jika Paid Member, else subtotal)
discount_amount    = calculateDiscount(voucher, after_member)
after_voucher      = after_member - discount_amount
after_ghv          = after_voucher - ghv_used
after_ghp          = after_ghv - ghp_used
amount_due         = max(0, after_ghp)
```

---

## File yang Diubah

| File | Perubahan |
|------|-----------|
| `prisma/schema.prisma` | Tambah `DiscountType` enum, revisi `Voucher`, tambah `VoucherRedemption`, tambah 3 field di `Booking` |
| `frontend/src/lib/mockData.ts` | Update interface `Voucher` + `Booking`, tambah interface + data `VoucherRedemption` |
| `frontend/src/routes/club.vouchers.tsx` | Tambah kolom tabel, form Create Voucher, Edit Voucher |
| `frontend/src/routes/app.loyalty.tsx` | Update voucher card dengan field baru |
| `frontend/src/routes/golfer.loyalty.tsx` | Update tampilan desktop |
| `frontend/src/routes/app.book.$courseId.tsx` | Step 4 validasi + discount line; booking detail breakdown |

---

## Urutan Build

1. Update `mockData.ts` — interface + data (tidak breaking)
2. Update voucher card di `app.loyalty` dan `golfer.loyalty`
3. Update booking step 4 + booking detail breakdown
4. Bangun form Create/Edit Voucher di `club.vouchers.tsx`
5. Update Prisma schema saat integrasi backend dimulai (INTEGRATION_PLAN Phase 4)

---

## Out of Scope

- Voucher lintas-club (network voucher)
- Bulk generate voucher code
- Export daftar voucher ke CSV
- Voucher berbasis poin redeem (domain Loyalty, bukan Voucher)
