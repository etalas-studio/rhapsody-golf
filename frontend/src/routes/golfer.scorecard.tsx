import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
// ponytail: currentUser auth stub — replace with supabase.auth.getSession() in Phase 1
import { currentUser, COURSE_PARS, formatHandicap, handicapCategory, type Scorecard } from "@/lib/mockData";
import { useClubs, useScorecards } from "@/lib/useApi";
import { api } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, ClipboardList, ArrowLeft, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/golfer/scorecard")({
  head: () => ({ meta: [{ title: "Scorecard · Rhapsody" }] }),
  component: ScorePage,
});

type Mode = "view" | "new";

function ScorePage() {
  const { data: apiCards, loading: cardsLoading } = useScorecards();
  const { data: clubs } = useClubs();

  const apiList = apiCards?.scorecards ?? [];
  // Map ApiScorecard → local Scorecard shape for display
  const mapped: Scorecard[] = apiList.map((c) => ({
    id: c.id,
    club_id: c.club_id,
    user_id: currentUser.id,
    date: c.played_at.slice(0, 10),
    score: c.gross,
    course_name: c.club_name ?? c.club_id,
    strokes: c.holes.map((h) => h.strokes),
    pars: c.holes.map((h) => h.par),
  }));

  const [localList, setLocalList] = useState<Scorecard[]>([]);
  const list = [...localList, ...mapped].sort((a, b) => b.date.localeCompare(a.date));

  const [mode, setMode] = useState<Mode>("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const clubList = clubs ?? [];
  const [clubId, setClubId] = useState(clubList[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [strokes, setStrokes] = useState<number[]>([...COURSE_PARS]);
  const total = strokes.reduce((a, b) => a + b, 0);
  const parTotal = COURSE_PARS.reduce((a, b) => a + b, 0);

  const selected = list.find((c) => c.id === selectedId) ?? null;

  async function save() {
    const courseNameFound = clubList.find((c) => c.id === clubId)?.name ?? clubId;
    const card: Scorecard = {
      id: `s-${Date.now()}`,
      club_id: clubId,
      user_id: currentUser.id,
      date,
      score: total,
      course_name: courseNameFound,
      strokes: [...strokes],
      pars: [...COURSE_PARS],
    };
    setLocalList((prev) => [card, ...prev]);
    setSelectedId(card.id);
    setStrokes([...COURSE_PARS]);
    setMode("view");
    setMobileDetailOpen(true);
    toast.success("Scorecard saved");
    try {
      await api.scorecards.save({
        club_id: clubId,
        played_at: date,
        holes: strokes.map((s, i) => ({ hole: i + 1, par: COURSE_PARS[i], strokes: s })),
      });
    } catch {
      // ponytail: optimistic update stays in localList; API failure just won't persist server-side
    }
  }

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title="Scorecard & Handicap" subtitle="Track every round, hole by hole — your Handicap Index updates automatically." />
        {mode === "view" ? (
          <Button onClick={() => setMode("new")} className="gap-2">
            <Plus className="h-4 w-4" /> New score
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setMode("view")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to history
          </Button>
        )}
      </div>

      {mode === "view" && (
        cardsLoading
          ? <Skeleton className="h-28 rounded-xl mb-4" />
          : <HandicapCard cards={list} />
      )}

      {mode === "new" ? (
        <NewRoundForm
          clubId={clubId} setClubId={setClubId}
          clubs={clubList}
          date={date} setDate={setDate}
          strokes={strokes} setStrokes={setStrokes}
          total={total} parTotal={parTotal}
          onSave={save}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <Card className={cn("shadow-elegant lg:block", mobileDetailOpen ? "hidden" : "block")}>
            <CardHeader className="pb-3"><CardTitle className="text-base">Score history</CardTitle></CardHeader>
            <CardContent className="p-2">
              {cardsLoading ? (
                <div className="space-y-2 p-2">
                  {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
                </div>
              ) : list.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No scorecards yet.</div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {list.map((s) => {
                    const par = s.pars.reduce((a, b) => a + b, 0);
                    const diff = s.score - par;
                    const isActive = s.id === selectedId;
                    return (
                      <li key={s.id}>
                        <button
                          onClick={() => { setSelectedId(s.id); setMobileDetailOpen(true); }}
                          className={cn(
                            "w-full text-left rounded-lg px-3 py-2.5 transition-colors flex items-center justify-between gap-3",
                            isActive ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/60 border border-transparent",
                          )}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{s.course_name}</div>
                            <div className="text-xs text-muted-foreground">{s.date}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-display text-xl leading-none">{s.score}</div>
                            <DiffBadge diff={diff} compact />
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className={cn("lg:block", mobileDetailOpen ? "block" : "hidden")}>
            {selected && (() => {
              const idx = list.findIndex((c) => c.id === selected.id);
              const prev = idx > 0 ? list[idx - 1] : null;
              const next = idx < list.length - 1 ? list[idx + 1] : null;
              return (
                <div className="lg:hidden mb-3 flex items-center justify-between gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setMobileDetailOpen(false)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> All rounds
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={!prev} onClick={() => prev && setSelectedId(prev.id)} className="gap-1">
                      <ChevronLeft className="h-4 w-4" /> Newer
                    </Button>
                    <span className="text-xs text-muted-foreground px-1 tabular-nums">{idx + 1}/{list.length}</span>
                    <Button variant="outline" size="sm" disabled={!next} onClick={() => next && setSelectedId(next.id)} className="gap-1">
                      Older <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })()}
            {selected ? (
              <ScorecardDetail card={selected} />
            ) : (
              <Card className="shadow-elegant">
                <CardContent className="p-10 text-center text-sm text-muted-foreground">
                  Select a round to view its scorecard, or log a new one.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function DiffBadge({ diff, compact = false }: { diff: number; compact?: boolean }) {
  const label = diff === 0 ? "E" : diff > 0 ? `+${diff}` : `${diff}`;
  const Icon = diff === 0 ? Minus : diff > 0 ? TrendingUp : TrendingDown;
  const tone =
    diff < 0 ? "text-emerald-600 bg-emerald-500/10" :
    diff > 0 ? "text-rose-600 bg-rose-500/10" :
    "text-muted-foreground bg-muted";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full font-medium", compact ? "text-[10px] px-1.5 py-0.5 mt-0.5" : "text-xs px-2 py-0.5", tone)}>
      <Icon className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {label}
    </span>
  );
}

function holeTone(stroke: number, par: number) {
  const d = stroke - par;
  if (d <= -2) return "bg-amber-100 text-amber-900 ring-1 ring-amber-400";
  if (d === -1) return "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-400";
  if (d === 0) return "bg-card text-foreground";
  if (d === 1) return "bg-rose-50 text-rose-700";
  return "bg-rose-100 text-rose-800 ring-1 ring-rose-300";
}

function ScorecardDetail({ card }: { card: Scorecard }) {
  const front = card.strokes.slice(0, 9);
  const back = card.strokes.slice(9, 18);
  const parFront = card.pars.slice(0, 9);
  const parBack = card.pars.slice(9, 18);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const totalPar = sum(card.pars);
  const diff = card.score - totalPar;
  const playingHcp = Math.round(currentUser.handicap_index);
  const net = card.score - playingHcp;

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>{card.course_name}</CardTitle>
            <div className="text-sm text-muted-foreground mt-1">{card.date} · 18 holes</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</div>
              <div className="font-display text-3xl leading-none text-primary">{card.score}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Par</div>
              <div className="font-display text-3xl leading-none">{totalPar}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">To par</div>
              <DiffBadge diff={diff} />
            </div>
            <div className="text-right pl-3 border-l">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Net (HCP {playingHcp})</div>
              <div className="font-display text-3xl leading-none">{net}</div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <NineHoleTable label="Front 9" strokes={front} pars={parFront} startHole={1} />
        <NineHoleTable label="Back 9" strokes={back} pars={parBack} startHole={10} />
        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground pt-1">
          <Legend swatch="bg-amber-100 ring-1 ring-amber-400" label="Eagle or better" />
          <Legend swatch="bg-emerald-100 ring-1 ring-emerald-400" label="Birdie" />
          <Legend swatch="bg-card border" label="Par" />
          <Legend swatch="bg-rose-50" label="Bogey" />
          <Legend swatch="bg-rose-100 ring-1 ring-rose-300" label="Double+" />
        </div>
      </CardContent>
    </Card>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded", swatch)} /> {label}
    </span>
  );
}

function NineHoleTable({ label, strokes, pars, startHole }: { label: string; strokes: number[]; pars: number[]; startHole: number }) {
  const sumS = strokes.reduce((a, b) => a + b, 0);
  const sumP = pars.reduce((a, b) => a + b, 0);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{sumS}</span> / par {sumP}</div>
      </div>
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-xs border-separate border-spacing-y-1 min-w-[420px]">
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
              <td className="text-center font-medium pl-2">{sumP}</td>
            </tr>
            <tr>
              <td className="pr-2 font-medium">Score</td>
              {strokes.map((s, i) => (
                <td key={i} className="text-center p-0.5">
                  <span className={cn("inline-flex items-center justify-center h-7 w-7 rounded-md font-semibold text-sm", holeTone(s, pars[i]))}>{s}</span>
                </td>
              ))}
              <td className="text-center font-display text-base pl-2">{sumS}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewRoundForm({
  clubId, setClubId, clubs, date, setDate, strokes, setStrokes, total, parTotal, onSave,
}: {
  clubId: string; setClubId: (v: string) => void;
  clubs: { id: string; name: string }[];
  date: string; setDate: (v: string) => void;
  strokes: number[]; setStrokes: (v: number[]) => void;
  total: number; parTotal: number; onSave: () => void;
}) {
  const diff = total - parTotal;
  return (
    <Card className="shadow-elegant max-w-3xl">
      <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> New round</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Course</Label>
            <Select value={clubId} onValueChange={setClubId}>
              <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>
                {clubs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Strokes per hole</Label>
          <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 mt-2">
            {strokes.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-[10px] text-muted-foreground">H{i + 1} · par {COURSE_PARS[i]}</div>
                <Input
                  className="text-center px-1 mt-0.5 h-9"
                  type="number" min={1} value={s}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 0;
                    setStrokes(strokes.map((x, j) => j === i ? v : x));
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 p-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Total · par {parTotal}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{diff === 0 ? "Even" : diff > 0 ? `+${diff} over` : `${diff} under`}</div>
          </div>
          <div className="font-display text-4xl text-primary">{total}</div>
        </div>
        <Button onClick={onSave} className="w-full">Save scorecard</Button>
      </CardContent>
    </Card>
  );
}

function HandicapCard({ cards }: { cards: Scorecard[] }) {
  const idx = currentUser.handicap_index;
  const cat = handicapCategory(idx);
  const rounds = cards.length;

  const recent = cards.slice(0, 20);
  const differentials = recent
    .map((c) => c.score - c.pars.reduce((a, b) => a + b, 0))
    .sort((a, b) => a - b)
    .slice(0, Math.max(1, Math.min(8, recent.length)));
  const trendAvg = differentials.length
    ? differentials.reduce((a, b) => a + b, 0) / differentials.length
    : null;

  const best = cards.reduce<Scorecard | null>((b, c) => {
    if (!b) return c;
    const dc = c.score - c.pars.reduce((a, p) => a + p, 0);
    const db = b.score - b.pars.reduce((a, p) => a + p, 0);
    return dc < db ? c : b;
  }, null);
  const bestDiff = best ? best.score - best.pars.reduce((a, p) => a + p, 0) : null;

  return (
    <Card className="shadow-elegant mt-4 mb-4 overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-5 md:p-6">
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-80">Handicap Index</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="font-display text-5xl leading-none">{formatHandicap(idx)}</div>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider">{cat}</span>
            </div>
            <div className="mt-2 text-xs opacity-80">Updated {currentUser.handicap_updated} · WHS-style</div>
          </div>
          <div className="p-5 md:p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatItem label="Rounds" value={rounds} />
            <StatItem
              label="Best round"
              value={best ? best.score : "—"}
              sub={bestDiff !== null ? (bestDiff === 0 ? "E" : bestDiff > 0 ? `+${bestDiff}` : `${bestDiff}`) : undefined}
            />
            <StatItem
              label="Avg (best 8/20)"
              value={trendAvg !== null ? (trendAvg >= 0 ? `+${trendAvg.toFixed(1)}` : trendAvg.toFixed(1)) : "—"}
              sub="to par"
            />
            <StatItem label="Playing HCP" value={Math.round(idx)} sub="rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatItem({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-2xl leading-tight mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
