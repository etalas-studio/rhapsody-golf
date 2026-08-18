import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/appContext";
import { useAdminEvents } from "@/lib/useApi";
import { api } from "@/lib/api";
import type { ApiEvent } from "@/lib/api";
import { formatIDR } from "@/lib/mockData";
import { Plus, Pencil, Users, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/club/events/")({
  head: () => ({ meta: [{ title: "Events · Club Admin" }] }),
  component: ClubEvents,
});

const STATUS_OPTIONS = ["All", "Draft", "Open", "Closed", "Completed", "Cancelled"];

const STATUS_BADGE: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground hover:bg-muted",
  Open: "bg-primary text-primary-foreground hover:bg-primary",
  Closed: "bg-amber-500 text-white hover:bg-amber-500",
  Completed: "bg-emerald-500 text-white hover:bg-emerald-500",
  Cancelled: "bg-destructive text-destructive-foreground hover:bg-destructive",
};

function ClubEvents() {
  const { selectedClubId } = useApp();
  const [statusFilter, setStatusFilter] = useState("All");
  const { data: events, loading, refetch } = useAdminEvents(
    selectedClubId,
    statusFilter === "All" ? undefined : statusFilter
  );

  async function handleStatusChange(event: ApiEvent, status: string) {
    try {
      await api.adminEvents.updateStatus(event.id, selectedClubId, status);
      toast.success(`Event "${event.title}" → ${status}`);
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  return (
    <AppShell>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <PageHeader title="Events" subtitle="Manage club events & tournaments" />
          <Button asChild>
            <Link to="/club/events/new">
              <Plus className="h-4 w-4 mr-2" /> Create Event
            </Link>
          </Button>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : !events?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">No events yet.</p>
            <Button asChild variant="link" className="mt-2">
              <Link to="/club/events/new">Create your first event</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Event</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Participants</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Fee</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{e.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(parseISO(e.date), "d MMM yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_BADGE[e.status] ?? "bg-muted"}>{e.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="flex items-center justify-end gap-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {(e as ApiEvent & { slots_used?: number }).slots_used ?? 0} / {e.quota}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {e.entry_fee === 0 ? <span className="text-emerald-600 text-xs font-medium">Free</span> : formatIDR(e.entry_fee)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Quick status actions */}
                        {e.status === "Draft" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => handleStatusChange(e, "Open")}>
                            Publish
                          </Button>
                        )}
                        {e.status === "Open" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => handleStatusChange(e, "Closed")}>
                            Close
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 px-2" asChild>
                          <Link to="/club/events/$eventId/participants" params={{ eventId: e.id }}>
                            <Users className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" asChild>
                          <Link to="/club/events/$eventId/edit" params={{ eventId: e.id }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
