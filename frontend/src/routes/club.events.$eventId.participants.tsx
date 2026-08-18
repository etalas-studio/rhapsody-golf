import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useApp } from "@/lib/appContext";
import { useAdminEvent, useAdminEventRegistrations } from "@/lib/useApi";
import { api } from "@/lib/api";
import type { ApiEventRegistration } from "@/lib/api";
import { formatIDR } from "@/lib/mockData";
import { ChevronLeft, Download, CheckCircle2, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/club/events/$eventId/participants")({
  head: () => ({ meta: [{ title: "Participants · Club Admin" }] }),
  component: ClubEventParticipants,
});

const STATUS_FILTER_OPTIONS = ["All", "Confirmed", "CheckedIn", "PendingPayment", "Cancelled"];

const STATUS_BADGE: Record<string, string> = {
  Confirmed: "bg-primary text-primary-foreground",
  CheckedIn: "bg-emerald-500 text-white",
  PendingPayment: "bg-amber-500 text-white",
  Cancelled: "bg-muted text-muted-foreground",
};

function ClubEventParticipants() {
  const { eventId } = Route.useParams();
  const { selectedClubId } = useApp();
  const [statusFilter, setStatusFilter] = useState("All");

  const { data: event } = useAdminEvent(eventId, selectedClubId);
  const { data: registrations, loading, refetch } = useAdminEventRegistrations(
    eventId,
    selectedClubId,
    statusFilter === "All" ? undefined : statusFilter
  );

  async function handleAction(reg: ApiEventRegistration, status: "CheckedIn" | "Cancelled") {
    try {
      await api.adminEvents.updateRegistration(eventId, reg.id, selectedClubId, status);
      toast.success(status === "CheckedIn" ? "Participant checked in!" : "Registration cancelled.");
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  const csvUrl = api.adminEvents.exportCsvUrl(eventId, selectedClubId);

  // Flatten participants for display
  const rows = (registrations ?? []).flatMap((reg) =>
    (reg.event_participants ?? []).map((p) => ({ reg, participant: p }))
  );

  return (
    <AppShell>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Link
              to="/club/events"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Events
            </Link>
            <PageHeader
              title="Participants"
              subtitle={event?.title ?? eventId}
            />
          </div>
          <a href={csvUrl} download>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </a>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">
            {rows.length} participants
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center py-12 text-sm text-muted-foreground">No participants yet.</p>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Registrant</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Registered</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Fee</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(({ reg, participant }) => (
                  <tr key={`${reg.id}-${participant.id}`} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      {participant.name}
                      {participant.is_registrant && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">Registrant</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {reg.users?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {format(parseISO(reg.registered_at), "d MMM yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      {participant.is_registrant && (
                        <Badge className={STATUS_BADGE[reg.status] ?? "bg-muted"}>
                          {reg.status}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      {participant.is_registrant
                        ? reg.total_fee === 0 ? "Free" : formatIDR(reg.total_fee)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {participant.is_registrant && reg.status === "Confirmed" && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 text-xs text-emerald-600"
                            onClick={() => handleAction(reg, "CheckedIn")}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Check In
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive">
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel registration for {reg.users?.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Slot akan dikembalikan ke quota event. Refund dilakukan manual.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Back</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleAction(reg, "Cancelled")}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Cancel Registration
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
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
