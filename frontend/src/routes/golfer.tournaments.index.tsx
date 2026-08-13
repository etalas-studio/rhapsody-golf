import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/mockData";
import { useClubs, useTournaments, useMyTournamentRegistrations } from "@/lib/useApi";
import { type ApiTournament, type ApiTournamentRegistration } from "@/lib/api";
import { Trophy, Calendar, Users, ChevronRight, MapPin, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/golfer/tournaments/")({
  head: () => ({ meta: [{ title: "Tournaments · Rhapsody" }] }),
  component: Page,
});

const FORMATS = ["All formats", "Stroke Play", "Stableford", "System 36", "Best Ball", "Match Play"];
const FEE_RANGES = [
  { label: "Any fee", min: 0, max: Infinity },
  { label: "Under Rp 2jt", min: 0, max: 2_000_000 },
  { label: "Rp 2–4jt", min: 2_000_000, max: 4_000_000 },
  { label: "Over Rp 4jt", min: 4_000_000, max: Infinity },
];

function statusBadgeCls(status: string) {
  switch (status) {
    case "Open": return "bg-primary text-primary-foreground";
    case "Registration Closed": return "bg-muted text-muted-foreground";
    case "Finished": return "bg-secondary text-secondary-foreground";
    default: return "";
  }
}

function regBadgeCls(status: string) {
  switch (status) {
    case "Confirmed":
    case "Registered": return "bg-primary text-primary-foreground";
    case "Checked-in": return "bg-destructive text-destructive-foreground";
    case "Waitlist": return "bg-amber-500 text-white";
    case "Completed": return "bg-secondary text-secondary-foreground";
    case "Cancelled": return "bg-destructive/20 text-destructive";
    default: return "";
  }
}

