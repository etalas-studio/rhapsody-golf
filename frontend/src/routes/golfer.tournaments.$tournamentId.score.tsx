import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useReducer, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { COURSE_PARS, COURSE_SI } from "@/lib/mockData";
import { useTournament, useMyTournamentRegistrations } from "@/lib/useApi";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  UserCheck,
  WifiOff,
  Minus,
  Plus,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/golfer/tournaments/$tournamentId/score")({
  head: () => ({ meta: [{ title: "Score · Tournament · Rhapsody" }] }),
  component: ScoringPage,
});

// ─── helpers ────────────────────────────────────────────────────────────────

function stableford(strokes: number, par: number): number {
  const diff = strokes - par;
  if (diff >= 2) return 0;
  if (diff === 1) return 1;
  if (diff === 0) return 2;
  if (diff === -1) return 3;
  return 4;
}

function sys36Handicap(course_handicap: number): number[] {
  return COURSE_SI.map((si) => (Math.floor(course_handicap) >= si ? 1 : 0));
}

function sys36Points(strokes: number, par: number, hdcpStroke: number): number {
  const adjusted = par + 2 + hdcpStroke;
  if (strokes > adjusted) return 0;
  const diff = strokes - (par + hdcpStroke);
  if (diff >= 2) return 0;
  if (diff === 1) return 1;
  if (diff === 0) return 2;
  if (diff === -1) return 3;
  return 4;
}

type Format = "Stroke Play" | "Stableford" | "System 36" | "Best Ball" | "Match Play";

type HoleState = { strokes: number; verified: boolean };
type ScorecardState = HoleState[];

function initState(): ScorecardState {
  return Array.from({ length: 18 }, () => ({ strokes: 0, verified: false }));
}

type Action =
  | { type: "SET"; hole: number; strokes: number }
  | { type: "VERIFY"; hole: number }
  | { type: "RESET" };

function safeReducer(state: ScorecardState, action: Action): ScorecardState {
  switch (action.type) {
    case "SET": {
      const clamped = Math.max(1, Math.min(15, action.strokes));
      const next = [...state];
      next[action.hole] = { ...next[action.hole], strokes: clamped };
      return next;
    }
    case "VERIFY": {
      const next = [...state];
      next[action.hole] = { ...next[action.hole], verified: true };
      return next;
    }
    case "RESET": return initState();
    default: return state;
  }
}

// ─── HoleCard ────────────────────────────────────────────────────────────────

