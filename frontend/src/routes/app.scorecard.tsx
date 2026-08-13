import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
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

export const Route = createFileRoute("/app/scorecard")({
  head: () => ({ meta: [{ title: "Scorecard · Rhapsody App" }] }),
  component: AppScorecard,
});

type Mode = "view" | "new";

function holeTone(stroke: number, par: number) {
  const d = stroke - par;
  if (d <= -2) return "bg-amber-400/20 text-amber-400 ring-1 ring-amber-400";
  if (d === -1) return "bg-emerald-400/20 text-emerald-400 ring-1 ring-emerald-400";
  if (d === 0) return "bg-card text-foreground";
  if (d === 1) return "bg-rose-400/20 text-rose-400";
  return "bg-rose-600/20 text-rose-500 ring-1 ring-rose-500";
}

function DiffBadge({ diff, compact = false }: { diff: number; compact?: boolean }) {
  const label = diff === 0 ? "E" : diff > 0 ? `+${diff}` : `${diff}`;
  const Icon = diff === 0 ? Minus : diff > 0 ? TrendingUp : TrendingDown;
  const tone =
    diff < 0 ? "text-emerald-400 bg-emerald-400/10" :
    diff > 0 ? "text-rose-400 bg-rose-400/10" :
    "text-muted-foreground bg-muted";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full font-medium", compact ? "text-[10px] px-1.5 py-0.5 mt-0.5" : "text-xs px-2 py-0.5", tone)}>
      <Icon className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {label}
    </span>
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
    <div className="rounded-xl overflow-hidden bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-4 space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] opacity-80">Handicap Index</p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="font-display text-4xl leading-none">{formatHandicap(idx)}</span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider">{cat}</span>
        </div>
        <p className="text-[10px] opacity-70 mt-1">Updated {currentUser.handicap_updated} · WHS-style</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Rounds", value: rounds },
          { label: "Playing HCP", value: Math.round(idx) },
          { label: "Best round", value: best ? `${best.score} (${bestDiff !== null ? (bestDiff === 0 ? "E" : bestDiff > 0 ? `+${bestDiff}` : bestDiff) : "—"})` : "—" },
          { label: "Avg (best 8/20)", value: trendAvg !== null ? (trendAvg >= 0 ? `+${trendAvg.toFixed(1)}` : trendAvg.toFixed(1)) : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/10 rounded-lg p-2">
            <p className="text-[10px] uppercase tracking-wider opacity-70">{label}</p>
            <p className="font-display text-lg leading-tight mt-0.5">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScorecardDetail({ card, onClose }: { card: Scorecard; onClose?: () => void }) {
  const front = card.strokes.slice(0, 9);
  const back = card.strokes.slice(9, 18);
  const parFront = card.pars.slice(0, 9);
  const parBack = card.pars.slice(9, 18);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const totalPar = sum(card.pars);
  const diff = card.score - totalPar;
  const net = card.score - Math.round(currentUser.handicap_index);

  return (
    <div className="space-y-3">
      {onClose && (
        <button onClick={onClose} className="flex items-center gap-1 text-sm text-muted-foreground -ml-1">
          <ArrowLeft className="h-4 w-4" /> All rounds
        </button>
      )}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">{card.course_name}</CardTitle>
            <DiffBadge diff={diff} />
          </div>
          <p className="text-xs text-muted-foreground">{card.date} · Gross {card.score} · Net {net}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Front 9", strokes: front, pars: parFront, start: 1 },
            { label: "Back 9", strokes: back, pars: parBack, start: 10 },
          ].map(({ label, strokes, pars, start }) => (
            <div key={label}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{label} · {sum(strokes)} / par {sum(pars)}</p>
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="text-xs w-full text-center min-w-[300px]">
                  <thead>
                    <tr className="text-muted-foreground">
                      <td className="text-left py-1 w-10">Hole</td>
                      {strokes.map((_, i) => <td key={i} className="py-1 w-7">{start + i}</td>)}
                      <td className="font-semibold">Σ</td>
                    </tr>
                    <tr className="text-muted-foreground">
                      <td className="text-left">Par</td>
                      {pars.map((p, i) => <td key={i}>{p}</td>)}
                      <td className="font-semibold">{sum(pars)}</td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="text-left font-medium">Score</td>
                      {strokes.map((s, i) => (
                        <td key={i} className="p-0.5">
                          <span className={cn("inline-flex items-center justify-center h-6 w-6 rounded font-semibold", holeTone(s, pars[i]))}>{s}</span>
                        </td>
                      ))}
                      <td className="font-display text-sm">{sum(strokes)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function NewRoundForm({
  clubId, setClubId, clubs, date, setDate, strokes, setStrokes, total, parTotal, onSave, onCancel,
}: {
  clubId: string; setClubId: (v: string) => void;
  clubs: { id: string; name: string }[];
  date: string; setDate: (v: string) => void;
  strokes: number[]; setStrokes: (v: number[]) => void;
  total: number; parTotal: number;
  onSave: () => void; onCancel: () => void;
}) {
  const diff = total - parTotal;
  return (
    <div className="space-y-4">
      <button onClick={onCancel} className="flex items-center gap-1 text-sm text-muted-foreground -ml-1">
        <ArrowLeft className="h-4 w-4" /> Back to history
      </button>
      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="h-4 w-4 text-primary" /> New round</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Course</Label>
              <Select value={clubId} onValueChange={setClubId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {clubs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Strokes per hole</Label>
            <div className="grid grid-cols-6 gap-1.5 mt-2">
              {strokes.map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-[9px] text-muted-foreground">H{i + 1}·p{COURSE_PARS[i]}</p>
                  <Input
                    className="text-center px-0.5 mt-0.5 h-8 text-xs"
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

          <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 p-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total · par {parTotal}</p>
              <p className="text-xs text-muted-foreground">{diff === 0 ? "Even" : diff > 0 ? `+${diff} over` : `${Math.abs(diff)} under`}</p>
            </div>
            <span className="font-display text-3xl text-primary">{total}</span>
          </div>

          <Button onClick={onSave} className="w-full">Save scorecard</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AppScorecard() {
  const { data: apiCards, loading: cardsLoading } = useScorecards();
  const { data: clubs } = useClubs();

  const apiList = apiCards?.scorecards ?? [];
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
    <MobileShell>
      <div className="px-4 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl">Scorecard</h1>
          {mode === "view" && (
            <Button size="sm" onClick={() => { setMode("new"); setClubId(clubList[0]?.id ?? ""); }} className="gap-1.5">
              <Plus className="h-4 w-4" /> New score
            </Button>
          )}
        </div>

        {mode === "view" && (
          <>
            {cardsLoading ? (
              <Skeleton className="h-40 rounded-xl" />
            ) : (
              <HandicapCard cards={list} />
            )}

            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score history</h2>

            {cardsLoading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : list.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scorecards yet. Tap "New score" to log a round.</p>
            ) : selected ? (
              <ScorecardDetail card={selected} onClose={() => setSelectedId(null)} />
            ) : (
              <div className="space-y-2">
                {list.map((s) => {
                  const par = s.pars.reduce((a, b) => a + b, 0);
                  const diff = s.score - par;
                  const idx = list.findIndex((c) => c.id === s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className="w-full text-left rounded-xl border bg-card px-4 py-3 flex items-center justify-between gap-3 transition hover:border-primary/40"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.course_name}</p>
                        <p className="text-xs text-muted-foreground">{s.date}</p>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div>
                          <p className="font-display text-xl leading-none">{s.score}</p>
                          <DiffBadge diff={diff} compact />
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selected && list.length > 1 && (() => {
              const idx = list.findIndex((c) => c.id === selected.id);
              const prev = idx > 0 ? list[idx - 1] : null;
              const next = idx < list.length - 1 ? list[idx + 1] : null;
              return (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <Button variant="outline" size="sm" disabled={!prev} onClick={() => prev && setSelectedId(prev.id)} className="gap-1">
                    <ChevronLeft className="h-4 w-4" /> Newer
                  </Button>
                  <span className="text-xs text-muted-foreground">{idx + 1}/{list.length}</span>
                  <Button variant="outline" size="sm" disabled={!next} onClick={() => next && setSelectedId(next.id)} className="gap-1">
                    Older <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              );
            })()}
          </>
        )}

        {mode === "new" && (
          <NewRoundForm
            clubId={clubId} setClubId={setClubId}
            clubs={clubList}
            date={date} setDate={setDate}
            strokes={strokes} setStrokes={setStrokes}
            total={total} parTotal={parTotal}
            onSave={save}
            onCancel={() => setMode("view")}
          />
        )}
      </div>
    </MobileShell>
  );
}