function TournamentCard({ t, clubName }: { t: ApiTournament; clubName?: string }) {
  const registered = t.registered_count ?? 0;
  const spotsLeft = t.max_players - registered;
  const almostFull = spotsLeft > 0 && spotsLeft <= 10;
  const full = spotsLeft <= 0 && t.status === "Open";
  return (
    <Link to="/golfer/tournaments/$tournamentId" params={{ tournamentId: t.id }} className="block group">
      <Card className="shadow-elegant overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5">
        <div className="h-1.5 bg-gradient-to-r from-primary to-primary-glow" />
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
              <Trophy className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{clubName ?? t.club_id}</span>
            </div>
            <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
              {full && <Badge className="bg-amber-500 text-white text-[10px]">Waitlist</Badge>}
              <Badge className={statusBadgeCls(t.status)}>{t.status}</Badge>
            </div>
          </div>
          <div className="font-display text-lg sm:text-xl leading-snug">{t.name}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{t.start_date}</span>
            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{registered}/{t.max_players}</span>
            <span>{t.format}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">{formatIDR(t.entry_fee)}</div>
              {almostFull && <span className="text-[10px] text-amber-500 font-medium">Only {spotsLeft} left</span>}
            </div>
            <div className="text-xs text-primary inline-flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
              View details <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MyTournamentRow({ reg, tournament, clubName }: {
  reg: ApiTournamentRegistration;
  tournament?: ApiTournament;
  clubName?: string;
}) {
  if (!tournament) return null;
  return (
    <Link to="/golfer/tournaments/$tournamentId" params={{ tournamentId: tournament.id }} className="block">
      <Card className="shadow-elegant overflow-hidden hover:shadow-lg transition-shadow">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl shrink-0 bg-primary/10">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-medium truncate">{tournament.name}</div>
              <Badge className={regBadgeCls(reg.status)}>{reg.status}</Badge>
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
              <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{tournament.start_date}</span>
              {/* ponytail: tee_time/flight not in ApiTournamentRegistration v1 */}
            </div>
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />{clubName ?? tournament.club_id}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}

function Page() {
  const [filterFormat, setFilterFormat] = useState("All formats");
  const [filterClub, setFilterClub] = useState("all");
  const [filterFeeIdx, setFilterFeeIdx] = useState(0);

  const { data: clubs } = useClubs();
  const { data: tournamentData, loading: tLoading } = useTournaments({
    format: filterFormat !== "All formats" ? filterFormat : undefined,
    clubId: filterClub !== "all" ? filterClub : undefined,
  });
  const { data: myRegs, loading: regLoading } = useMyTournamentRegistrations();

  const clubMap = Object.fromEntries((clubs ?? []).map((c) => [c.id, c.name]));
  const tournamentMap = Object.fromEntries((tournamentData?.tournaments ?? []).map((t) => [t.id, t]));

  const feeRange = FEE_RANGES[filterFeeIdx];
  const filtered = (tournamentData?.tournaments ?? []).filter((t) => {
    if (t.entry_fee < feeRange.min || t.entry_fee > feeRange.max) return false;
    return true;
  });

  const activeRegs = (myRegs ?? []).filter((r) =>
    ["Registered", "Confirmed", "Waitlist", "Checked-in"].includes(r.status)
  );
  const pastRegs = (myRegs ?? []).filter((r) =>
    ["Completed", "Cancelled"].includes(r.status)
  );

  const activeFilterCount =
    (filterFormat !== "All formats" ? 1 : 0) +
    (filterClub !== "all" ? 1 : 0) +
    (filterFeeIdx > 0 ? 1 : 0);

  return (
    <AppShell>
      <PageHeader title="Tournaments" subtitle="Browse events and track tournaments you've joined." />

      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="my">
            My Tournaments
            {(myRegs ?? []).length > 0 && (
              <span className="ml-2 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 leading-none">
                {(myRegs ?? []).length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={filterFormat} onValueChange={setFilterFormat}>
              <SelectTrigger className="h-8 w-auto min-w-[140px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterClub} onValueChange={setFilterClub}>
              <SelectTrigger className="h-8 w-auto min-w-[140px] text-sm"><SelectValue placeholder="All clubs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clubs</SelectItem>
                {(clubs ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(filterFeeIdx)} onValueChange={(v) => setFilterFeeIdx(Number(v))}>
              <SelectTrigger className="h-8 w-auto min-w-[130px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FEE_RANGES.map((r, i) => <SelectItem key={i} value={String(i)}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
                onClick={() => { setFilterFormat("All formats"); setFilterClub("all"); setFilterFeeIdx(0); }}>
                Clear ({activeFilterCount})
              </Button>
            )}
          </div>

          {tLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="shadow-elegant">
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                No tournaments match your filters.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((t) => (
                <TournamentCard key={t.id} t={t} clubName={clubMap[t.club_id]} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my" className="space-y-6">
          {regLoading ? (
            <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : (myRegs ?? []).length === 0 ? (
            <Card className="shadow-elegant">
              <CardContent className="p-8 text-center space-y-3">
                <Trophy className="h-8 w-8 mx-auto text-muted-foreground" />
                <div className="font-medium">No tournaments yet</div>
                <div className="text-sm text-muted-foreground">Browse upcoming tournaments and register to see them here.</div>
              </CardContent>
            </Card>
          ) : (
            <>
              {activeRegs.length > 0 && (
                <section className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">Upcoming & live</div>
                  <div className="space-y-2">
                    {activeRegs.map((r) => (
                      <MyTournamentRow key={r.id} reg={r} tournament={tournamentMap[r.tournament_id]} clubName={tournamentMap[r.tournament_id] ? clubMap[tournamentMap[r.tournament_id].club_id] : undefined} />
                    ))}
                  </div>
                </section>
              )}
              {pastRegs.length > 0 && (
                <section className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">Past results</div>
                  <div className="space-y-2">
                    {pastRegs.map((r) => (
                      <MyTournamentRow key={r.id} reg={r} tournament={tournamentMap[r.tournament_id]} clubName={tournamentMap[r.tournament_id] ? clubMap[tournamentMap[r.tournament_id].club_id] : undefined} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link to="/golfer/tournaments" search={{}}>Browse more tournaments</Link>
          </Button>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
