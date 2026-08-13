import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { KpiCard, PageHeader, StatusDot } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/mockData";
import { useHealthStatus, useSuperAdminAnalytics, useSuperAdminClubs } from "@/lib/useApi";
import { Building2, CalendarCheck, CreditCard, Globe2 } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Network Overview · Realta Superadmin" }] }),
  component: AdminDash,
});

function AdminDash() {
  const { data: analytics, loading: aLoading } = useSuperAdminAnalytics();
  const { data: clubs, loading: cLoading } = useSuperAdminClubs();
  const { data: health, loading: hLoading } = useHealthStatus();

  const loading = aLoading || cLoading;

  return (
    <AppShell>
      <PageHeader title="Network Overview" subtitle="Real-time platform health across every participating club." />

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[0,1,2,3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Golf Clubs" value={clubs?.length ?? 0} icon={<Building2 className="h-4 w-4" />} accent="primary" />
          <KpiCard label="Total Golfers" value={(analytics?.members_total ?? 0).toLocaleString()} icon={<Globe2 className="h-4 w-4" />} />
          <KpiCard label="Bookings (30d)" value={(analytics?.bookings_30d ?? 0).toLocaleString()} icon={<CalendarCheck className="h-4 w-4" />} />
          <KpiCard label="Revenue (30d)" value={formatIDR(analytics?.revenue_30d ?? 0)} icon={<CreditCard className="h-4 w-4" />} accent="gold" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-elegant">
          <CardHeader><CardTitle>Club-branded apps</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {cLoading ? (
              <div className="space-y-2">{[0,1,2].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
            ) : (clubs ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  {/* ponytail: banner/logo not in ApiSuperAdminClub v1 — use theme_color + initial */}
                  <div className="h-9 w-9 grid place-items-center rounded-lg text-white font-bold text-sm"
                    style={{ background: c.theme_color ?? "var(--primary)" }}>
                    {c.logo_url ? <img src={c.logo_url} alt="" className="h-full w-full rounded-lg object-cover" /> : c.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.location}, {c.region}</div>
                  </div>
                </div>
                <StatusDot status={c.active ? "Online" : "Offline"} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader><CardTitle>System integration health</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {hLoading ? (
              <div className="space-y-2">{[0,1,2,3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
            ) : health ? (
              <>
                <div className="flex items-center gap-2 mb-3 text-sm">
                  <StatusDot status={health.status === "ok" ? "Online" : "Warning"} />
                  <span className="font-medium">Platform {health.status === "ok" ? "operational" : "degraded"}</span>
                </div>
                {health.checks.map((chk) => (
                  <div key={chk.name} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm font-medium">{chk.name}</span>
                    <div className="flex items-center gap-3">
                      {chk.latency_ms != null && (
                        <span className="text-xs text-muted-foreground tabular-nums">{chk.latency_ms}ms</span>
                      )}
                      <StatusDot status={chk.status === "ok" ? "Online" : "Offline"} />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-sm text-muted-foreground py-4 text-center">Health data unavailable.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
