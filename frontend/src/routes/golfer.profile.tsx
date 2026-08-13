import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
// ponytail: currentUser is mockData auth stub — replace with supabase.auth.getSession() when Phase 1 lands
import { currentUser, formatHandicap, handicapCategory } from "@/lib/mockData";
import { useApp } from "@/lib/appContext";
import { useClubs, useLoyaltyBalances } from "@/lib/useApi";
import { History } from "lucide-react";

export const Route = createFileRoute("/golfer/profile")({
  head: () => ({ meta: [{ title: "Profile · Rhapsody" }] }),
  component: Profile,
});

function Profile() {
  const { bookings } = useApp();
  const { data: clubs, loading: clubsLoading } = useClubs();
  const { data: balances, loading: balLoading } = useLoyaltyBalances();

  // Build club lookup
  const clubMap = Object.fromEntries((clubs ?? []).map((c) => [c.id, c]));

  // Play history: distinct clubs from bookings
  const historyClubIds = Array.from(new Set(bookings.map((b) => b.club_id)));
  const history = historyClubIds.map((clubId) => {
    const clubBookings = bookings.filter((b) => b.club_id === clubId);
    const lastVisit = [...clubBookings].sort((a, b) => b.tee_time.localeCompare(a.tee_time))[0]?.tee_time;
    return { clubId, rounds: clubBookings.length, lastVisit };
  }).sort((a, b) => (b.lastVisit ?? "").localeCompare(a.lastVisit ?? ""));

  // ponytail: membership status not returned by golfer API yet — derive from loyalty balances as a proxy (club with points = has interacted)
  const clubsWithActivity = new Set((balances ?? []).filter((b) => b.points > 0).map((b) => b.club_id));

  const bannerBg = (clubId: string) => {
    const c = clubMap[clubId];
    return c?.theme_color
      ? `linear-gradient(135deg, ${c.theme_color}, ${c.theme_color}bb)`
      : "linear-gradient(135deg, #1a2a40, #3a5a80)";
  };

  return (
    <AppShell>
      <PageHeader title="Profile" subtitle="One Rhapsody ID, many club relationships." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-elegant">
          <CardContent className="p-6 text-center">
            <Avatar className="h-20 w-20 mx-auto ring-gold ring-offset-2">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">{currentUser.avatar}</AvatarFallback>
            </Avatar>
            <div className="mt-3 font-display text-xl">{currentUser.name}</div>
            <Badge variant="outline" className="mt-1">Rhapsody ID {currentUser.rhapsody_id}</Badge>
            <div className="mt-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Handicap Index</div>
              <div className="mt-0.5 flex items-baseline justify-center gap-2">
                <div className="font-display text-3xl text-primary leading-none">{formatHandicap(currentUser.handicap_index)}</div>
                <Badge variant="secondary" className="text-[10px]">{handicapCategory(currentUser.handicap_index)}</Badge>
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">Updated {currentUser.handicap_updated}</div>
            </div>
            <div className="mt-4 text-sm text-muted-foreground space-y-1 text-left">
              <Row label="Phone" value={currentUser.phone} />
              <Row label="Email" value={currentUser.email} />
              <Row label="Joined" value={currentUser.created_at} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-elegant">
          <CardHeader><CardTitle>My club memberships</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {balLoading && [0, 1].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            {!balLoading && clubsWithActivity.size === 0 && (
              <div className="text-sm text-muted-foreground">No club memberships yet. Browse courses to join one.</div>
            )}
            {!balLoading && Array.from(clubsWithActivity).map((clubId) => {
              const club = clubMap[clubId];
              const balance = (balances ?? []).find((b) => b.club_id === clubId);
              if (!club) return null;
              const bg = bannerBg(clubId);
              const loc = [club.location, club.region].filter(Boolean).join(", ");
              return (
                <div key={clubId} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 grid place-items-center rounded-lg text-white text-sm font-bold" style={{ background: bg }}>
                      {club.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium">{club.name}</div>
                      {loc && <div className="text-xs text-muted-foreground">{loc}</div>}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{balance?.points.toLocaleString() ?? 0} pts</Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" /> Play history
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clubsLoading && [0, 1].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            {!clubsLoading && history.length === 0 && (
              <div className="text-sm text-muted-foreground">No rounds played yet.</div>
            )}
            {!clubsLoading && history.map(({ clubId, rounds, lastVisit }) => {
              const c = clubMap[clubId];
              const name = c?.name ?? clubId;
              const bg = bannerBg(clubId);
              const loc = c ? [c.location, c.region].filter(Boolean).join(", ") : "";
              return (
                <Link
                  key={clubId}
                  to="/golfer/history/$clubId"
                  params={{ clubId }}
                  className="flex items-center justify-between rounded-lg border p-4 gap-3 hover:bg-accent/40 hover:border-primary/40 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 shrink-0 grid place-items-center rounded-lg text-white text-sm font-bold" style={{ background: bg }}>
                      {name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{name}</div>
                      {loc && <div className="text-xs text-muted-foreground truncate">{loc}</div>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="secondary">{rounds} round{rounds === 1 ? "" : "s"}</Badge>
                    {lastVisit && (
                      <div className="text-[11px] text-muted-foreground mt-1">
                        Last played {new Date(lastVisit).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-elegant">
          <CardHeader><CardTitle>Consent & marketing preferences</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Pref label="Promotional emails" />
            <Pref label="SMS notifications" />
            <Pref label="Push notifications" defaultOn />
            <Pref label="Share play history with club admins" defaultOn />
            <Pref label="Personalised tournament invitations" defaultOn />
            <Pref label="Cross-club anonymous analytics" />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 min-w-0">
      <span className="shrink-0">{label}</span>
      <span className="text-foreground truncate flex-1 min-w-0 text-right">{value}</span>
    </div>
  );
}

function Pref({ label, defaultOn }: { label: string; defaultOn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3 min-w-0">
      <Label className="text-sm min-w-0 truncate">{label}</Label>
      <Switch defaultChecked={defaultOn} className="shrink-0" />
    </div>
  );
}
