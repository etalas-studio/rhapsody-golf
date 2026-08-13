import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
// ponytail: currentUser is auth stub — replace with supabase.auth.getSession() in Phase 1
import { currentUser, formatHandicap, handicapCategory } from "@/lib/mockData";
import { useClubs, useLoyaltyBalances, useBookings } from "@/lib/useApi";
import { History, ClipboardList, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "Profile · Rhapsody App" }] }),
  component: AppProfile,
});

function AppProfile() {
  const { data: clubs, loading: clubsLoading } = useClubs();
  const { data: balances, loading: balLoading } = useLoyaltyBalances();
  const { data: bookingList, loading: bookingsLoading } = useBookings({ status: "Completed" });

  const clubMap = Object.fromEntries((clubs ?? []).map((c) => [c.id, c]));

  const completedBookings = bookingList?.bookings ?? [];
  const historyClubIds = Array.from(new Set(completedBookings.map((b) => b.club_id)));
  const history = historyClubIds.map((clubId) => {
    const cb = completedBookings.filter((b) => b.club_id === clubId);
    const last = [...cb].sort((a, b) => b.tee_time.localeCompare(a.tee_time))[0]?.tee_time;
    return { clubId, rounds: cb.length, last };
  }).sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""));

  return (
    <MobileShell>
      <div className="px-4 py-5 space-y-5">
        <h1 className="font-display text-2xl">Profile</h1>

        {/* Avatar + handicap */}
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-display shrink-0">
              {currentUser.avatar}
            </div>
            <div className="min-w-0">
              <p className="font-display text-lg truncate">{currentUser.name}</p>
              <Badge variant="outline" className="text-[10px] mt-0.5">Rhapsody ID {currentUser.rhapsody_id}</Badge>
              <div className="flex items-center gap-2 mt-2">
                <span className="font-display text-2xl text-primary">{formatHandicap(currentUser.handicap_index)}</span>
                <Badge variant="secondary" className="text-[10px]">{handicapCategory(currentUser.handicap_index)}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="space-y-2">
          <Link to="/app/scorecard">
            <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 mb-2">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">My Scorecard</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
          <Link to="/app/bookings">
            <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">My Bookings</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        </div>

        {/* Club memberships */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">My Clubs</h2>
          {balLoading ? (
            <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : (balances ?? []).filter((b) => b.points > 0).length === 0 ? (
            <p className="text-sm text-muted-foreground">No club activity yet.</p>
          ) : (balances ?? []).filter((b) => b.points > 0).map((b) => {
            const club = clubMap[b.club_id];
            return (
              <div key={b.club_id} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 mb-2">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg grid place-items-center text-white text-xs font-bold shrink-0"
                    style={{ background: club?.theme_color ?? "var(--primary)" }}>
                    {(club?.name ?? b.club_id).charAt(0)}
                  </div>
                  <p className="text-sm font-medium">{club?.name ?? b.club_id}</p>
                </div>
                <span className="text-sm font-semibold text-gold">{b.points.toLocaleString()} pts</span>
              </div>
            );
          })}
        </div>

        {/* Play history */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Play History</h2>
          {bookingsLoading ? (
            <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rounds played yet.</p>
          ) : history.map(({ clubId, rounds, last }) => {
            const c = clubMap[clubId];
            return (
              <Link key={clubId} to="/app/history/$clubId" params={{ clubId }}>
                <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg grid place-items-center text-white text-xs font-bold shrink-0"
                      style={{ background: c?.theme_color ?? "var(--primary)" }}>
                      {(c?.name ?? clubId).charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{c?.name ?? clubId}</p>
                      {last && <p className="text-[10px] text-muted-foreground">Last {new Date(last).toLocaleDateString()}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary">{rounds} round{rounds !== 1 ? "s" : ""}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Preferences */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preferences</h2>
          <div className="space-y-2">
            {[
              { label: "Push notifications", on: true },
              { label: "Promotional emails", on: false },
              { label: "Share play history with clubs", on: true },
            ].map((p) => (
              <div key={p.label} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
                <Label className="text-sm">{p.label}</Label>
                <Switch defaultChecked={p.on} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
