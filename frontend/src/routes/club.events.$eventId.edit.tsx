import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/appContext";
import { useAdminEvent } from "@/lib/useApi";
import { api } from "@/lib/api";
import { EventForm } from "@/components/EventForm";
import type { ApiEventFormData } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/club/events/$eventId/edit")({
  head: () => ({ meta: [{ title: "Edit Event · Club Admin" }] }),
  component: ClubEventEdit,
});

const STATUS_TRANSITIONS: Record<string, { label: string; next: string; variant: "default" | "outline" | "destructive" }[]> = {
  Draft:     [{ label: "Publish", next: "Open", variant: "default" }, { label: "Cancel", next: "Cancelled", variant: "destructive" }],
  Open:      [{ label: "Close Registration", next: "Closed", variant: "outline" }, { label: "Cancel", next: "Cancelled", variant: "destructive" }],
  Closed:    [{ label: "Mark as Completed", next: "Completed", variant: "default" }, { label: "Cancel", next: "Cancelled", variant: "destructive" }],
  Completed: [],
  Cancelled: [],
};

function ClubEventEdit() {
  const { eventId } = Route.useParams();
  const { selectedClubId } = useApp();
  const navigate = useNavigate();

  const { data: event, loading, refetch } = useAdminEvent(eventId, selectedClubId);

  async function onSubmit(data: ApiEventFormData) {
    await api.adminEvents.update(eventId, selectedClubId, data);
    toast.success("Event diperbarui.");
    refetch();
  }

  async function handleStatusChange(next: string) {
    try {
      await api.adminEvents.updateStatus(eventId, selectedClubId, next);
      toast.success(`Status diubah ke ${next}.`);
      if (next === "Cancelled") navigate({ to: "/club/events" });
      else refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function handleDelete() {
    try {
      await api.adminEvents.delete(eventId, selectedClubId);
      toast.success("Event deleted.");
      navigate({ to: "/club/events" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete event");
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="p-6 max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!event) {
    return (
      <AppShell>
        <div className="p-6 text-center text-muted-foreground">Event not found.</div>
      </AppShell>
    );
  }

  const transitions = STATUS_TRANSITIONS[event.status] ?? [];

  return (
    <AppShell>
      <div className="p-6 max-w-2xl mx-auto space-y-6">

        {/* Back */}
        <Link to="/club/events" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Events
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <PageHeader title="Edit Event" subtitle={event.title} />
        </div>

        {/* Status bar */}
        <div className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Status</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              event.status === "Open" ? "bg-primary/10 text-primary" :
              event.status === "Closed" ? "bg-amber-500/10 text-amber-600" :
              event.status === "Completed" ? "bg-emerald-500/10 text-emerald-600" :
              event.status === "Cancelled" ? "bg-destructive/10 text-destructive" :
              "bg-muted text-muted-foreground"
            }`}>{event.status}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {transitions.map((t) => (
              <Button key={t.next} size="sm" variant={t.variant} onClick={() => handleStatusChange(t.next)}>
                {t.label}
              </Button>
            ))}
            {["Draft", "Cancelled"].includes(event.status) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. The event and all related data will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <EventForm
          initial={event}
          onSubmit={onSubmit}
          submitLabel="Save Changes"
        />
      </div>
    </AppShell>
  );
}
