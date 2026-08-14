/**
 * Thin API client — all data fetching goes through here.
 * Every function attaches the Supabase Bearer JWT from the active session.
 * Backend base URL: VITE_BACKEND_URL (defaults to http://localhost:3001)
 */

import { supabase } from "./supabase";

const BASE = (import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3001") as string;

// ─── Core ─────────────────────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit & { auth?: boolean; token?: string }
): Promise<T> {
  const { auth = true, token: explicitToken, ...init } = options ?? {};

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = explicitToken ?? await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.error ?? res.statusText, path);
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly path: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Clubs (public) ───────────────────────────────────────────────────────────

export interface ApiClub {
  id: string;
  name: string;
  short_name: string | null;
  location: string;
  region: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  operating_hours: string | null;
  maps_url: string | null;
  holes: number;
  number_of_holes: number | null;
  par: number;
  length_yards: number | null;
  course_rating: number | null;
  slope_rating: number | null;
  established_in: number | null;
  description: string | null;
  logo_url: string | null;
  image_urls: string[] | null;
  banner_url: string | null;
  theme_color: string | null;
  website_url: string | null;
  starting_price: number | null;
  rating: number | null;
  app_type: string | null;
  facilities: string[] | null;
  price_includes: string[] | null;
  terms_and_conditions: string | null;
  active: boolean;
}

export interface ApiMe {
  id: string;
  auth_id: string;
  rhapsody_id: string;
  name: string;
  email: string;
  role: string;
  handicap_index: number | null;
  handicap_updated: string | null;
  club_id: string | null;
  club_name: string | null;
  club_theme_color: string | null;
}

