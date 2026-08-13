import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { KpiCard, PageHeader } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/appContext";
import { formatIDR } from "@/lib/mockData";
import { useAdminAnalytics, useTeeSheet } from "@/lib/useApi";
import { CalendarCheck, CreditCard, Trophy, Ticket } from "lucide-react";

export const Route = createFileRoute("/club/")({
  head: () => ({ meta: [{ title: "Club Dashboard · Rhapsody" }] }),
  component: ClubDash,
});

function ClubDash() {
  const { selectedClubId } = useApp();
  const today = new Date().toISOString().slice(0, 10);

  const { data: analytics } = useAdminAnalytics(selectedClubId);
  const { data: teesheet } = useTeeSheet(selectedClubId, today, today);

  const todayBookings = (teesheet ?? []).length;
  const todayCheckedIn = (teesheet ?? []).filter((b) => b.status === "Checked-in" || b.status === "Completed").length;

  return (
    <AppShell>
      <PageHeader title="Club Dashboard" subtitle="Overview — scoped to your club only." />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <KpiCard label="Total Revenue" value={formatIDR(analytics?.revenue_total ?? 0)} accent="primary" icon={<CreditCard className="h-4 w-4" />} />
        <KpiCard label="Total Bookings" value={String(analytics?.bookings_total ?? 0)} accent="primary" icon={<CalendarCheck className="h-4 w-4" />} />
        <KpiCard label="Total Tournaments" value={String(analytics?.tournaments_total ?? 0)} accent="primary" icon={<Trophy className="h-4 w-4" />} />
        <KpiCard label="Total Vouchers" value={String(analytics?.vouchers_total ?? 0)} accent="primary" icon={<Ticket className="h-4 w-4" />} />
      </div>

      <Card className="shadow-elegant">
        <CardHeader><CardTitle>Today's tee sheet snapshot</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-sm text-center">
            <div className="rounded-lg border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Bookings</div>
              <div className="font-display text-2xl mt-0.5">{todayBookings}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Checked in</div>
              <div className="font-display text-2xl mt-0.5 text-emerald-600 dark:text-emerald-400">{todayCheckedIn}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Occupancy</div>
              <div className="font-display text-2xl mt-0.5">
                {todayBookings > 0 ? `${Math.round((todayCheckedIn / todayBookings) * 100)}%` : "—"}
              </div>
            </div>
          </div>
          {(teesheet ?? []).slice(0, 5).map((b) => (
            <div key={b.id} className="flex items-center justify-between text-sm rounded-lg border p-2.5">
              <div>
                <div className="font-medium">{b.user.name}</div>
                <div className="text-xs text-muted-foreground">{b.tee_time} · {b.players}P</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground tabular-nums">{formatIDR(b.amount)}</div>
                <Badge variant="outline" className="text-[10px]">{b.status}</Badge>
              </div>
            </div>
          ))}
          {(teesheet ?? []).length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-3">No bookings for today yet.</div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
