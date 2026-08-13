import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/mockData";
import { useClubs, useMyTournamentRegistrations, useTournaments } from "@/lib/useApi";
import { type ApiTournament } from "@/lib/api";
import { Trophy, Calendar, Users, ChevronRight } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/tournaments/")({
  head: () => ({ meta: [{ title: "Tournaments · Rhapsody App" }] }),
  component: AppTournaments,
});

const STATUS_STYLES: Record<string, string> = {
  "Open": "bg-primary text-primary-foreground",
  "Registration Closed": "bg-muted text-muted-foreground",
  "Finished": "bg-secondary text-secondary-foreground",
};

function AppTournaments() {
  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const { data: tournamentData, loading: tLoading } = useTournaments();
  const { data: myRegs, loading: rLoading } = useMyTournamentRegistrations();
  const { data: clubs } = useClubs();

  const clubMap = Object.fromEntries((clubs ?? []).map((c) => [c.id, c.name]));
  const tournaments = tournamentData?.tournaments ?? [];
  const activeRegs = (myRegs ?? []).filter((r) =>
    ["Registered", "Confirmed", "Waitlist", "Checked-in"].includes(r.status)
  );
  const tournamentMap = Object.fromEntries(tournaments.map((t) => [t.id, t]));

  return (
    <MobileShell>
      <div className="px-4 py-5 space-y-4">
        <h1 className="font-display text-2xl">Tournaments</h1>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["browse", "mine"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors ${tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
            >
              {t === "browse" ? "All tournaments" : `My registrations${activeRegs.length > 0 ? ` (${activeRegs.length})` : ""}`}
            </button>
          ))}
        </div>

        {tab === "browse" && (
          <>
            {tLoading ? (
              <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
            ) : tournaments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No tournaments available.</p>
            ) : (
              <div className="space-y-3">
                {tournaments.map((t) => (
                  <TournamentCard key={t.id} t={t} clubName={clubMap[t.club_id]} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "mine" && (
          <>
            {rLoading ? (
              <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            ) : activeRegs.length === 0 ? (
              <div className="text-center py-6">
                <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active registrations.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeRegs.map((r) => {
                  const t = tournamentMap[r.tournament_id];
                  return (
                    <Link key={r.id} to="/app/tournaments/$tournamentId" params={{ tournamentId: r.tournament_id }}>
                      <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{t?.name ?? r.tournament_id}</p>
                          {t && <p className="text-xs text-muted-foreground mt-0.5">{t.start_date} · {t.format}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge>{r.status}</Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </MobileShell>
  );
}

function TournamentCard({ t, clubName }: { t: ApiTournament; clubName?: string }) {
  const registered = t.registered_count ?? 0;
  const spotsLeft = t.max_players - registered;
  return (
    <Link to="/app/tournaments/$tournamentId" params={{ tournamentId: t.id }}>
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary to-primary-glow" />
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground truncate">{clubName ?? t.club_id}</p>
            <Badge className={STATUS_STYLES[t.status] ?? ""}>{t.status}</Badge>
          </div>
          <p className="font-display text-base leading-snug">{t.name}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{t.start_date}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{registered}/{t.max_players}</span>
            <span>{t.format}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t">
            <span className="text-sm font-medium">{formatIDR(t.entry_fee)}</span>
            {spotsLeft > 0 && spotsLeft <= 10 && (
              <span className="text-[10px] text-amber-500 font-medium">Only {spotsLeft} left</span>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </Link>
  );
}
