import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { KpiCard, PageHeader } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/mockData";
import { useSuperAdminAnalytics } from "@/lib/useApi";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Platform Analytics · Superadmin" }] }),
  component: Analytics,
});

function Analytics() {
  const { data: analytics, loading } = useSuperAdminAnalytics();

  if (loading) {
    return (
      <AppShell>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[0,1,2,3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </AppShell>
    );
  }

  const totalRev = analytics?.revenue_30d ?? 0;
  const topClubs = analytics?.top_clubs ?? [];
  const visitTrend = analytics?.visit_trend ?? [];

  return (
    <AppShell>
      <PageHeader title="Platform Analytics" subtitle="Cross-network performance." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Revenue (30d)" value={formatIDR(totalRev)} accent="gold" />
        <KpiCard label="Bookings (30d)" value={(analytics?.bookings_30d ?? 0).toLocaleString()} accent="primary" />
        <KpiCard label="Paid Members" value={(analytics?.paid_members ?? 0).toLocaleString()} />
        <KpiCard label="Avg Handicap" value={analytics?.avg_handicap != null ? analytics.avg_handicap.toFixed(1) : "—"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="shadow-elegant">
          <CardHeader><CardTitle>Revenue by club</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {topClubs.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">No data yet.</div>
            ) : topClubs.map(({ club_id, club_name, revenue }) => {
              const pct = totalRev > 0 ? Math.round((revenue / totalRev) * 100) : 0;
              return (
                <div key={club_id}>
                  <div className="flex justify-between text-sm">
                    <span>{club_name}</span>
                    <span className="tabular-nums">{formatIDR(revenue)} <span className="text-muted-foreground text-xs">({pct}%)</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden mt-1">
                    <div className="h-full bg-gradient-to-r from-primary to-primary-glow" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader><CardTitle>Top courses by rank</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topClubs.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">No data yet.</div>
            ) : [...topClubs].map((x, i) => (
              <div key={x.club_id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg w-6">{i + 1}</span>
                  <span>{x.club_name}</span>
                </div>
                <div className="text-sm tabular-nums text-muted-foreground">{formatIDR(x.revenue)}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-elegant lg:col-span-2">
          <CardHeader><CardTitle>Visit trend (network-wide)</CardTitle></CardHeader>
          <CardContent>
            {visitTrend.length > 0 ? (
              <>
                <div className="h-48 flex items-end gap-1.5">
                  {visitTrend.map((v, i) => {
                    const max = Math.max(...visitTrend.map((t) => t.visits), 1);
                    return (
                      <div key={i} className="flex-1 bg-gradient-to-t from-primary to-primary-glow rounded-t-md transition-all"
                        style={{ height: `${(v.visits / max) * 100}%` }}
                        title={`${v.date}: ${v.visits}`} />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                  <span>{visitTrend[0]?.date}</span>
                  <span>{visitTrend[visitTrend.length - 1]?.date}</span>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground py-6 text-center">No visit trend data yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