export const api = {
  auth: {
    me: (token?: string) => apiFetch<{ user: ApiMe }>("/api/auth/me", { token }),
  },

  clubs: {
    list: () =>
      apiFetch<{ clubs: ApiClub[] }>("/api/clubs", { auth: false }).then((r) => r.clubs),

    get: (id: string) =>
      apiFetch<{ club: ApiClub }>(`/api/clubs/${id}`, { auth: false }).then((r) => r.club),

    teeSlots: (id: string, date: string) =>
      apiFetch<{ slots: ApiTeeSlot[] }>(`/api/clubs/${id}/tee-slots?date=${date}`, { auth: false }).then((r) => r.slots),
  },

  // ─── Bookings ──────────────────────────────────────────────────────────────

  bookings: {
    list: (params?: { status?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return apiFetch<ApiBookingList>(`/api/bookings${q ? `?${q}` : ""}`);
    },

    get: (id: string) =>
      apiFetch<ApiBooking>(`/api/bookings/${id}`),

    create: (body: {
      club_id: string;
      tee_time: string;
      players: number;
      voucher_id?: string;
      ghv_used?: number;
      ghp_used?: number;
      notes?: string;
    }) =>
      apiFetch<{ booking: ApiBooking; snapToken: string; orderId: string; redirectUrl: string; discountApplied: boolean }>("/api/bookings", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    updateStatus: (id: string, status: string) =>
      apiFetch<ApiBooking>(`/api/bookings/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),

    snapToken: (id: string) =>
      apiFetch<{ snap_token: string; order_id: string }>(`/api/bookings/${id}/snap-token`),
  },

  // ─── Loyalty ───────────────────────────────────────────────────────────────

  loyalty: {
    balances: () =>
      apiFetch<{ balances: ApiLoyaltyBalance[]; total: number }>("/api/loyalty").then((r) => r.balances),

    history: (params?: { clubId?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return apiFetch<{ entries: ApiLoyaltyEntry[] }>(`/api/loyalty/history${q ? `?${q}` : ""}`).then((r) => ({ entries: r.entries, total: r.entries.length }));
    },
  },

  // ─── Vouchers ──────────────────────────────────────────────────────────────

  vouchers: {
    list: (clubId?: string, allStatuses?: boolean) => {
      const params = new URLSearchParams();
      if (clubId) params.set("clubId", clubId);
      if (allStatuses) params.set("allStatuses", "true");
      const q = params.toString() ? `?${params}` : "";
      return apiFetch<{ vouchers: ApiVoucher[] }>(`/api/vouchers${q}`).then((r) => r.vouchers);
    },
  },

  // ─── Tournaments ───────────────────────────────────────────────────────────

  tournaments: {
    list: (params?: { clubId?: string; status?: string; format?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return apiFetch<{ tournaments: ApiTournament[]; total: number }>(`/api/tournaments${q ? `?${q}` : ""}`, { auth: false });
    },

    get: (id: string) =>
      apiFetch<{ tournament: ApiTournament }>(`/api/tournaments/${id}`, { auth: false }).then((r) => r.tournament),

    leaderboard: (id: string, flight?: string) => {
      const q = flight ? `?flight=${flight}` : "";
      return apiFetch<{ leaderboard: ApiLeaderboardEntry[] }>(`/api/tournaments/${id}/leaderboard${q}`, { auth: false }).then((r) => r.leaderboard);
    },

    myRegistrations: () =>
      apiFetch<{ registrations: ApiTournamentRegistration[] }>("/api/tournaments/my/registrations").then((r) => r.registrations),

    register: (id: string, body: { players?: string[] }) =>
      apiFetch<ApiTournamentRegistration>(`/api/tournaments/${id}/register`, {
        method: "POST",
        body: JSON.stringify(body),
      }),

    cancelRegistration: (id: string) =>
      apiFetch<void>(`/api/tournaments/${id}/register`, { method: "DELETE" }),

    submitScore: (id: string, body: ApiScoreSubmit) =>
      apiFetch<void>(`/api/tournaments/${id}/score`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

  // ─── Scorecards ────────────────────────────────────────────────────────────

  scorecards: {
    list: (params?: { limit?: number; offset?: number }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return apiFetch<ApiScorecardList>(`/api/scorecards${q ? `?${q}` : ""}`);
    },

    save: (body: ApiScorecardSave) =>
      apiFetch<ApiScorecard>("/api/scorecards", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

  // ─── Club Admin ────────────────────────────────────────────────────────────

  admin: {
    club: (clubId: string) =>
      apiFetch<{ club: ApiClub }>(`/api/admin/club?clubId=${clubId}`).then((r) => r.club),

    updateClub: (clubId: string, body: Partial<ApiClub>) =>
      apiFetch<{ club: ApiClub }>(`/api/admin/club`, {
        method: "PATCH",
        body: JSON.stringify({ clubId, ...body }),
      }).then((r) => r.club),

    teesheet: (clubId: string, from: string, to: string) =>
      apiFetch<{ bookings: ApiTeeSheetBooking[] }>(`/api/admin/teesheet?clubId=${clubId}&from=${from}&to=${to}`).then((r) => r.bookings),

    checkin: (bookingId: string, clubId: string) =>
      apiFetch<ApiBooking>(`/api/admin/bookings/${bookingId}/checkin`, {
        method: "PATCH",
        body: JSON.stringify({ clubId }),
      }),

    members: {
      list: (params: { clubId: string; search?: string; status?: string; limit?: number; offset?: number }) => {
        const q = new URLSearchParams(params as unknown as Record<string, string>).toString();
        return apiFetch<{ members: ApiMember[]; total: number }>(`/api/admin/members?${q}`);
      },
      get: (memberId: string, clubId: string) =>
        apiFetch<{ user: ApiMember; memberships: unknown[]; recent_bookings: ApiBooking[]; loyalty_balances: ApiLoyaltyBalance[]; active_vouchers: ApiVoucher[]; tournament_history: ApiTournamentRegistration[] }>(`/api/admin/members/${memberId}?clubId=${clubId}`).then((r) => ({
          member: r.user,
          memberships: r.memberships,
          bookings: r.recent_bookings,
          loyalty: r.loyalty_balances,
          vouchers: r.active_vouchers,
          tournaments: r.tournament_history,
        } as ApiMember360)),
    },

    campaigns: {
      list: (clubId: string) =>
        apiFetch<{ campaigns: ApiCampaign[] }>(`/api/admin/campaigns?clubId=${clubId}`).then((r) => r.campaigns),
      create: (body: Partial<ApiCampaign>) =>
        apiFetch<ApiCampaign>("/api/admin/campaigns", { method: "POST", body: JSON.stringify(body) }),
      update: (id: string, body: Partial<ApiCampaign>) =>
        apiFetch<ApiCampaign>(`/api/admin/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    },

    analytics: (clubId: string) =>
      apiFetch<ApiClubAnalytics>(`/api/admin/analytics?clubId=${clubId}`),

    audit: (params: { clubId: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams(params as unknown as Record<string, string>).toString();
      return apiFetch<{ entries: ApiAuditEntry[]; total: number }>(`/api/admin/audit?${q}`);
    },

    loyaltyRules: {
      get: (clubId: string) =>
        apiFetch<ApiLoyaltyRule>(`/api/admin/loyalty-rules/${clubId}`),
      upsert: (clubId: string, body: Partial<ApiLoyaltyRule>) =>
        apiFetch<ApiLoyaltyRule>(`/api/admin/loyalty-rules/${clubId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        }),
    },

    vouchers: {
      list: (clubId: string) =>
        apiFetch<{ vouchers: ApiVoucher[] }>(`/api/admin/vouchers?clubId=${clubId}`).then((r) => r.vouchers),
      issue: (body: ApiVoucherIssue) =>
        apiFetch<ApiVoucher>("/api/admin/vouchers", { method: "POST", body: JSON.stringify(body) }),
      update: (id: string, body: Partial<ApiVoucherIssue>) =>
        apiFetch<{ voucher: ApiVoucher }>(`/api/admin/vouchers/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    },

    teeSlotsByDate: (clubId: string, date: string) =>
      apiFetch<{ slots: ApiAdminTeeSlot[] }>(`/api/admin/tee-slots?clubId=${clubId}&date=${date}`).then((r) => r.slots),

    updateTeeSlot: (id: string, clubId: string, body: { price?: number; available?: boolean }) =>
      apiFetch<{ slot: ApiAdminTeeSlot }>(`/api/admin/tee-slots/${id}?clubId=${clubId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }).then((r) => r.slot),

    bulkUpdatePrice: (clubId: string, band: "early" | "prime" | "twilight", price: number) =>
      apiFetch<{ updated: number; band: string; price: number }>(`/api/admin/tee-slots/bulk-price?clubId=${clubId}`, {
        method: "PATCH",
        body: JSON.stringify({ band, price }),
      }),

    generateTeeSlotsPreview: () =>
      apiFetch<{ start_date: string; last_slot_date: string | null }>("/api/admin/generate-tee-slots/preview"),

    generateTeeSlots: (days = 30) =>
      apiFetch<{ success: boolean; slots_attempted: number; start_date: string }>("/api/admin/generate-tee-slots", {
        method: "POST",
        body: JSON.stringify({ days }),
      }),

    getTeeConfig: (clubId: string) =>
      apiFetch<{ config: ApiTeeConfig }>(`/api/admin/tee-config?clubId=${clubId}`).then((r) => r.config),

    saveTeeConfig: (clubId: string, config: Partial<ApiTeeConfig>) =>
      apiFetch<{ config: ApiTeeConfig }>(`/api/admin/tee-config?clubId=${clubId}`, {
        method: "PATCH",
        body: JSON.stringify(config),
      }).then((r) => r.config),
  },

  // ─── Superadmin ────────────────────────────────────────────────────────────

  superadmin: {
    analytics: () =>
      apiFetch<ApiSuperAdminAnalytics>("/api/superadmin/analytics"),

    clubs: {
      list: () =>
        apiFetch<{ clubs: ApiSuperAdminClub[] }>("/api/superadmin/clubs").then((r) => r.clubs),
      create: (body: {
        name: string; short_name: string; location: string; region: string;
        description: string; theme_color?: string; app_type?: string;
        starting_price?: number; facilities?: string[];
      }) =>
        apiFetch<{ club: { id: string; name: string } }>("/api/superadmin/clubs", {
          method: "POST", body: JSON.stringify(body),
        }),
      setActive: (id: string, active: boolean) =>
        apiFetch<{ club: { id: string; name: string; active: boolean } }>(`/api/superadmin/clubs/${id}`, {
          method: "PATCH", body: JSON.stringify({ active }),
        }),
    },

    members: {
      list: (params?: { search?: string; clubId?: string; status?: string; limit?: number; offset?: number }) => {
        const p = new URLSearchParams();
        if (params?.search) p.set("search", params.search);
        if (params?.clubId) p.set("clubId", params.clubId);
        if (params?.status) p.set("status", params.status);
        if (params?.limit != null) p.set("limit", String(params.limit));
        if (params?.offset != null) p.set("offset", String(params.offset));
        const q = p.toString();
        return apiFetch<{ members: ApiMember[]; total: number }>(`/api/superadmin/members${q ? `?${q}` : ""}`);
      },
      get: (userId: string) =>
        apiFetch<{ user: ApiMember; memberships: unknown[]; recent_bookings: ApiBooking[]; loyalty_balances: ApiLoyaltyBalance[]; active_vouchers: ApiVoucher[]; tournament_history: ApiTournamentRegistration[] }>(`/api/superadmin/members/${userId}`).then((r) => ({
          member: r.user,
          memberships: r.memberships,
          bookings: r.recent_bookings,
          loyalty: r.loyalty_balances,
          vouchers: r.active_vouchers,
          tournaments: r.tournament_history,
        } as ApiMember360)),
    },

    audit: (params?: { clubId?: string; userId?: string; action?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return apiFetch<{ logs: ApiAuditEntry[]; total: number }>(`/api/superadmin/audit${q ? `?${q}` : ""}`).then((r) => ({ entries: r.logs, total: r.total }));
    },

    health: () =>
      apiFetch<ApiHealthStatus>("/api/superadmin/health"),

    clubAdmins: {
      list: () =>
        apiFetch<{ admins: ApiClubAdmin[] }>("/api/superadmin/club-admins").then((r) => r.admins),
      create: (body: { name: string; email: string; password: string; club_id: string }) =>
        apiFetch<{ success: boolean; user_id: string }>("/api/superadmin/club-admins", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      remove: (userId: string) =>
        apiFetch<{ success: boolean }>(`/api/superadmin/club-admins/${userId}`, { method: "DELETE" }),
    },

    generateTeeSlots: (clubId?: string) =>
      apiFetch<{ success: boolean; clubs: number; slots_attempted: number }>(
        "/api/superadmin/generate-tee-slots",
        { method: "POST", body: JSON.stringify(clubId ? { club_id: clubId } : {}) }
      ),
  },

  // ─── Payments ──────────────────────────────────────────────────────────────

  payments: {
    status: (orderId: string) =>
      apiFetch<ApiPaymentStatus>(`/api/payments/status/${orderId}`),
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiTeeSlot {
  id: string;
  date: string;
  time: string;
  available: boolean;
  price: number;
  price_band: "Early" | "Prime" | "Twilight";
}

export interface ApiBooking {
  id: string;
  club_id: string;
  club_name?: string;
  tee_time: string;
  tee_end_time?: string | null;
  players: number;
  amount: number;
  subtotal?: number;
  discount_amount?: number;
  voucher_id?: string | null;
  voucher?: {
    voucher_code: string;
    title: string;
    discount_type: "Percentage" | "FixedAmount";
    discount_value: number;
    max_discount_cap: number | null;
    type: string;
  } | null;
  status: string;
  payment_status: string;
  channel_tag: string;
  ref_code: string;
  notes?: string;
  partners?: string[];
  created_at: string;
}

export interface ApiBookingList {
  bookings: ApiBooking[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiLoyaltyBalance {
  club_id: string;
  club_name: string;
  points: number;
}

export interface ApiLoyaltyEntry {
  id: string;
  club_id: string;
  club_name: string;
  points: number;
  type: "Earn" | "Redeem";
  description: string;
  created_at: string;
}

export interface ApiLoyaltyHistory {
  entries: ApiLoyaltyEntry[];
  total: number;
}

export interface ApiVoucher {
  id: string;
  voucher_code: string;
  club_id: string;
  club_name?: string;
  clubs?: { name: string; short_name: string | null };
  user_id: string | null;
  title: string;
  description?: string;
  discount_type: "Percentage" | "FixedAmount";
  discount_value: number;
  max_discount_cap: number | null;
  type: "Green Fee" | "F&B" | "Cart" | "Pro Shop";
  status: "Active" | "Redeemed" | "Expired" | "Cancelled";
  quota: number;
  used_count: number;
  starts_at: string;
  expiry_date: string;
  min_booking_amount: number | null;
  is_public: boolean;
}

export interface ApiTournament {
  id: string;
  club_id: string;
  club_name?: string;
  name: string;
  description: string | null;
  format: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  max_players: number;
  entry_fee: number;
  status: string;
  handicap_basis: string | null;
  prize_pool: number | null;
  registered_count?: number;
}

export interface ApiTournamentList {
  tournaments: ApiTournament[];
  total: number;
}

export interface ApiTournamentRegistration {
  id: string;
  tournament_id: string;
  tournament?: ApiTournament;
  user_id: string;
  status: string;
  team_name: string | null;
  registered_at: string;
}

export interface ApiLeaderboardEntry {
  position: number;
  user_id: string;
  name: string;
  rhapsody_id: string;
  gross: number | null;
  net: number | null;
  points: number | null;
  status: string;
  verified: boolean;
}

export interface ApiScoreSubmit {
  scores: { hole: number; strokes: number }[];
  marker_verified?: boolean;
}

export interface ApiScorecard {
  id: string;
  club_id: string;
  club_name?: string;
  played_at: string;
  gross: number;
  net: number | null;
  differential: number | null;
  holes: { hole: number; par: number; strokes: number }[];
}

export interface ApiScorecardList {
  scorecards: ApiScorecard[];
  total: number;
}

export interface ApiScorecardSave {
  club_id: string;
  played_at: string;
  holes: { hole: number; par: number; strokes: number }[];
}

export interface ApiTeeSheetBooking {
  id: string;
  ref_code: string;
  tee_time: string;
  tee_end_time?: string | null;
  players: number;
  amount: number;
  status: string;
  user: { id: string; name: string; rhapsody_id: string; email: string };
}

export interface ApiMember {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  rhapsody_id: string;
  handicap: number | null;
  membership_status: string;
  joined_at: string;
  total_bookings?: number;
  total_spent?: number;
  loyalty_points?: number;
}

export interface ApiMemberList {
  members: ApiMember[];
  total: number;
}

export interface ApiMember360 {
  member: ApiMember;
  memberships: unknown[];
  bookings: ApiBooking[];
  loyalty: ApiLoyaltyBalance[];
  vouchers: ApiVoucher[];
  tournaments?: ApiTournamentRegistration[];
}

export interface ApiCampaign {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  status: "Draft" | "Active" | "Ended";
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface ApiClubAnalytics {
  revenue_30d: number;
  bookings_30d: number;
  revenue_total: number;
  bookings_total: number;
  tournaments_total: number;
  vouchers_total: number;
  members_total: number;
  paid_members: number;
  avg_handicap: number | null;
  visit_trend: { date: string; visits: number }[];
}

export interface ApiAuditEntry {
  id: string;
  user_id: string | null;
  user_name: string | null;
  club_id: string | null;
  action: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface ApiAuditList {
  entries: ApiAuditEntry[];
  total: number;
}

export interface ApiLoyaltyRule {
  club_id: string;
  pts_per_spending: number;
  weekday_multiplier: number;
  visit_bonus: number;
  min_spend: number;
  active: boolean;
}

export interface ApiVoucherIssue {
  club_id: string;
  title: string;
  description?: string;
  voucher_code?: string;
  discount_type: "Percentage" | "FixedAmount";
  discount_value: number;
  max_discount_cap?: number;
  type: "Green Fee" | "F&B" | "Cart" | "Pro Shop";
  quota: number;
  starts_at: string;
  expiry_date: string;
  min_booking_amount?: number;
  is_public: boolean;
  user_id?: string; // jika is_public = false, assign ke golfer ini
}

export interface ApiTeeConfig {
  tee_interval_minutes: number;
  early_start: string;
  early_end: string;
  early_default_price: number;
  prime_start: string;
  prime_end: string;
  prime_default_price: number;
  twilight_start: string;
  twilight_end: string;
  twilight_default_price: number;
}

export interface ApiAdminTeeSlot {
  id: string;
  date: string;
  time: string;
  price: number;
  available: boolean;
}

export interface ApiSuperAdminAnalytics extends ApiClubAnalytics {
  top_clubs: { club_id: string; club_name: string; revenue: number }[];
}

export interface ApiSuperAdminClub extends ApiClub {
  paid_member_count: number;
}

export interface ApiClubAdmin {
  id: string;
  name: string;
  email: string;
  created_at: string;
  club_admins: { club_id: string; clubs: { id: string; name: string } | null }[];
}

export interface ApiHealthStatus {
  status: "ok" | "degraded";
  checks: { name: string; status: "ok" | "fail"; latency_ms?: number }[];
}

export interface ApiPaymentStatus {
  orderId: string;
  bookingId: string;
  status: string;
  paymentStatus: string;
  amount: number;
  teeTime: string;
}
