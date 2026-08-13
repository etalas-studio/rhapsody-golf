import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { KpiCard, PageHeader } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/appContext";
import { formatIDR } from "@/lib/mockData";
import { useAdminAnalytics } from "@/lib/useApi";

export const Route = createFileRoute("/club/analytics")({
  head: () => ({ meta: [{ title: "Revenue & Analytics · Club Admin" }] }),
  component: Analytics,
});

function Analytics() {
  const { selectedClubId } = useApp();
  const { data: analytics, loading } = useAdminAnalytics(selectedClubId);

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

  const revenue = analytics?.revenue_30d ?? 0;
  const bookings = analytics?.bookings_30d ?? 0;
  const members = analytics?.members_total ?? 0;
  const paid = analytics?.paid_members ?? 0;
  const visitors = members - paid;
  // ponytail: member vs visitor revenue split not in ApiClubAnalytics — proxy from paid_members ratio
  const memberRevRatio = members > 0 ? paid / members : 0.5;
  const memberRev = Math.round(revenue * memberRevRatio);
  const visitorRev = revenue - memberRev;

  const visitTrend = analytics?.visit_trend ?? [];

  return (
    <AppShell>
      <PageHeader title="Revenue & Analytics" subtitle="Performance for your club only." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Revenue (30d)" value={formatIDR(revenue)} accent="gold" />
        <KpiCard label="Bookings (30d)" value={String(bookings)} accent="primary" />
        <KpiCard label="Paid members" value={String(paid)} hint={`${visitors} visitors`} />
        <KpiCard label="Avg handicap" value={analytics?.avg_handicap != null ? analytics.avg_handicap.toFixed(1) : "—"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-elegant">
          <CardHeader><CardTitle>Member vs visitor revenue</CardTitle></CardHeader>
          <CardContent>
            {revenue > 0 ? (
              <>
                <div className="flex rounded-lg overflow-hidden h-10">
                  <div className="bg-primary text-primary-foreground text-xs grid place-items-center" style={{ width: `${Math.round(memberRevRatio * 100)}%` }}>
                    Members {Math.round(memberRevRatio * 100)}%
                  </div>
                  <div className="bg-accent text-accent-foreground text-xs grid place-items-center flex-1">
                    Visitors {Math.round((1 - memberRevRatio) * 100)}%
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div><div className="text-xs text-muted-foreground">Members</div><div className="font-display text-2xl">{formatIDR(memberRev)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Visitors</div><div className="font-display text-2xl">{formatIDR(visitorRev)}</div></div>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground py-6 text-center">No revenue data yet.</div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader><CardTitle>Visit trend</CardTitle></CardHeader>
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
              <div className="text-sm text-muted-foreground py-6 text-center">No visit data yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
