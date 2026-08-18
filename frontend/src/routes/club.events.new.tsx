import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/appContext";
import { api } from "@/lib/api";
import { EventForm } from "@/components/EventForm";
import type { ApiEventFormData } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/club/events/new")({
  head: () => ({ meta: [{ title: "Create Event · Club Admin" }] }),
  component: ClubEventNew,
});

function ClubEventNew() {
  const { selectedClubId } = useApp();
  const navigate = useNavigate();

  async function onSubmit(data: ApiEventFormData) {
    await api.adminEvents.create({ ...data, clubId: selectedClubId });
    toast.success("Event created as Draft.");
    navigate({ to: "/club/events" });
  }

  return (
    <AppShell>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/club/events"><ArrowLeft className="w-4 h-4 mr-1" />Back</Link>
          </Button>
        </div>
        <PageHeader title="Create Event" subtitle="Event is saved as Draft — publish whenever you're ready." />
        <EventForm onSubmit={onSubmit} submitLabel="Save as Draft" />
      </div>
    </AppShell>
  );
}
