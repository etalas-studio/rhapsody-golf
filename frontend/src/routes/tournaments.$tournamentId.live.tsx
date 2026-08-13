import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getTournament,
  getClub,
  getLeaderboard,
  type LeaderboardEntry,
  COURSE_PARS,
} from "@/lib/mockData";
import {
  Trophy,
  RefreshCw,
  CheckCircle2,
  Clock,
  Share2,
  Medal,
  MapPin,
  Calendar,
  Users,
  WifiOff,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/tournaments/$tournamentId/live")({
  head: ({ params }) => {
    const t = getTournament(params.tournamentId);
    return {
      meta: [
        { title: `${t?.title ?? "Live"} Leaderboard · Rhapsody Golf` },
        { name: "description", content: `Live leaderboard for ${t?.title ?? "tournament"} at ${t?.date ?? ""}. Follow scores in real time.` },
        { property: "og:title", content: `${t?.title ?? "Live"} – Live Leaderboard` },
        { property: "og:description", content: `Follow live scoring for ${t?.title}` },
      ],
    };
  },
  // Public route — no auth guard
  component: LiveLeaderboard,
});

const PAR_TOTAL = COURSE_PARS.reduce((a, b) => a + b, 0);

function formatDiff(gross: number, thru: number): string {
  if (thru === 0 || gross === 0) return "—";
  const parSoFar = COURSE_PARS.slice(0, thru).reduce((a, b) => a + b, 0);
  const d = gross - parSoFar;
  if (d === 0) return "E";
  return d > 0 ? `+${d}` : `${d}`;
}

function diffColor(gross: number, thru: number): string {
  if (thru === 0 || gross === 0) return "";
  const parSoFar = COURSE_PARS.slice(0, thru).reduce((a, b) => a + b, 0);
  const d = gross - parSoFar;
  if (d < 0) return "text-emerald-600 dark:text-emerald-400 font-medium";
  if (d === 0) return "text-foreground";
  return "text-destructive";
}

function statusBadge(status: LeaderboardEntry["status"]) {
  switch (status) {
    case "Playing":
      return <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />Playing</Badge>;
    case "Finished":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">Finished</Badge>;
    case "DNF":
      return <Badge variant="outline" className="text-[10px] text-muted-foreground">DNF</Badge>;
    case "WD":
      return <Badge variant="outline" className="text-[10px] text-muted-foreground">WD</Badge>;
  }
}

function positionLabel(pos: number): React.ReactNode {
  if (pos === 1) return <span className="text-amber-500 font-bold">🥇</span>;
  if (pos === 2) return <span className="text-slate-400 font-bold">🥈</span>;
  if (pos === 3) return <span className="text-amber-700 font-bold">🥉</span>;
  return <span className="font-mono tabular-nums text-muted-foreground text-sm">{pos}</span>;
}

// ─── Ranking logic ────────────────────────────────────────────────────────────

type SortKey = "gross" | "net" | "points";

function rank(entries: LeaderboardEntry[], key: SortKey): (LeaderboardEntry & { pos: number })[] {
  const active = entries.filter((e) => e.status !== "WD" && e.status !== "DNF");

  const sorted = [...active].sort((a, b) => {
    if (key === "points") return (b.points ?? 0) - (a.points ?? 0);
    // lower = better for gross/net; finished > playing (finished = 18 holes)
    const aVal = a.thru < 18 ? (a[key] || 999) + 0.001 * (18 - a.thru) : (a[key] || 999);
    const bVal = b.thru < 18 ? (b[key] || 999) + 0.001 * (18 - b.thru) : (b[key] || 999);
    return aVal - bVal;
  });

  let pos = 1;
  return sorted.map((e, i) => {
    if (i > 0) {
      const prev = sorted[i - 1];
      const sameScore = key === "points"
        ? (e.points ?? 0) === (prev.points ?? 0)
        : e[key] === prev[key] && e.thru === prev.thru;
      if (!sameScore) pos = i + 1;
    }
    return { ...e, pos };
  });
}

// ─── Row component ────────────────────────────────────────────────────────────

