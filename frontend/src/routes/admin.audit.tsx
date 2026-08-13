import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSuperAdminAudit } from "@/lib/useApi";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Audit Log · Superadmin" }] }),
  component: Audit,
});

function Audit() {
  const { data: auditData, loading } = useSuperAdminAudit();
  const entries = auditData?.entries ?? [];

  return (
    <AppShell>
      <PageHeader title="Audit Log" subtitle="Track admin actions across the platform." />
      <Card className="shadow-elegant">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[0,1,2,3,4].map((i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground text-center">No audit entries found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Club</TableHead>
                  {/* ponytail: role/ip not in ApiAuditEntry v1 — removed those columns */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleString("en-GB")}
                    </TableCell>
                    <TableCell className="font-medium">{l.user_name ?? l.user_id ?? "—"}</TableCell>
                    <TableCell>
                      <div className="text-sm">{l.action}</div>
                      {Object.keys(l.meta).length > 0 && (
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate max-w-xs">
                          {JSON.stringify(l.meta)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {l.club_id ? (
                        <Badge variant="outline" className="text-[10px]">{l.club_id}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">network</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
