import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/mockData";
import { useApp } from "@/lib/appContext";
import { useBookings, useLoyaltyBalances, useVouchers, useClubs } from "@/lib/useApi";
import {
  Calendar, Gift, MapPin, Trophy, Sparkles, Star,
  ChevronRight, Clock, Users, ArrowRight, Bot,
} from "lucide-react";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Home · Rhapsody App" }] }),
  component: AppHome,
});

function AppHome() {
  const { user } = useApp();

  const { data: bookingData, loading: bLoading } = useBookings({ limit: 20 });
  const { data: loyaltyData, loading: lLoading } = useLoyaltyBalances();
  const { data: voucherData, loading: vLoading } = useVouchers();
  const { data: clubData, loading: cLoading } = useClubs();

  const now = new Date();
  const upcoming = bookingData?.bookings
    .filter((b) => b.status === "Confirmed" && new Date(b.tee_time) > now)
    .sort((a, b) => a.tee_time.localeCompare(b.tee_time))[0];

  const totalPts = loyaltyData?.reduce((sum, b) => sum + b.points, 0) ?? 0;
  const activeVouchers = voucherData?.filter((v) => v.status === "Active") ?? [];
  const completedRounds =
    bookingData?.bookings.filter((b) => b.status === "Completed").length ?? 0;

  const loading = bLoading || lLoading || vLoading;

  // initials from name
  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "GF";

  const firstName = user?.name?.split(" ")[0] ?? "Golfer";

  // Featured clubs (up to 3)
  const featured = (clubData ?? []).slice(0, 6);

  return (
    <MobileShell>
      <div className="space-y-0">
        {/* ── Header gradient hero ── */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-4 pt-6 pb-5">
          <div className="flex items-center justify-between mb-4">
            {/* Avatar + name */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center shadow-glow shrink-0">
                <span className="text-primary-foreground font-display font-semibold text-base">
                  {initials}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground leading-none mb-0.5">Welcome back,</p>
                <h1 className="font-display text-xl leading-none">{firstName}</h1>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-3 w-3 fill-gold text-gold" />
                  <span className="text-[10px] text-gold font-medium">Rhapsody Member</span>
                </div>
              </div>
            </div>
            {/* Member ID chip */}
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Member ID</p>
              <p className="text-xs font-mono font-medium">{user?.rhapsody_id ?? "—"}</p>
            </div>
          </div>

          {/* KPI row */}
          {loading ? (
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  icon: <Sparkles className="h-4 w-4 text-gold" />,
                  label: "Points",
                  value: totalPts.toLocaleString("id-ID"),
                  accent: "text-gold",
                  to: "/app/loyalty" as const,
                },
                {
                  icon: <Gift className="h-4 w-4 text-primary" />,
                  label: "Vouchers",
                  value: String(activeVouchers.length),
                  accent: "text-primary",
                  to: "/app/loyalty" as const,
                },
                {
                  icon: <Trophy className="h-4 w-4 text-emerald-600" />,
                  label: "Rounds",
                  value: String(completedRounds),
                  accent: "text-emerald-600",
                },
              ].map(({ icon, label, value, accent, to }) => (
                to ? (
                  <Link key={label} to={to}
                    className="rounded-2xl bg-white/80 border border-border/50 shadow-sm p-3 flex flex-col gap-1.5 active:opacity-70 transition-opacity">
                    {icon}
                    <p className={`text-xl font-display leading-none ${accent}`}>{value}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </Link>
                ) : (
                  <div key={label}
                    className="rounded-2xl bg-white/80 border border-border/50 shadow-sm p-3 flex flex-col gap-1.5">
                    {icon}
                    <p className={`text-xl font-display leading-none ${accent}`}>{value}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                )
              ))}
            </div>
          )}
        </div>

        {/* ── Next tee time ── */}
        <div className="px-4 pt-5">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-semibold">Next Tee Time</h2>
            <Link
              to="/app/bookings"
              className="text-xs text-primary flex items-center gap-0.5"
            >
              All bookings <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {bLoading ? (
            <Skeleton className="h-28 rounded-2xl" />
          ) : upcoming ? (
            <Link to="/app/bookings/$bookingId" params={{ bookingId: upcoming.id }}>
              <Card className="shadow-elegant overflow-hidden rounded-2xl border-primary/10">
                {/* Tinted banner */}
                <div className="bg-gradient-to-r from-primary to-primary/70 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-primary-foreground font-semibold text-base leading-tight">
                      {upcoming.club_name ?? upcoming.club_id}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-primary-foreground/80 text-xs">
                        <Clock className="h-3 w-3" />
                        {new Date(upcoming.tee_time).toLocaleString("id-ID", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="flex items-center gap-1 text-primary-foreground/80 text-xs">
                        <Users className="h-3 w-3" />
                        {upcoming.players}P
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-white/20 text-white border-0 text-[10px]">
                      {upcoming.status}
                    </Badge>
                    <p className="text-primary-foreground font-semibold text-sm mt-1.5">
                      {formatIDR(upcoming.amount)}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ) : (
            <div className="rounded-2xl border border-dashed border-muted-foreground/30 p-5 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming tee times</p>
              <Button asChild size="sm" variant="outline" className="mt-3 text-xs h-8">
                <Link to="/app/courses">Book a round</Link>
              </Button>
            </div>
          )}
        </div>

        {/* ── Quick actions ── */}
        <div className="px-4 pt-5">
          <h2 className="text-sm font-semibold mb-2.5">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              asChild
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 rounded-2xl border-primary/20 bg-primary/5"
            >
              <Link to="/app/courses">
                <MapPin className="h-6 w-6 text-primary" />
                <span className="text-xs font-medium">Browse Courses</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 rounded-2xl border-gold/30 bg-gold/5"
            >
              <Link to="/app/scorecard">
                <Trophy className="h-6 w-6 text-gold" />
                <span className="text-xs font-medium">My Scorecard</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="col-span-2 h-auto py-4 flex flex-row gap-3 rounded-2xl border-primary/30 bg-gradient-to-r from-primary/8 to-primary/4"
            >
              <Link to="/app/chat">
                <Bot className="h-6 w-6 text-primary" />
                <div className="text-left">
                  <p className="text-xs font-semibold">Book via AI Assistant</p>
                  <p className="text-[10px] text-muted-foreground font-normal">Chat untuk booking tee time</p>
                </div>
              </Link>
            </Button>
          </div>
        </div>

        {/* ── Featured clubs ── */}
        <div className="pt-5 pb-6">
          <div className="flex items-center justify-between mb-2.5 px-4">
            <h2 className="text-sm font-semibold">Featured Courses</h2>
            <Link
              to="/app/courses"
              className="text-xs text-primary flex items-center gap-0.5"
            >
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {cLoading ? (
            <div className="flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-44 w-36 rounded-2xl shrink-0" />
              ))}
            </div>
          ) : featured.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4 px-4">No courses available</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
              {featured.map((club) => (
                <Link
                  key={club.id}
                  to="/app/courses/$courseId"
                  params={{ courseId: club.id }}
                  className="shrink-0 w-40"
                >
                  <Card className="shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow h-full">
                    <CardContent className="p-0 flex flex-col">
                      {/* Thumbnail */}
                      <div className="w-full h-24 overflow-hidden">
                        {club.banner_url || club.image_urls?.[0] ? (
                          <img
                            src={club.banner_url ?? club.image_urls![0]}
                            alt={club.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full"
                            style={{
                              background: club.theme_color
                                ? `linear-gradient(135deg, ${club.theme_color}, ${club.theme_color}99)`
                                : "linear-gradient(135deg, #1a2a40, #3a5a80)",
                            }}
                          />
                        )}
                      </div>
                      <div className="px-3 py-2.5 flex flex-col gap-0.5">
                        <p className="font-semibold text-sm leading-tight line-clamp-2">{club.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {club.location}
                        </p>
                        {club.starting_price ? (
                          <p className="text-xs text-primary font-medium mt-1">
                            from {formatIDR(club.starting_price)}
                          </p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileShell>
  );
}
