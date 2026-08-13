import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookings, useClub, useScorecards } from "@/lib/useApi";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/app/history/$clubId")({
  head: () => ({ meta: [{ title: "Round History · Rhapsody App" }] }),
  component: AppHistoryDetail,
});

function AppHistoryDetail() {
  const { clubId } = Route.useParams();

  const { data: club, loading: clubLoading } = useClub(clubId);
  const { data: apiCards } = useScorecards();
  const { data: bookingList } = useBookings({ status: "completed" });

  const myRounds = (bookingList?.bookings ?? [])
    .filter((b) => b.club_id === clubId)
    .sort((a, b) => b.tee_time.localeCompare(a.tee_time));

  const myCards = (apiCards?.scorecards ?? []).filter((s) => s.club_id === clubId);
  const findCard = (teeTime: string) =>
    myCards.find((s) => s.played_at.slice(0, 10) === teeTime.slice(0, 10));

  const [selectedId, setSelectedId] = useState<string>(myRounds[0]?.id ?? "");

  if (clubLoading) {
    return (
      <MobileShell>
        <div className="px-4 py-5 space-y-3">
          <Skeleton className="h-6 w-40" />
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        </div>
      </MobileShell>
    );
  }

  if (!club) throw notFound();

  const selectedRound = myRounds.find((r) => r.id === selectedId);
  const card = selectedRound ? findCard(selectedRound.tee_time) : undefined;

  return (
    <MobileShell>
      <div className="px-4 py-5 space-y-4">
        {/* Back */}
        <Link to="/app/profile" className="flex items-center gap-1 text-sm text-muted-foreground -ml-1">
          <ChevronLeft className="h-4 w-4" /> Profile
        </Link>

        <div>
          <h1 className="font-display text-2xl">{club.name}</h1>
          <p className="text-xs text-muted-foreground">{myRounds.length} rounds recorded</p>
        </div>

        {myRounds.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No rounds at this club yet.</p>
        ) : (
          <>
            {/* Round list */}
            <div className="space-y-2">
              {myRounds.map((r) => {
                const raw = findCard(r.tee_time);
                const diff = raw ? raw.gross - raw.holes.reduce((a, h) => a + h.par, 0) : null;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={cn(
                      "w-full text-left rounded-xl border px-4 py-3 transition-colors",
                      r.id === selectedId ? "border-primary bg-primary/5" : "bg-card"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {format(parseISO(r.tee_time), "EEE, d MMM yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(parseISO(r.tee_time), "HH:mm")} · {r.players}P
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={r.status === "Completed" ? "secondary" : "outline"}>{r.status}</Badge>
                        {diff !== null && (
                          <p className={cn("text-sm font-semibold mt-1", diff <= 0 ? "text-emerald-400" : "text-destructive")}>
                            {diff > 0 ? "+" : ""}{diff}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Round detail */}
            {selectedRound && card && (
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">Scorecard</p>
                  <p className="text-xs text-muted-foreground">
                    Gross {card.gross} · {card.holes.reduce((a, h) => a + h.par, 0)} par
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full text-center">
                    <thead>
                      <tr className="text-muted-foreground">
                        <td className="text-left py-1 w-10">Hole</td>
                        {Array.from({ length: 9 }, (_, i) => (
                          <td key={i} className="py-1 w-7">{i + 1}</td>
                        ))}
                        <td className="font-semibold">OUT</td>
                      </tr>
                      <tr className="text-muted-foreground">
                        <td className="text-left">Par</td>
                        {card.holes.slice(0, 9).map((h, i) => <td key={i}>{h.par}</td>)}
                        <td className="font-semibold">{card.holes.slice(0, 9).reduce((a, h) => a + h.par, 0)}</td>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="text-left font-medium">Score</td>
                        {card.holes.slice(0, 9).map((h, i) => {
                          const diff = h.strokes - h.par;
                          return (
                            <td key={i} className={cn("rounded font-semibold",
                              diff <= -2 ? "text-yellow-400" :
                              diff === -1 ? "text-emerald-400" :
                              diff === 0 ? "" :
                              diff === 1 ? "text-rose-400" : "text-rose-600"
                            )}>{h.strokes}</td>
                          );
                        })}
                        <td className="font-semibold">{card.holes.slice(0, 9).reduce((a, h) => a + h.strokes, 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {selectedRound && !card && (
              <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground text-center">
                No scorecard for this round.
              </div>
            )}
          </>
        )}
      </div>
    </MobileShell>
  );
}
