import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/appContext";
import { formatHandicap, formatIDR } from "@/lib/mockData";
import { useAdminMembers } from "@/lib/useApi";
import { useState } from "react";

export const Route = createFileRoute("/club/members/")({
  head: () => ({ meta: [{ title: "Members · Club Admin" }] }),
  component: Members,
});

const STATUS_FILTERS = ["All", "Paid Member", "Visitor", "Inactive"];

function Members() {
  const { selectedClubId } = useApp();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");

  const { data: memberData, loading } = useAdminMembers({
    clubId: selectedClubId,
    search: q.trim() || undefined,
    status: status !== "All" ? status : undefined,
  });

  const members = memberData?.members ?? [];
  const total = memberData?.total ?? 0;

  return (
    <AppShell>
      <PageHeader
        title="Member Management"
        subtitle="Members and visitors related to your club only. Other clubs' activity is hidden by design."
      />

      <Card className="mb-4 shadow-elegant">
        <CardContent className="p-4 flex flex-wrap gap-2 items-center">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or Rhapsody ID…"
            className="max-w-xs"
          />
          {STATUS_FILTERS.map((f) => (
            <Button key={f} variant={status === f ? "default" : "outline"} size="sm" onClick={() => setStatus(f)}>{f}</Button>
          ))}
          <div className="ml-auto text-sm text-muted-foreground">{total} members</div>
        </CardContent>
      </Card>

      <Card className="shadow-elegant">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[0,1,2,3,4].map((i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
          ) : members.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground text-center">No members found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Rhapsody ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">HCP</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Spending</TableHead>
                  <TableHead className="text-right">Loyalty pts</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link to="/club/members/$memberId" params={{ memberId: m.id }} className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">{m.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{m.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{m.rhapsody_id}</TableCell>
                    <TableCell>
                      <Badge
                        variant={m.membership_status === "Paid Member" ? "default" : "secondary"}
                        className={m.membership_status === "Paid Member" ? "bg-primary" : ""}
                      >
                        {m.membership_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {m.handicap != null ? formatHandicap(m.handicap) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{m.total_bookings ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatIDR(m.total_spent ?? 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{(m.loyalty_points ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.joined_at.slice(0, 10)}</TableCell>
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