function LeaderRow({
  entry,
  pos,
  key: _key,
  sortKey,
  isMe,
}: {
  entry: LeaderboardEntry;
  pos: number;
  key?: string;
  sortKey: SortKey;
  isMe: boolean;
}) {
  return (
    <div
      className={cn(
        "grid items-center gap-x-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
        "grid-cols-[2rem_1fr_auto_auto_auto]",
        isMe && "bg-primary/5 ring-1 ring-primary/20",
        !isMe && "hover:bg-muted/40",
      )}
    >
      {/* Position */}
      <div className="text-center">{positionLabel(pos)}</div>

      {/* Name + meta */}
      <div className="min-w-0">
        <div className={cn("font-medium truncate", isMe && "text-primary")}>
          {entry.player_name}
          {isMe && <span className="ml-1 text-[10px] text-primary font-normal">(You)</span>}
        </div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />{entry.tee_time}
          </span>
          <span>· Flt {entry.flight}</span>
          <span>· HCP {entry.handicap}</span>
        </div>
      </div>

      {/* Score column */}
      <div className="text-right tabular-nums">
        {sortKey === "points" ? (
          <div className="font-medium">{entry.points ?? "—"}<span className="text-[10px] text-muted-foreground ml-0.5">pts</span></div>
        ) : sortKey === "net" ? (
          <div className="font-medium">{entry.net || "—"}</div>
        ) : (
          <div className={cn("font-medium", diffColor(entry.gross, entry.thru))}>
            {formatDiff(entry.gross, entry.thru)}
          </div>
        )}
      </div>

      {/* Thru */}
      <div className="text-[11px] text-muted-foreground tabular-nums text-right">
        {entry.thru === 18 ? "F" : entry.thru === 0 ? "—" : entry.thru}
      </div>

      {/* Status / verified */}
      <div className="flex flex-col items-end gap-0.5">
        {statusBadge(entry.status)}
        {entry.verified && (
          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
            <CheckCircle2 className="h-2.5 w-2.5" />verified
          </span>
        )}
        {!entry.verified && entry.status === "Finished" && (
          <span className="text-[9px] text-amber-500 inline-flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />provisional
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function LiveLeaderboard() {
  const { tournamentId } = Route.useParams();
  const t = getTournament(tournamentId);
  const club = t ? getClub(t.club_id) : null;
  const allEntries = getLeaderboard(tournamentId);

  const isLive = t?.status !== "Finished";

  // Simulated auto-refresh
  const [refreshCount, setRefreshCount] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [online, setOnline] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isLive) return;
    intervalRef.current = setInterval(() => {
      setRefreshCount((c) => c + 1);
      setLastRefreshed(new Date());
    }, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isLive]);

  // Flights available
  const flights = Array.from(new Set(allEntries.map((e) => e.flight))).sort();
  const [filterFlight, setFilterFlight] = useState("All");

  const isStableford = t?.format === "Stableford" || t?.format === "System 36";
  const [sortKey, setSortKey] = useState<SortKey>(isStableford ? "points" : "gross");

  const filtered = filterFlight === "All" ? allEntries : allEntries.filter((e) => e.flight === filterFlight);
  const ranked = rank(filtered, sortKey);

  // "You" highlight — RH-10001 is currentUser
  const MY_ID = "RH-10001";

  const playing = allEntries.filter((e) => e.status === "Playing").length;
  const finished = allEntries.filter((e) => e.status === "Finished").length;

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `${t?.title} – Live Leaderboard`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() =>
        toast.success("Link copied!", { description: "Share this leaderboard with anyone." })
      );
    }
  }

  function manualRefresh() {
    setRefreshCount((c) => c + 1);
    setLastRefreshed(new Date());
    toast.success("Leaderboard refreshed");
  }

  if (!t) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Trophy className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Tournament not found.</p>
          <Button asChild variant="outline"><Link to="/">Go home</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Hero header */}
      <div className="relative" style={{ background: club?.banner }}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60" />
        <div className="relative max-w-3xl mx-auto px-4 pt-8 pb-6 text-white space-y-2">
          <div className="flex items-center gap-2 text-xs opacity-80 flex-wrap">
            <Trophy className="h-3.5 w-3.5" />
            <span>{club?.name}</span>
            <span>·</span>
            <MapPin className="h-3 w-3" />
            <span>{club?.location}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-4xl leading-tight">{t.title}</h1>
          <div className="flex items-center gap-3 text-sm opacity-90 flex-wrap">
            <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{t.date}</span>
            <span>{t.format}</span>
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{allEntries.length} players</span>
          </div>

          {/* Live / Finished badge */}
          <div className="flex items-center gap-2 pt-1">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-full px-2.5 py-1">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                LIVE · {playing} playing · {finished} finished
              </span>
            ) : (
              <Badge className="bg-white/20 text-white border-white/30">Final results</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div className="max-w-3xl mx-auto px-4 py-3 border-b">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Flight filter */}
            <Select value={filterFlight} onValueChange={setFilterFlight}>
              <SelectTrigger className="h-8 w-auto min-w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All flights</SelectItem>
                {flights.map((f) => <SelectItem key={f} value={f}>Flight {f}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Gross / Net / Points toggle */}
            {isStableford ? (
              <div className="flex rounded-lg border overflow-hidden">
                {(["points", "gross"] as SortKey[]).map((k) => (
                  <button key={k} type="button" onClick={() => setSortKey(k)}
                    className={cn("px-3 py-1 text-xs capitalize transition-colors", sortKey === k ? "bg-primary text-primary-foreground" : "hover:bg-muted/60")}>
                    {k === "points" ? "Points" : "Gross"}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex rounded-lg border overflow-hidden">
                {(["gross", "net"] as SortKey[]).map((k) => (
                  <button key={k} type="button" onClick={() => setSortKey(k)}
                    className={cn("px-3 py-1 text-xs capitalize transition-colors", sortKey === k ? "bg-primary text-primary-foreground" : "hover:bg-muted/60")}>
                    {k}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground hidden sm:block">
              {online ? (
                <span className="inline-flex items-center gap-1"><Wifi className="h-3 w-3 text-emerald-500" />Updated {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-500"><WifiOff className="h-3 w-3" />Offline</span>
              )}
            </span>
            <Button variant="outline" size="sm" className="h-8" onClick={manualRefresh}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={handleShare}>
              <Share2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Column header */}
        <div className="grid grid-cols-[2rem_1fr_auto_auto_auto] gap-x-3 mt-3 px-3 text-[10px] uppercase tracking-wide text-muted-foreground">
          <div className="text-center">Pos</div>
          <div>Player</div>
          <div className="text-right">{sortKey === "points" ? "Pts" : sortKey === "net" ? "Net" : "Score"}</div>
          <div className="text-right">Thru</div>
          <div className="text-right">Status</div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="max-w-3xl mx-auto px-4 py-3 space-y-1">
        {ranked.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No scores submitted yet.</div>
        ) : (
          ranked.map((entry) => (
            <LeaderRow
              key={entry.id}
              entry={entry}
              pos={entry.pos}
              sortKey={sortKey}
              isMe={entry.rhapsody_id === MY_ID}
            />
          ))
        )}
      </div>

      {/* Legend */}
      <div className="max-w-3xl mx-auto px-4 pb-8">
        <div className="rounded-lg border bg-card p-3 mt-2 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Legend</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary animate-pulse" />Playing — score in progress</span>
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-600" />Verified — all holes marker-confirmed</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" />Provisional — awaiting marker sign-off</span>
          </div>
          {isLive && (
            <p className="text-[10px] text-muted-foreground">Auto-refreshes every 30 seconds. Tap <RefreshCw className="h-2.5 w-2.5 inline" /> to update now.</p>
          )}
        </div>

        {/* Tabs: leaderboard / prize */}
        {t.prize_slots && t.prize_slots.length > 0 && (
          <Card className="mt-4 shadow-elegant">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 font-display text-base">
                <Medal className="h-4 w-4 text-gold" /> Prize breakdown
              </div>
              <div className="space-y-1.5">
                {t.prize_slots.map((ps, i) => (
                  <div key={i} className={cn("flex items-center justify-between text-sm rounded-lg px-3 py-2", i === 0 ? "bg-gold/10 border border-gold/30" : "bg-muted/40")}>
                    <span className={cn("font-medium", i === 0 && "text-amber-600 dark:text-amber-400")}>{ps.pos}</span>
                    <span>{ps.prize}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Rhapsody Golf Connect · Official live scoring</span>
          <Button variant="ghost" size="sm" asChild className="text-xs h-7">
            <Link to="/">Rhapsody Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
