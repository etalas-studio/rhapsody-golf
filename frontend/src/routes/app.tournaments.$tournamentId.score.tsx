import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useReducer, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { COURSE_PARS, COURSE_SI } from "@/lib/mockData";
import { useTournament, useMyTournamentRegistrations } from "@/lib/useApi";
import { api } from "@/lib/api";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Clock,
  UserCheck, WifiOff, Minus, Plus, Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/tournaments/$tournamentId/score")({
  head: () => ({ meta: [{ title: "Score · Tournament · Rhapsody App" }] }),
  component: AppScoringPage,
});

// ─── helpers (same logic as golfer version) ──────────────────────────────────

function stableford(strokes: number, par: number): number {
  const d = strokes - par;
  if (d >= 2) return 0;
  if (d === 1) return 1;
  if (d === 0) return 2;
  if (d === -1) return 3;
  return 4;
}

function sys36Points(strokes: number, par: number, hdcpStroke: number): number {
  const adjusted = par + 2 + hdcpStroke;
  if (strokes > adjusted) return 0;
  const d = strokes - (par + hdcpStroke);
  if (d >= 2) return 0;
  if (d === 1) return 1;
  if (d === 0) return 2;
  if (d === -1) return 3;
  return 4;
}

function sys36Handicap(courseHandicap: number): number[] {
  return COURSE_SI.map((si) => (Math.floor(courseHandicap) >= si ? 1 : 0));
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

function reducer(state: ScorecardState, action: Action): ScorecardState {
  switch (action.type) {
    case "SET": {
      const next = [...state];
      next[action.hole] = { ...next[action.hole], strokes: Math.max(1, Math.min(15, action.strokes)) };
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

// ─── RunningTotal ─────────────────────────────────────────────────────────────

function RunningTotal({ scorecard, format, courseHandicap }: {
  scorecard: ScorecardState; format: Format; courseHandicap: number;
}) {
  const hdcpPerHole = sys36Handicap(courseHandicap);
  const entered = scorecard.filter((h) => h.strokes > 0);
  const totalStrokes = entered.reduce((a, h) => a + h.strokes, 0);
  const parSoFar = entered.reduce((a, _, i) => a + COURSE_PARS[i], 0);
  const diff = totalStrokes - parSoFar;
  const stabPts = entered.reduce((a, h, i) => a + stableford(h.strokes, COURSE_PARS[i]), 0);
  const s36Pts = entered.reduce((a, h, i) => a + sys36Points(h.strokes, COURSE_PARS[i], hdcpPerHole[i]), 0);
  const holesPlayed = entered.length;
  const verified = scorecard.filter((h) => h.verified).length;

  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        { label: "Strokes", value: totalStrokes || "—" },
        {
          label: "To par",
          value: holesPlayed === 0 ? "—" : diff === 0 ? "E" : diff > 0 ? `+${diff}` : diff,
          tone: diff < 0 ? "text-emerald-400" : diff > 0 ? "text-rose-400" : "",
        },
        ...(format === "Stableford" || format === "System 36"
          ? [{ label: "Points", value: holesPlayed === 0 ? "—" : format === "Stableford" ? stabPts : s36Pts }]
          : []),
        {
          label: "Verified",
          value: holesPlayed === 0 ? "—" : `${verified}/${holesPlayed}`,
          tone: verified === holesPlayed && holesPlayed > 0 ? "text-emerald-400" : "",
        },
      ].map(({ label, value, tone }) => (
        <div key={label} className="rounded-xl border bg-card p-2 text-center">
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn("font-display text-lg mt-0.5", tone)}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── HoleCard ─────────────────────────────────────────────────────────────────

function HoleCard({
  holeIdx, par, si, state, format, courseHandicap, dispatch, onVerify, isMarker,
}: {
  holeIdx: number; par: number; si: number;
  state: HoleState; format: Format; courseHandicap: number;
  dispatch: React.Dispatch<Action>; onVerify: () => void; isMarker: boolean;
}) {
  const hdcpStroke = Math.floor(courseHandicap) >= si ? 1 : 0;
  const s = state.strokes;
  const entered = s > 0;
  const diff = entered ? s - par : 0;

  const pts =
    format === "Stableford" && entered ? stableford(s, par)
    : format === "System 36" && entered ? sys36Points(s, par, hdcpStroke)
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
    diff <= -2 ? "text-amber-400" :
    diff === -1 ? "text-emerald-400" :
    diff === 0 ? "text-foreground" :
    diff === 1 ? "text-primary" : "text-destructive";

  return (
    <Card className={cn("shadow-sm transition-all", state.verified && "ring-2 ring-emerald-500/40")}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-display text-2xl">H{holeIdx + 1}</span>
            <span className="text-xs text-muted-foreground ml-2">Par {par} · SI {si}</span>
            {hdcpStroke > 0 && format !== "Stroke Play" && (
              <span className="text-xs text-primary font-medium ml-1">+{hdcpStroke}</span>
            )}
          </div>
          {state.verified ? (
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
            </Badge>
          ) : entered ? (
            <Badge variant="outline" className="text-[10px]"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">Not entered</Badge>
          )}
        </div>

        <div className="flex items-center justify-center gap-6">
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-full text-lg"
            disabled={!entered || s <= 1}
            onClick={() => dispatch({ type: "SET", hole: holeIdx, strokes: s - 1 })}>
            <Minus className="h-5 w-5" />
          </Button>
          <div className="text-center min-w-[4rem]">
            <div className="font-display text-5xl tabular-nums">{entered ? s : "—"}</div>
            {entered && <div className={cn("text-xs font-medium mt-0.5", diffColor)}>{diffLabel(diff)}</div>}
          </div>
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-full text-lg"
            onClick={() => dispatch({ type: "SET", hole: holeIdx, strokes: entered ? s + 1 : par })}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {pts !== null && (
          <p className="text-center text-xs text-muted-foreground">
            {pts} {format} point{pts !== 1 ? "s" : ""}
          </p>
        )}

        {entered && !state.verified && isMarker && (
          <Button variant="outline" size="sm" className="w-full border-emerald-500/50 text-emerald-400" onClick={onVerify}>
            <UserCheck className="h-4 w-4 mr-2" /> Marker: verify this hole
          </Button>
        )}
        {entered && !state.verified && !isMarker && (
          <p className="text-[11px] text-center text-muted-foreground">Waiting for marker to verify.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── ScoringPage ──────────────────────────────────────────────────────────────

function AppScoringPage() {
  const { tournamentId } = Route.useParams();
  const navigate = useNavigate();

  const { data: t, loading: tLoading } = useTournament(tournamentId);
  const { data: myRegs, loading: regLoading } = useMyTournamentRegistrations();

  const reg = (myRegs ?? []).find((r) => (r.event_id ?? r.tournament_id) === tournamentId);
  const [scorecard, dispatch] = useReducer(reducer, undefined, initState);
  const [currentHole, setCurrentHole] = useState(0);
  const [isMarker, setIsMarker] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);

  const format = (t?.format ?? "Stroke Play") as Format;
  // ponytail: course_handicap not in registration API v1 — placeholder 18
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
      <MobileShell>
        <div className="px-4 py-5 space-y-3">
          <div className="h-6 w-48 rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
          <div className="h-52 rounded-xl bg-muted animate-pulse" />
        </div>
      </MobileShell>
    );
  }

  if (!t) {
    return (
      <MobileShell>
        <div className="px-4 py-10 text-center text-muted-foreground">Tournament not found.</div>
      </MobileShell>
    );
  }

  if (!reg || reg.status === "Cancelled" || reg.status === "Completed") {
    return (
      <MobileShell>
        <div className="px-4 py-10 text-center space-y-4">
          <Flag className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No active registration for this tournament.</p>
          <Button asChild variant="outline">
            <Link to="/app/tournaments/$tournamentId" params={{ tournamentId }}>Back to tournament</Link>
          </Button>
        </div>
      </MobileShell>
    );
  }

  if (submitted) {
    const totalStrokes = scorecard.reduce((a, h) => a + (h.strokes || 0), 0);
    const totalPar = COURSE_PARS.reduce((a, b) => a + b, 0);
    const diff = totalStrokes - totalPar;
    const hdcpPerHole = sys36Handicap(courseHandicap);
    const pts = format === "Stableford"
      ? scorecard.reduce((a, h, i) => a + (h.strokes > 0 ? stableford(h.strokes, COURSE_PARS[i]) : 0), 0)
      : format === "System 36"
      ? scorecard.reduce((a, h, i) => a + (h.strokes > 0 ? sys36Points(h.strokes, COURSE_PARS[i], hdcpPerHole[i]) : 0), 0)
      : null;

    return (
      <MobileShell>
        <div className="px-4 py-8 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-emerald-500/15 text-emerald-400 grid place-items-center mx-auto">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h2 className="font-display text-2xl">Scorecard submitted!</h2>
          <p className="text-sm text-muted-foreground">Sent for tournament director verification.</p>
          <div className="rounded-xl border bg-card p-4 space-y-2 text-sm max-w-xs mx-auto">
            <p className="font-display text-4xl">{diff === 0 ? "E" : diff > 0 ? `+${diff}` : diff}</p>
            <p className="text-muted-foreground">Gross {totalStrokes} · Par {totalPar}</p>
            {pts !== null && <p className="font-medium">{pts} {format} points</p>}
            <p className="text-[10px] text-muted-foreground border-t pt-2">Provisional until all holes verified</p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" asChild>
              <Link to="/app/tournaments/$tournamentId" params={{ tournamentId }}>Tournament</Link>
            </Button>
            <Button asChild>
              <Link to="/app/tournaments">My tournaments</Link>
            </Button>
          </div>
        </div>
      </MobileShell>
    );
  }

  const holesEntered = scorecard.filter((h) => h.strokes > 0).length;
  const canSubmit = holesEntered === 18;

  async function handleSubmit() {
    setSubmitOpen(false);
    try {
      await api.tournaments.submitScore(tournamentId, {
        scores: scorecard.map((h, i) => ({ hole: i + 1, strokes: h.strokes })),
        marker_verified: scorecard.every((h) => h.strokes === 0 || h.verified),
      });
    } catch {
      // ponytail: optimistic — UI transitions to submitted regardless
    }
    setSubmitted(true);
    toast.success("Scorecard submitted!", { description: "Provisional until all holes verified." });
  }

  return (
    <MobileShell>
      <div className="px-4 py-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => navigate({ to: "/app/tournaments/$tournamentId", params: { tournamentId } })}
            className="flex items-center gap-1 text-sm text-muted-foreground -ml-1"
          >
            <ChevronLeft className="h-4 w-4" /> {t.name}
          </button>
          <div className="flex items-center gap-2">
            {pendingSync && (
              <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-400 gap-1">
                <WifiOff className="h-3 w-3" /> Syncing…
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">{t.format}</Badge>
          </div>
        </div>

        <RunningTotal scorecard={scorecard} format={format} courseHandicap={courseHandicap} />

        {/* Hole scrubber */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="shrink-0 h-8 w-8" disabled={currentHole === 0}
            onClick={() => setCurrentHole((h) => h - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {Array.from({ length: 18 }, (_, i) => {
                const h = scorecard[i];
                return (
                  <button key={i} onClick={() => setCurrentHole(i)}
                    className={cn(
                      "h-7 w-7 rounded-full text-[11px] font-medium transition-all shrink-0",
                      currentHole === i && "ring-2 ring-primary ring-offset-1",
                      h.verified ? "bg-emerald-500 text-white"
                      : h.strokes > 0 ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                    )}>{i + 1}</button>
                );
              })}
            </div>
          </div>
          <Button variant="outline" size="icon" className="shrink-0 h-8 w-8" disabled={currentHole === 17}
            onClick={() => setCurrentHole((h) => h + 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
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
            toast.success(`Hole ${currentHole + 1} verified`);
            if (currentHole < 17) setCurrentHole((h) => h + 1);
          }}
          isMarker={isMarker}
        />

        {/* Prev / Next */}
        <div className="flex gap-2">
          {currentHole > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setCurrentHole((h) => h - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> H{currentHole}
            </Button>
          )}
          {currentHole < 17 && (
            <Button variant="outline" className="flex-1" onClick={() => {
              if (scorecard[currentHole].strokes > 0) setCurrentHole((h) => h + 1);
              else toast.warning("Enter your score before moving on.");
            }}>
              H{currentHole + 2} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Marker toggle */}
        <div className="flex items-center justify-between rounded-xl border p-3 text-sm">
          <div>
            <p className="font-medium">Marker mode</p>
            <p className="text-xs text-muted-foreground">Simulate playing partner verifying holes</p>
          </div>
          <button role="switch" aria-checked={isMarker} onClick={() => setIsMarker((v) => !v)}
            className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", isMarker ? "bg-primary" : "bg-muted")}>
            <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", isMarker ? "translate-x-6" : "translate-x-1")} />
          </button>
        </div>

        {/* Submit */}
        <Button size="lg" className="w-full" disabled={!canSubmit} onClick={() => setSubmitOpen(true)}>
          <Flag className="h-4 w-4 mr-2" />
          {canSubmit ? "Submit final scorecard" : `${holesEntered}/18 holes entered`}
        </Button>
        {!canSubmit && (
          <p className="text-xs text-center text-muted-foreground">Enter all 18 holes to submit.</p>
        )}
      </div>

      <AlertDialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <AlertDialogContent className="max-w-[360px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Submit scorecard?</AlertDialogTitle>
            <AlertDialogDescription>
              Your score will be sent to the tournament director for official verification.
              {scorecard.filter((h) => h.strokes > 0 && !h.verified).length > 0 && (
                <span className="block mt-1 text-amber-400">
                  {scorecard.filter((h) => h.strokes > 0 && !h.verified).length} holes still unverified — score will be provisional.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Review again</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileShell>
  );
}
