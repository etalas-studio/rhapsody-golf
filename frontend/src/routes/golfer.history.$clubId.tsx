import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { COURSE_PARS } from "@/lib/mockData";
import { useApp } from "@/lib/appContext";
import { useClub, useScorecards, useTournaments } from "@/lib/useApi";
import { ArrowLeft, ChevronRight, Clock, Users } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { z } from "zod";

const searchSchema = z.object({ round: z.string().optional() });

export const Route = createFileRoute("/golfer/history/$clubId")({
  head: ({ params }) => ({ meta: [{ title: `Play History · Rhapsody` }] }),
  validateSearch: searchSchema,
  component: HistoryDetail,
  notFoundComponent: () => (
    <AppShell><div className="p-6">Club not found.</div></AppShell>
  ),
});

function HistoryDetail() {
  const { clubId } = Route.useParams();
  const { round: roundId } = Route.useSearch();
  const { bookings } = useApp();

  const { data: club, loading: clubLoading } = useClub(clubId);
  const { data: apiCards } = useScorecards();
  const { data: tournamentData } = useTournaments({ clubId });

  const myRounds = bookings
    .filter((b) => b.club_id === clubId)
    .sort((a, b) => b.tee_time.localeCompare(a.tee_time));

  const myCards = (apiCards?.scorecards ?? []).filter((s) => s.club_id === clubId);
  const findScorecard = (teeTime: string) => {
    const date = teeTime.slice(0, 10);
    return myCards.find((s) => s.played_at.slice(0, 10) === date);
  };

  const tournamentList = tournamentData?.tournaments ?? [];
  const findTournament = (gameType: string) =>
    gameType === "Tournament" ? tournamentList[0] : undefined;

  const [selectedId, setSelectedId] = useState<string>(roundId ?? myRounds[0]?.id ?? "");

  if (clubLoading) {
    return (
      <AppShell>
        <Skeleton className="h-9 w-64 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!club) throw notFound();

  const selectedRound = myRounds.find((r) => r.id === selectedId);
  const rawCard = selectedRound ? findScorecard(selectedRound.tee_time) : undefined;
  const scorecard = rawCard ? {
    score: rawCard.gross,
    strokes: rawCard.holes.map((h) => h.strokes),
    pars: rawCard.holes.map((h) => h.par),
  } : undefined;
  const tournament = selectedRound ? findTournament(selectedRound.game_type ?? "") : undefined;

  const bannerBg = club.theme_color
    ? `linear-gradient(135deg, ${club.theme_color}, ${club.theme_color}bb)`
    : "linear-gradient(135deg, #1a2a40, #3a5a80)";

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/golfer/profile"><ArrowLeft className="h-4 w-4" /> Profile</Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl">{club.name}</h1>
          <p className="text-xs text-muted-foreground">{myRounds.length} rounds recorded</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <Card className="shadow-elegant">
          <CardContent className="p-2">
            {myRounds.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No rounds at this club yet.</div>
            ) : (
              <ul className="flex flex-col gap-1">
                {myRounds.map((r) => {
                  const isActive = r.id === selectedId;
                  const raw = findScorecard(r.tee_time);
                  const diff = raw ? raw.gross - raw.holes.reduce((a, h) => a + h.par, 0) : null;
                  return (
                    <li key={r.id}>
                      <button
                        onClick={() => setSelectedId(r.id)}
                        className={cn(
                          "w-full text-left rounded-lg px-3 py-2.5 transition-colors flex items-center justify-between gap-2",
                          isActive ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/60 border border-transparent",
                        )}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium">
                            {new Date(r.tee_time).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">{r.game_type ?? "Casual"} · {r.status}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {diff !== null && (
                            <span className={cn("text-xs font-medium", diff < 0 ? "text-emerald-600" : diff > 0 ? "text-rose-600" : "")}>
                              {diff === 0 ? "E" : diff > 0 ? `+${diff}` : diff}
                            </span>
                          )}
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div>
          {selectedRound ? (
            <RoundDetail
              r={selectedRound}
              scorecard={scorecard}
              tournament={tournament}
              bannerBg={bannerBg}
            />
          ) : (
            <Card className="shadow-elegant">
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                Select a round to view details.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

type Booking = ReturnType<typeof useApp>["bookings"][number];

function RoundDetail({
  r,
  scorecard,
  tournament,
  bannerBg,
}: {
  r: Booking;
  scorecard: { score: number; strokes?: number[]; pars?: number[] } | undefined;
  tournament: { name: string; format: string } | undefined;
  bannerBg: string;
}) {
  return (
    <Card className="shadow-elegant">
      <CardContent className="p-5 space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Round detail</div>
            <div className="font-display text-xl mt-1">
              {new Date(r.tee_time).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
              <Clock className="h-3.5 w-3.5" />
              Tee off {new Date(r.tee_time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          {r.game_type === "Tournament" ? (
            <Badge className="bg-gold text-gold-foreground border-0">Tournament</Badge>
          ) : (
            <Badge variant="secondary">{r.game_type ?? "Casual"}</Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Info label="Status" value={r.status} />
          <Info label="Game type" value={r.game_type ?? "Casual"} />
          {tournament && <Info label="Tournament" value={tournament.name} />}
          {tournament && <Info label="Format" value={tournament.format} />}
          <Info
            label="Playing partners"
            value={(r.partners ?? []).length > 0 ? (r.partners ?? []).join(", ") : `Solo (${r.players} player${r.players === 1 ? "" : "s"})`}
            icon={<Users className="h-3.5 w-3.5" />}
          />
        </div>

        {scorecard && scorecard.strokes && scorecard.pars ? (
          <ScorecardView
            strokes={scorecard.strokes}
            pars={scorecard.pars}
            total={scorecard.score}
          />
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No scorecard recorded for this round.{" "}
            <Link to="/golfer/scorecard" className="text-primary hover:underline">Add scorecard →</Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className="mt-1 font-medium break-words">{value}</div>
    </div>
  );
}

function ScorecardView({ strokes, pars, total }: { strokes: number[]; pars: number[]; total: number }) {
  const parTotal = pars.reduce((a, b) => a + b, 0);
  const diff = total - parTotal;
  const front = strokes.slice(0, 9);
  const back = strokes.slice(9, 18);
  const frontPar = pars.slice(0, 9);
  const backPar = pars.slice(9, 18);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm font-medium">Scorecard</div>
        <div className="text-sm">
          <span className="font-display text-xl tabular-nums">{total}</span>
          <span className="text-muted-foreground"> / par {parTotal} ({diff >= 0 ? "+" : ""}{diff})</span>
        </div>
      </div>
      <NineGrid label="Front 9" strokes={front} pars={frontPar} total={front.reduce((a, b) => a + b, 0)} parTotal={frontPar.reduce((a, b) => a + b, 0)} startHole={1} />
      <NineGrid label="Back 9" strokes={back} pars={backPar} total={back.reduce((a, b) => a + b, 0)} parTotal={backPar.reduce((a, b) => a + b, 0)} startHole={10} />
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground pt-1">
        <LegendChip className="ring-2 ring-offset-1 ring-gold bg-gold/20 rounded-full" label="Eagle or better" />
        <LegendChip className="border-2 border-destructive text-destructive rounded-full" label="Birdie" />
        <LegendChip className="border border-muted-foreground/40 rounded-sm" label="Par" />
        <LegendChip className="border-2 border-primary text-primary rounded-sm" label="Bogey" />
        <LegendChip className="border-2 border-destructive/70 rounded-sm ring-1 ring-destructive/40 ring-offset-1" label="Double+" />
      </div>
    </div>
  );
}

function NineGrid({ label, strokes, pars, total, parTotal, startHole }: {
  label: string; strokes: number[]; pars: number[]; total: number; parTotal: number; startHole: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</div>
        <div className="text-xs text-muted-foreground">{total} / par {parTotal}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-separate border-spacing-y-0.5 min-w-[320px]">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left font-medium pr-2 w-12">Hole</th>
              {strokes.map((_, i) => <th key={i} className="font-medium text-center w-9">{startHole + i}</th>)}
              <th className="text-center font-semibold pl-2 w-10">Σ</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-muted-foreground">
              <td className="pr-2">Par</td>
              {pars.map((p, i) => <td key={i} className="text-center">{p}</td>)}
              <td className="text-center font-medium pl-2">{parTotal}</td>
            </tr>
            <tr>
              <td className="pr-2 font-medium">Score</td>
              {strokes.map((s, i) => {
                const d = s - pars[i];
                const marker =
                  d <= -2 ? "ring-2 ring-offset-1 ring-gold text-gold-foreground bg-gold/20 rounded-full"
                  : d === -1 ? "border-2 border-destructive text-destructive rounded-full"
                  : d === 1 ? "border-2 border-primary text-primary rounded-sm"
                  : d >= 2 ? "border-2 border-destructive text-destructive rounded-sm ring-1 ring-offset-1 ring-destructive/60"
                  : "";
                return (
                  <td key={i} className="text-center px-1 py-1.5">
                    <span className={cn("inline-flex items-center justify-center min-w-6 h-6 px-1 font-medium tabular-nums", marker)}>{s}</span>
                  </td>
                );
              })}
              <td className="text-center font-display text-base pl-2">{total}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LegendChip({ className, label }: { className?: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-flex items-center justify-center w-5 h-5 text-[10px]", className)}>4</span>
      {label}
    </span>
  );
}
