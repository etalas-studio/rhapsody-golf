import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useSuperAdminMembers } from "@/lib/useApi";
import { useState } from "react";

export const Route = createFileRoute("/admin/members/")({
  head: () => ({ meta: [{ title: "Golfers · Superadmin" }] }),
  component: GolferList,
});

function GolferList() {
  const [q, setQ] = useState("");

  const { data: memberData, loading } = useSuperAdminMembers({
    search: q.trim() || undefined,
  });

  const members = memberData?.members ?? [];
  const total = memberData?.total ?? 0;

  return (
    <AppShell>
      <PageHeader title="Golfers" subtitle="All registered golfer accounts on the Rhapsody platform." />

      <div className="flex items-center gap-3 mb-4">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email..."
          className="max-w-xs"
        />
        <span className="text-sm text-muted-foreground ml-auto">{total.toLocaleString()} golfers</span>
      </div>

      <Card className="shadow-elegant">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
          ) : members.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground text-center">No golfers found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Golfer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">{u.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{u.rhapsody_id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.phone ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.joined_at?.slice(0, 10) ?? "—"}</TableCell>
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
