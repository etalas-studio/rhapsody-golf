import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader, StatusDot } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHealthStatus, useSuperAdminClubs } from "@/lib/useApi";

export const Route = createFileRoute("/admin/integrations")({
  head: () => ({ meta: [{ title: "Integration Monitoring · Superadmin" }] }),
  component: Integrations,
});

function Integrations() {
  const { data: clubs, loading: cLoading } = useSuperAdminClubs();
  const { data: health, loading: hLoading } = useHealthStatus();

  return (
    <AppShell>
      <PageHeader title="Integration Monitoring" subtitle="Platform system health and per-club status." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-elegant">
          <CardHeader><CardTitle>Platform health</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {hLoading ? (
              <div className="space-y-2">{[0,1,2,3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
            ) : health ? (
              <>
                <div className="flex items-center gap-2 rounded-lg border p-3 mb-2">
                  <StatusDot status={health.status === "ok" ? "Online" : "Warning"} />
                  <span className="font-medium text-sm">Overall: {health.status === "ok" ? "All systems operational" : "Degraded"}</span>
                </div>
                {health.checks.map((chk) => (
                  <div key={chk.name} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">{chk.name}</span>
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

        <Card className="shadow-elegant">
          <CardHeader><CardTitle>Clubs on platform</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {cLoading ? (
              <div className="space-y-2">{[0,1,2,3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
            ) : (clubs ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">No clubs registered.</div>
            ) : (clubs ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  {/* ponytail: per-club sync status not in API v1 — derive from club.active */}
                  <div className="h-7 w-7 rounded grid place-items-center text-white text-xs font-bold"
                    style={{ background: c.theme_color ?? "var(--primary)" }}>
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground">{c.location}, {c.region}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground tabular-nums">{c.paid_member_count} paid members</span>
                  <StatusDot status={c.active ? "Online" : "Offline"} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ponytail: per-club sync details (membership_sync, teesheet_sync, pos_sync, payment_sync, loyalty_sync)
          not in ApiSuperAdminClub v1 — add when backend exposes /api/superadmin/clubs/:id/integration */}
    </AppShell>
  );
}
