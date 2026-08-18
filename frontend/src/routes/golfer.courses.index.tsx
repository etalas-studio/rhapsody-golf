import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/mockData";
import { useClubs, useTournaments } from "@/lib/useApi";
import { useApp } from "@/lib/appContext";
import { MapPin, Star, Trophy } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/golfer/courses/")({
  head: () => ({ meta: [{ title: "Golf Course Directory · Rhapsody" }] }),
  component: Courses,
});

// Standard pricing per PRD §5.4
const STARTING_PRICE = 1_100_000;

function Courses() {
  const { appMode, selectedClubId, isAuthenticated, courseViewCount, nudgeDismissed, dismissNudge, requireAuth } = useApp();
  const [q, setQ] = useState("");
  const branded = appMode === "club_branded";
  const showNudge = !isAuthenticated && !nudgeDismissed && courseViewCount >= 2;

  const { data: clubs, loading, error } = useClubs();
  const { data: tournaments } = useTournaments({ status: "Open" });

  const activeTournamentClubIds = useMemo(() => {
    return new Set((tournaments ?? []).map((t) => t.club_id));
  }, [tournaments]);

  const list = useMemo(() => {
    let l = (clubs ?? []).filter((c) => c.active);
    if (branded) l = l.filter((c) => c.id === selectedClubId);
    if (q) l = l.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.location?.toLowerCase().includes(q.toLowerCase()));
    return l;
  }, [clubs, branded, selectedClubId, q]);

  return (
    <AppShell>
      <PageHeader title="Golf Courses" subtitle="Explore partner clubs across the Rhapsody network." />

      {showNudge && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm">
            <span className="font-medium">Unlock member rates</span>
            <span className="text-muted-foreground"> — sign up for a free Rhapsody ID to book and earn points.</span>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" onClick={() => requireAuth({ title: "Create your Rhapsody ID", description: "Book tee times, earn loyalty points, and manage your golf life.", onSuccess: () => {} })}>
              Sign up free
            </Button>
            <Button size="sm" variant="ghost" onClick={dismissNudge}>Maybe later</Button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <Input
          placeholder="Search by name or city…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive text-center py-8">Failed to load courses. Please try again.</p>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((club) => {
            const hasTournament = activeTournamentClubIds.has(club.id);
            const bannerBg = club.theme_color
              ? `linear-gradient(135deg, ${club.theme_color}, ${club.theme_color}bb)`
              : "linear-gradient(135deg, #1a2a40, #3a5a80)";

            return (
              <Link key={club.id} to="/golfer/courses/$courseId" params={{ courseId: club.id }}>
                <Card className="shadow-elegant overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-36 sm:h-44 relative flex items-end p-4" style={{ background: bannerBg }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="relative z-10 flex items-end justify-between w-full gap-2 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-white/80">
                          <MapPin className="h-3 w-3" />
                          {[club.location, club.region].filter(Boolean).join(", ")}
                        </div>
                        <h2 className="font-display text-xl text-white leading-tight mt-0.5">{club.name}</h2>
                        <div className="flex items-center gap-2 text-xs text-white/80 mt-1">
                          <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-gold text-gold" /> 4.5</span>
                          <span>·</span>
                          <span>From {formatIDR(STARTING_PRICE)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Badge className="bg-white/15 text-white border border-white/30 text-[10px]">
                          Visitor
                        </Badge>
                        {hasTournament && (
                          <Badge className="bg-gold text-gold-foreground border-0 text-[10px]">
                            <Trophy className="h-2.5 w-2.5 mr-0.5" /> Open
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{club.holes} holes · Par {club.par}</span>
                      <span className="text-primary font-medium hover:underline">View →</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          {list.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground text-center py-8">
              No courses match your search.
            </p>
          )}
        </div>
      )}
    </AppShell>
  );
}