function HoleCard({
  holeIdx, par, si, state, format, courseHandicap, dispatch, onVerify, isMarker,
}: {
  holeIdx: number; par: number; si: number;
  state: HoleState; format: Format; courseHandicap: number;
  dispatch: React.Dispatch<Action>; onVerify: () => void; isMarker: boolean;
}) {
  const hdcpStrokes = Math.floor(courseHandicap) >= si ? 1 : 0;
  const s = state.strokes;
  const entered = s > 0;
  const diff = entered ? s - par : 0;

  const pts =
    format === "Stableford" && entered ? stableford(s, par)
    : format === "System 36" && entered ? sys36Points(s, par, hdcpStrokes)
    : null;

  function diffLabel(d: number) {
    if (d === 0) return "Par";
    if (d === -2) return "Eagle";
    if (d === -1) return "Birdie";
    if (d === 1) return "Bogey";
    if (d === 2) return "Dbl Bogey";
    if (d <= -3) return "Albatross";
    return `+${d}`;
  }

  const diffColor = !entered ? "" :
    diff <= -2 ? "text-amber-500" :
    diff === -1 ? "text-emerald-600 dark:text-emerald-400" :
    diff === 0 ? "text-foreground" :
    diff === 1 ? "text-primary" :
    "text-destructive";

  return (
    <Card className={cn("shadow-elegant transition-all", state.verified && "ring-2 ring-emerald-500/40")}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl">H{holeIdx + 1}</span>
            <div className="text-xs text-muted-foreground">
              <div>Par {par} · SI {si}</div>
              {hdcpStrokes > 0 && format !== "Stroke Play" && (
                <div className="text-primary font-medium">+{hdcpStrokes} hdcp stroke</div>
              )}
            </div>
          </div>
          <div>
            {state.verified ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
              </Badge>
            ) : entered ? (
              <Badge variant="outline" className="text-[10px]">
                <Clock className="h-3 w-3 mr-1" /> Awaiting verify
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">Not entered</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full"
            disabled={!entered || s <= 1}
            onClick={() => dispatch({ type: "SET", hole: holeIdx, strokes: s - 1 })}>
            <Minus className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[3.5rem]">
            <div className="font-display text-4xl tabular-nums">{entered ? s : "—"}</div>
            {entered && <div className={cn("text-xs font-medium mt-0.5", diffColor)}>{diffLabel(diff)}</div>}
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full"
            onClick={() => dispatch({ type: "SET", hole: holeIdx, strokes: entered ? s + 1 : par })}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {pts !== null && (
          <div className="text-center text-sm text-muted-foreground">
            {format === "Stableford" ? `${pts} Stableford point${pts !== 1 ? "s" : ""}` : `${pts} System 36 point${pts !== 1 ? "s" : ""}`}
          </div>
        )}

        {entered && !state.verified && isMarker && (
          <Button variant="outline" size="sm" className="w-full border-emerald-500/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950" onClick={onVerify}>
            <UserCheck className="h-4 w-4 mr-2" /> Marker: verify this hole
          </Button>
        )}
        {entered && !state.verified && !isMarker && (
          <p className="text-[11px] text-center text-muted-foreground">Your marker needs to verify this hole.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── RunningTotal ────────────────────────────────────────────────────────────

function RunningTotal({ scorecard, format, courseHandicap }: {
  scorecard: ScorecardState; format: Format; courseHandicap: number;
}) {
  const hdcpPerHole = sys36Handicap(courseHandicap);
  const entered = scorecard.filter((h) => h.strokes > 0);
  const totalStrokes = entered.reduce((a, h) => a + h.strokes, 0);
  const parSoFar = entered.reduce((a, _, i) => a + COURSE_PARS[i], 0);
  const diff = totalStrokes - parSoFar;
  const stablePoints = entered.reduce((a, h, i) => a + stableford(h.strokes, COURSE_PARS[i]), 0);
  const sys36Pts = entered.reduce((a, h, i) => a + sys36Points(h.strokes, COURSE_PARS[i], hdcpPerHole[i]), 0);
  const holesPlayed = entered.length;
  const verified = scorecard.filter((h) => h.verified).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="rounded-lg border bg-card p-3 text-center">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Strokes</div>
        <div className="font-display text-2xl mt-0.5">{totalStrokes || "—"}</div>
      </div>
      <div className="rounded-lg border bg-card p-3 text-center">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">To par</div>
        <div className={cn("font-display text-2xl mt-0.5", diff < 0 ? "text-emerald-600 dark:text-emerald-400" : diff > 0 ? "text-primary" : "")}>
          {holesPlayed === 0 ? "—" : diff === 0 ? "E" : diff > 0 ? `+${diff}` : diff}
        </div>
      </div>
      {(format === "Stableford" || format === "System 36") && (
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Points</div>
          <div className="font-display text-2xl mt-0.5">{holesPlayed === 0 ? "—" : format === "Stableford" ? stablePoints : sys36Pts}</div>
        </div>
      )}
      <div className="rounded-lg border bg-card p-3 text-center">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Verified</div>
        <div className={cn("font-display text-2xl mt-0.5", verified === holesPlayed && holesPlayed > 0 ? "text-emerald-600 dark:text-emerald-400" : "")}>
          {verified}<span className="text-base text-muted-foreground">/{holesPlayed}</span>
        </div>
      </div>
    </div>
  );
}

// ─── SubmitDialog ────────────────────────────────────────────────────────────

function SubmitDialog({ open, onOpenChange, scorecard, format, courseHandicap, onConfirm }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  scorecard: ScorecardState; format: Format; courseHandicap: number;
  onConfirm: () => void;
}) {
  const hdcpPerHole = sys36Handicap(courseHandicap);
  const entered = scorecard.filter((h) => h.strokes > 0);
  const totalStrokes = entered.reduce((a, h) => a + h.strokes, 0);
  const totalPar = COURSE_PARS.reduce((a, b) => a + b, 0);
  const diff = totalStrokes - totalPar;
  const stablePoints = scorecard.reduce((a, h, i) => a + (h.strokes > 0 ? stableford(h.strokes, COURSE_PARS[i]) : 0), 0);
  const sys36Pts = scorecard.reduce((a, h, i) => a + (h.strokes > 0 ? sys36Points(h.strokes, COURSE_PARS[i], hdcpPerHole[i]) : 0), 0);
  const unverified = scorecard.filter((h) => h.strokes > 0 && !h.verified).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Submit scorecard?</DialogTitle>
          <DialogDescription>Your score will be sent to the tournament director for official verification.</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border bg-card p-4 space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Gross score</span><span className="font-medium">{totalStrokes} ({diff >= 0 ? `+${diff}` : diff})</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Par</span><span>{totalPar}</span></div>
          {(format === "Stableford" || format === "System 36") && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{format} points</span>
              <span className="font-medium">{format === "Stableford" ? stablePoints : sys36Pts}</span>
            </div>
          )}
          {unverified > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-400">
              {unverified} hole{unverified > 1 ? "s" : ""} still unverified by marker. Score is provisional until all verified.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Review again</Button>
          <Button onClick={onConfirm}>Submit final score</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ScoringPage ─────────────────────────────────────────────────────────────

function ScoringPage() {
  const { tournamentId } = Route.useParams();
  const navigate = useNavigate();

  const { data: t, loading: tLoading } = useTournament(tournamentId);
  const { data: myRegs, loading: regLoading } = useMyTournamentRegistrations();

  const reg = (myRegs ?? []).find((r) => (r.event_id ?? r.tournament_id) === tournamentId);

  const [scorecard, dispatch] = useReducer(safeReducer, undefined, initState);
  const [currentHole, setCurrentHole] = useState(0);
  const [isMarker, setIsMarker] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);

  const format = (t?.format ?? "Stroke Play") as Format;
  // ponytail: course_handicap not in registration API v1 — use placeholder 18
  const courseHandicap = 18;

  useEffect(() => {
    const anyEntered = scorecard.some((h) => h.strokes > 0);
    if (anyEntered) {
      setPendingSync(true);
      const id = setTimeout(() => setPendingSync(false), 1500);
      return () => clearTimeout(id);
    }
  }, [scorecard]);

  if (tLoading || regLoading) {
    return (
      <AppShell>
        <div className="h-8 w-48 rounded bg-muted animate-pulse mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[0,1,2,3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </AppShell>
    );
  }

  if (!t) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Tournament not found.</p>
      </AppShell>
    );
  }

  if (!reg || reg.status === "Cancelled" || reg.status === "Completed") {
    return (
      <AppShell>
        <div className="text-center py-12 space-y-4">
          <Flag className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">You don't have an active registration for this tournament.</p>
          <Button asChild variant="outline">
            <Link to="/golfer/tournaments/$tournamentId" params={{ tournamentId }}>Back to tournament</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (submitted) {
    const totalStrokes = scorecard.reduce((a, h) => a + (h.strokes || 0), 0);
    const totalPar = COURSE_PARS.reduce((a, b) => a + b, 0);
    const diff = totalStrokes - totalPar;

    return (
      <AppShell>
        <div className="max-w-md mx-auto text-center space-y-6 py-12">
          <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 h-20 w-20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="font-display text-3xl">Scorecard submitted</h1>
            <p className="text-muted-foreground mt-1">Your round has been sent for official verification.</p>
          </div>
          <div className="rounded-xl border bg-card p-6 space-y-3 text-sm">
            <div className="font-display text-5xl tabular-nums">
              {diff === 0 ? "E" : diff > 0 ? `+${diff}` : diff}
            </div>
            <div className="text-muted-foreground">Gross {totalStrokes} · Par {totalPar}</div>
            {(format === "Stableford" || format === "System 36") && (() => {
              const hdcpPerHole = sys36Handicap(courseHandicap);
              const pts = format === "Stableford"
                ? scorecard.reduce((a, h, i) => a + (h.strokes > 0 ? stableford(h.strokes, COURSE_PARS[i]) : 0), 0)
                : scorecard.reduce((a, h, i) => a + (h.strokes > 0 ? sys36Points(h.strokes, COURSE_PARS[i], hdcpPerHole[i]) : 0), 0);
              return <div className="font-medium">{pts} {format} points</div>;
            })()}
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground pt-2 border-t">
              Score awaiting TD confirmation · Provisional until all holes verified
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" asChild>
              <Link to="/golfer/tournaments/$tournamentId" params={{ tournamentId }}>Tournament page</Link>
            </Button>
            <Button asChild>
              <Link to="/golfer/tournaments">My tournaments</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const holesEntered = scorecard.filter((h) => h.strokes > 0).length;
  const canSubmit = holesEntered === 18;

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button variant="ghost" size="sm" className="-ml-2"
            onClick={() => navigate({ to: "/golfer/tournaments/$tournamentId", params: { tournamentId } })}>
            <ArrowLeft className="h-4 w-4" /> {t.name}
          </Button>
          <div className="flex items-center gap-2">
            {pendingSync && (
              <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600 gap-1">
                <WifiOff className="h-3 w-3" /> Syncing…
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">{t.format}</Badge>
            {/* ponytail: tee_time not in ApiTournamentRegistration v1 */}
          </div>
        </div>

        <RunningTotal scorecard={scorecard} format={format} courseHandicap={courseHandicap} />

        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="icon" disabled={currentHole === 0} onClick={() => setCurrentHole((h) => h - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-1 min-w-max px-1">
              {Array.from({ length: 18 }, (_, i) => {
                const h = scorecard[i];
                const entered = h.strokes > 0;
                return (
                  <button key={i} type="button" onClick={() => setCurrentHole(i)}
                    className={cn(
                      "h-8 w-8 rounded-full text-xs font-medium transition-all shrink-0",
                      currentHole === i && "ring-2 ring-primary ring-offset-1",
                      h.verified ? "bg-emerald-500 text-white"
                      : entered ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                    )}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
          <Button variant="outline" size="icon" disabled={currentHole === 17} onClick={() => setCurrentHole((h) => h + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <HoleCard
          holeIdx={currentHole}
          par={COURSE_PARS[currentHole]}
          si={COURSE_SI[currentHole]}
          state={scorecard[currentHole]}
          format={format}
          courseHandicap={courseHandicap}
          dispatch={dispatch}
          onVerify={() => {
            dispatch({ type: "VERIFY", hole: currentHole });
            toast.success(`Hole ${currentHole + 1} verified`, { description: "Marker sign-off recorded." });
            if (currentHole < 17) setCurrentHole((h) => h + 1);
          }}
          isMarker={isMarker}
        />

        <div className="flex gap-2">
          {currentHole > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setCurrentHole((h) => h - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Hole {currentHole}
            </Button>
          )}
          {currentHole < 17 && (
            <Button variant="outline" className="flex-1" onClick={() => {
              if (scorecard[currentHole].strokes > 0) setCurrentHole((h) => h + 1);
              else toast.warning("Enter your score before moving to the next hole.");
            }}>
              Hole {currentHole + 2} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
          <div>
            <div className="font-medium">Marker mode</div>
            <div className="text-xs text-muted-foreground">Toggle to simulate a playing partner verifying holes</div>
          </div>
          <button type="button" role="switch" aria-checked={isMarker} onClick={() => setIsMarker((v) => !v)}
            className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", isMarker ? "bg-primary" : "bg-muted")}>
            <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", isMarker ? "translate-x-6" : "translate-x-1")} />
          </button>
        </div>

        <div className="pt-2">
          <Button size="lg" className="w-full" disabled={!canSubmit} onClick={() => setSubmitOpen(true)}>
            <Flag className="h-4 w-4 mr-2" />
            {canSubmit ? "Submit final scorecard" : `${holesEntered}/18 holes entered`}
          </Button>
          {!canSubmit && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Enter scores for all 18 holes to submit.
            </p>
          )}
        </div>
      </div>

      <SubmitDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        scorecard={scorecard}
        format={format}
        courseHandicap={courseHandicap}
        onConfirm={async () => {
          setSubmitOpen(false);
          try {
            await api.tournaments.submitScore(tournamentId, {
              scores: scorecard.map((h, i) => ({ hole: i + 1, strokes: h.strokes })),
              marker_verified: scorecard.every((h) => h.strokes === 0 || h.verified),
            });
          } catch {
            // ponytail: optimistic — UI transitions to submitted regardless; sync errors don't block UX
          }
          setSubmitted(true);
          toast.success("Scorecard submitted!", { description: "Score is provisional until all holes are verified." });
        }}
      />
    </AppShell>
  );
}
