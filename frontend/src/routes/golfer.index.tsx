import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { KpiCard, PageHeader } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
// ponytail: currentUser is mockData auth stub — replace with supabase.auth.getSession() when Phase 1 lands
import { currentUser, formatIDR, getClub } from "@/lib/mockData";
import { useApp } from "@/lib/appContext";
import { useClubs, useLoyaltyBalances, useVouchers } from "@/lib/useApi";
import { Calendar, Gift, MapPin, Sparkles, TrendingUp, Trophy } from "lucide-react";

export const Route = createFileRoute("/golfer/")({
  head: () => ({ meta: [{ title: "Golfer Home · Rhapsody" }] }),
  component: GolferHome,
});

function GolferHome() {
  const { appMode, selectedClubId, bookings } = useApp();
  const branded = appMode === "club_branded";

  const { data: clubs, loading: clubsLoading } = useClubs();
  const { data: balances, loading: balLoading } = useLoyaltyBalances();
  const { data: vouchers } = useVouchers(branded ? selectedClubId : undefined);

  // Build club lookup from API data
  const clubMap = Object.fromEntries((clubs ?? []).map((c) => [c.id, c]));
  const homeClub = branded
    ? (clubMap[selectedClubId] ?? (clubs ?? [])[0])
    : (clubs ?? [])[0];

  const upcoming = bookings
    .filter((b) => b.status === "Confirmed")
    .sort((a, b) => a.tee_time.localeCompare(b.tee_time))[0];

  const totalPts = (balances ?? []).reduce((sum, b) => sum + b.points, 0);
  const homePts = branded
    ? ((balances ?? []).find((b) => b.club_id === selectedClubId)?.points ?? 0)
    : totalPts;

  const activeVouchers = (vouchers ?? []).filter((v) => v.status === "Active");
  const recentClubIds = Array.from(new Set(bookings.map((b) => b.club_id)));

  const bannerBg = homeClub?.theme_color
    ? `linear-gradient(135deg, ${homeClub.theme_color}, ${homeClub.theme_color}bb)`
    : "linear-gradient(135deg, #1a2a40, #3a5a80)";

  return (
    <AppShell>
      <PageHeader
        title={`Welcome back, ${currentUser.name.split(" ")[0]}.`}
        subtitle={`${branded ? `${homeClub?.name ?? "Club"} member experience` : "Your network-wide Rhapsody home"} · Rhapsody ID ${currentUser.rhapsody_id}`}
        action={<Button asChild><Link to="/golfer/courses">Browse courses</Link></Button>}
      />

      {/* Hero card */}
      {clubsLoading ? (
        <Skeleton className="h-36 rounded-2xl mb-6" />
      ) : homeClub ? (
        <Card className="overflow-hidden border-0 shadow-glow mb-6">
          <div className="p-6 md:p-8 text-white" style={{ background: bannerBg }}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] opacity-70">Home Club</div>
                <div className="font-display text-3xl mt-1">{homeClub.name}</div>
                {[homeClub.location, homeClub.region].filter(Boolean).length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-sm opacity-80">
                    <MapPin className="h-3.5 w-3.5" /> {[homeClub.location, homeClub.region].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
              <Badge className="bg-white/15 text-white border border-white/20">Visitor</Badge>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label={branded ? "Club Points" : "Total Loyalty"}
          value={balLoading ? "…" : homePts.toLocaleString()}
          hint={branded ? "Separated per club" : "Across all clubs"}
          icon={<Sparkles className="h-4 w-4" />} accent="gold"
        />
        <KpiCard label="Active Vouchers" value={activeVouchers.length} hint="Tap to redeem" icon={<Gift className="h-4 w-4" />} accent="primary" />
        <KpiCard label="Rounds (total)" value={bookings.length} hint="From context" icon={<TrendingUp className="h-4 w-4" />} />
        <KpiCard label="Tournaments" value="—" hint="Coming soon" icon={<Trophy className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Upcoming tee time</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming ? (
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="font-display text-2xl">{new Date(upcoming.tee_time).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {clubMap[upcoming.club_id]?.name ?? upcoming.club_id} · {upcoming.players} players · {formatIDR(upcoming.amount)}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Badge variant="secondary">{upcoming.status}</Badge>
                    <Badge variant="outline" className="border-success/40 text-success">{upcoming.payment_status}</Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <div className="rounded-xl border border-dashed border-primary/40 p-4 text-center bg-primary/5">
                    <div className="text-[10px] uppercase tracking-widest text-primary">Mobile pass</div>
                    <div className="mt-1 grid grid-cols-6 gap-0.5">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <span key={i} className={`h-2 w-2 rounded-[2px] ${i % 3 === 0 || i % 5 === 0 ? "bg-primary" : "bg-primary/20"}`} />
                      ))}
                    </div>
                    <div className="mt-2 text-[10px] text-muted-foreground">BK-{upcoming.id.toUpperCase()}</div>
                  </div>
                  <Link to="/golfer/bookings/$bookingId" params={{ bookingId: upcoming.id }} className="text-xs text-primary hover:underline">
                    View & manage →
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming bookings. <Link className="text-primary hover:underline" to="/golfer/courses">Book a tee time →</Link></p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader><CardTitle>Loyalty by club</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {balLoading ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-5 rounded" />)
            ) : (
              (balances ?? []).map((b) => (
                <div key={b.club_id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 truncate">
                    <span className="shrink-0">⛳</span>
                    <span className="truncate">{b.club_name ?? b.club_id}</span>
                  </div>
                  <span className="font-medium tabular-nums shrink-0">{b.points.toLocaleString()} pts</span>
                </div>
              ))
            )}
            {!branded && !balLoading && (
              <div className="flex items-center justify-between text-sm pt-2 border-t">
                <div className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-gold" /> Rhapsody Network</div>
                <span className="font-medium tabular-nums">{totalPts.toLocaleString()} pts</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="shadow-elegant">
          <CardHeader><CardTitle>Recently visited</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentClubIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No courses visited yet.</p>
            ) : (
              recentClubIds.map((clubId) => {
                const c = clubMap[clubId] ?? getClub(clubId);
                if (!c) return null;
                const bg = c.theme_color
                  ? `linear-gradient(135deg, ${c.theme_color}, ${c.theme_color}bb)`
                  : "linear-gradient(135deg, #1a2a40, #3a5a80)";
                const loc = [c.location, c.region].filter(Boolean).join(", ");
                return (
                  <Link key={clubId} to="/golfer/courses/$courseId" params={{ courseId: clubId }}
                    className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-accent transition">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback style={{ background: bg }} className="text-white text-xs">
                        {c.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      {loc && <div className="text-xs text-muted-foreground truncate">{loc}</div>}
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
