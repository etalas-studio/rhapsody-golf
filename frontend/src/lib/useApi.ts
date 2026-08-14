/**
 * Lightweight data-fetching hooks built on top of api.ts.
 * Pattern: useQuery<T>(fn, deps?) — fires on mount, re-fires when deps change.
 * No external library needed; swap for TanStack Query later if caching becomes a concern.
 *
 * ponytail: no cache/stale-while-revalidate. Add TanStack Query when needed.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";
import { useApp } from "./appContext";
import type {
  ApiBooking,
  ApiBookingList,
  ApiCampaign,
  ApiClub,
  ApiClubAnalytics,
  ApiLeaderboardEntry,
  ApiLoyaltyBalance,
  ApiLoyaltyHistory,
  ApiMember360,
  ApiMemberList,
  ApiScorecard,
  ApiScorecardList,
  ApiTeeSheetBooking,
  ApiTeeSlot,
  ApiTournament,
  ApiTournamentList,
  ApiTournamentRegistration,
  ApiVoucher,
  ApiAuditList,
  ApiSuperAdminAnalytics,
  ApiSuperAdminClub,
  ApiHealthStatus,
} from "./api";

// ─── Generic hook ─────────────────────────────────────────────────────────────

export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useQuery<T>(
  fetcher: () => Promise<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[] = [],
  { skip = false }: { skip?: boolean } = {}
): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<string | null>(null);
  const counter = useRef(0);

  const run = useCallback(() => {
    if (skip || typeof window === "undefined") return;
    const id = ++counter.current;
    setLoading(true);
    setError(null);
    fetcher()
      .then((d) => { if (counter.current === id) { setData(d); setLoading(false); } })
      .catch((e) => {
        if (counter.current !== id) return;
        setError(e instanceof ApiError ? e.message : "An error occurred");
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, ...deps]);

  useEffect(() => { run(); }, [run]);

  return { data, loading, error, refetch: run };
}

// ─── Clubs ────────────────────────────────────────────────────────────────────

export function useClubs() {
  return useQuery<ApiClub[]>(() => api.clubs.list());
}

export function useClub(id: string | undefined) {
  return useQuery<ApiClub>(() => api.clubs.get(id!), [id]);
}

export function useTeeSlots(clubId: string | undefined, date: string | undefined) {
  return useQuery<ApiTeeSlot[]>(
    () => api.clubs.teeSlots(clubId!, date!),
    [clubId, date]
  );
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export function useBookings(params?: { status?: string; limit?: number; offset?: number }) {
  const { isAuthenticated } = useApp();
  return useQuery<ApiBookingList>(
    () => api.bookings.list(params),
    [params?.status, params?.limit, params?.offset],
    { skip: !isAuthenticated }
  );
}

export function useBooking(id: string) {
  const { isAuthenticated } = useApp();
  return useQuery<ApiBooking>(
    () => api.bookings.get(id),
    [id],
    { skip: !isAuthenticated || !id }
  );
}

// ─── Loyalty ──────────────────────────────────────────────────────────────────

export function useLoyaltyBalances() {
  const { isAuthenticated } = useApp();
  return useQuery<ApiLoyaltyBalance[]>(
    () => api.loyalty.balances(),
    [],
    { skip: !isAuthenticated }
  );
}

export function useLoyaltyHistory(params?: { clubId?: string; limit?: number; offset?: number }) {
  const { isAuthenticated } = useApp();
  return useQuery<ApiLoyaltyHistory>(
    () => api.loyalty.history(params),
    [params?.clubId, params?.limit, params?.offset],
    { skip: !isAuthenticated }
  );
}

// ─── Vouchers ─────────────────────────────────────────────────────────────────

export function useVouchers(clubId?: string, allStatuses?: boolean) {
  const { isAuthenticated } = useApp();
  return useQuery<ApiVoucher[]>(
    () => api.vouchers.list(clubId, allStatuses),
    [clubId, allStatuses],
    { skip: !isAuthenticated }
  );
}

export function useAdminVouchers(clubId?: string) {
  const { isAuthenticated } = useApp();
  return useQuery<ApiVoucher[]>(
    () => api.admin.vouchers.list(clubId!),
    [clubId],
    { skip: !isAuthenticated || !clubId }
  );
}

// ─── Tournaments ──────────────────────────────────────────────────────────────

export function useTournaments(params?: {
  clubId?: string; status?: string; format?: string; limit?: number; offset?: number;
}) {
  return useQuery<ApiTournamentList>(
    () => api.tournaments.list(params),
    [params?.clubId, params?.status, params?.format, params?.limit, params?.offset]
  );
}

export function useTournament(id: string | undefined) {
  return useQuery<ApiTournament>(() => api.tournaments.get(id!), [id]);
}

export function useLeaderboard(id: string | undefined, flight?: string) {
  return useQuery<ApiLeaderboardEntry[]>(
    () => api.tournaments.leaderboard(id!, flight),
    [id, flight]
  );
}

export function useMyTournamentRegistrations() {
  const { isAuthenticated } = useApp();
  return useQuery<ApiTournamentRegistration[]>(
    () => api.tournaments.myRegistrations(),
    [],
    { skip: !isAuthenticated }
  );
}

// ─── Scorecards ───────────────────────────────────────────────────────────────

export function useScorecards(params?: { limit?: number; offset?: number }) {
  const { isAuthenticated } = useApp();
  return useQuery<ApiScorecardList>(
    () => api.scorecards.list(params),
    [params?.limit, params?.offset],
    { skip: !isAuthenticated }
  );
}

// ─── Club Admin ───────────────────────────────────────────────────────────────

export function useAdminClub(clubId: string | undefined) {
  const { isAuthenticated } = useApp();
  return useQuery<ApiClub>(
    () => api.admin.club(clubId!),
    [clubId],
    { skip: !isAuthenticated || !clubId }
  );
}

export function useTeeSheet(clubId: string | undefined, from: string | undefined, to: string | undefined) {
  const { isAuthenticated } = useApp();
  return useQuery<ApiTeeSheetBooking[]>(
    () => api.admin.teesheet(clubId!, from!, to!),
    [clubId, from, to],
    { skip: !isAuthenticated || !clubId || !from || !to }
  );
}

export function useAdminMembers(params: {
  clubId: string; search?: string; status?: string; limit?: number; offset?: number;
}) {
  const { isAuthenticated } = useApp();
  return useQuery<ApiMemberList>(
    () => api.admin.members.list(params),
    [params.clubId, params.search, params.status, params.limit, params.offset],
    { skip: !isAuthenticated || !params.clubId }
  );
}

export function useAdminMember(memberId: string | undefined, clubId: string | undefined) {
  const { isAuthenticated } = useApp();
  return useQuery<ApiMember360>(
    () => api.admin.members.get(memberId!, clubId!),
    [memberId, clubId],
    { skip: !isAuthenticated || !memberId || !clubId }
  );
}

export function useAdminCampaigns(clubId: string | undefined) {
  const { isAuthenticated } = useApp();
  return useQuery<ApiCampaign[]>(
    () => api.admin.campaigns.list(clubId!),
    [clubId],
    { skip: !isAuthenticated || !clubId }
  );
}

export function useAdminAnalytics(clubId: string | undefined) {
  const { isAuthenticated } = useApp();
  return useQuery<ApiClubAnalytics>(
    () => api.admin.analytics(clubId!),
    [clubId],
    { skip: !isAuthenticated || !clubId }
  );
}

export function useAdminAudit(params: { clubId: string; limit?: number; offset?: number }) {
  const { isAuthenticated } = useApp();
  return useQuery<ApiAuditList>(
    () => api.admin.audit(params),
    [params.clubId, params.limit, params.offset],
    { skip: !isAuthenticated || !params.clubId }
  );
}

// ─── Superadmin ───────────────────────────────────────────────────────────────

export function useSuperAdminAnalytics() {
  const { isAuthenticated } = useApp();
  return useQuery<ApiSuperAdminAnalytics>(
    () => api.superadmin.analytics(),
    [],
    { skip: !isAuthenticated }
  );
}

export function useSuperAdminClubs() {
  const { isAuthenticated } = useApp();
  return useQuery<ApiSuperAdminClub[]>(
    () => api.superadmin.clubs.list(),
    [],
    { skip: !isAuthenticated }
  );
}

export function useSuperAdminMembers(params?: {
  search?: string; clubId?: string; status?: string; limit?: number; offset?: number;
}) {
  const { isAuthenticated } = useApp();
  return useQuery<ApiMemberList>(
    () => api.superadmin.members.list(params),
    [params?.search, params?.clubId, params?.status, params?.limit, params?.offset],
    { skip: !isAuthenticated }
  );
}

export function useSuperAdminMember(userId: string | undefined) {
  const { isAuthenticated } = useApp();
  return useQuery<ApiMember360>(
    () => api.superadmin.members.get(userId!),
    [userId],
    { skip: !isAuthenticated || !userId }
  );
}

export function useSuperAdminAudit(params?: {
  clubId?: string; userId?: string; action?: string; limit?: number; offset?: number;
}) {
  const { isAuthenticated } = useApp();
  return useQuery<ApiAuditList>(
    () => api.superadmin.audit(params),
    [params?.clubId, params?.userId, params?.action, params?.limit, params?.offset],
    { skip: !isAuthenticated }
  );
}

export function useHealthStatus() {
  const { isAuthenticated } = useApp();
  return useQuery<ApiHealthStatus>(
    () => api.superadmin.health(),
    [],
    { skip: !isAuthenticated }
  );
}

export function useClubAdmins() {
  const { isAuthenticated } = useApp();
  return useQuery<import("./api").ApiClubAdmin[]>(
    () => api.superadmin.clubAdmins.list(),
    [],
    { skip: !isAuthenticated }
  );
}

// ─── Re-export api types for convenience ─────────────────────────────────────

export type {
  ApiBookingList,
  ApiCampaign,
  ApiClub,
  ApiClubAnalytics,
  ApiLeaderboardEntry,
  ApiLoyaltyBalance,
  ApiLoyaltyHistory,
  ApiMember360,
  ApiMemberList,
  ApiScorecard,
  ApiScorecardList,
  ApiTeeSheetBooking,
  ApiTeeSlot,
  ApiTournament,
  ApiTournamentList,
  ApiTournamentRegistration,
  ApiVoucher,
  ApiAuditList,
  ApiSuperAdminAnalytics,
  ApiSuperAdminClub,
  ApiHealthStatus,
};
