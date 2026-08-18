import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/mockData";
import { useApp } from "@/lib/appContext";
import { useEvent, useMyEventRegistration } from "@/lib/useApi";
import { api } from "@/lib/api";
import { openSnap } from "@/lib/snap";
import { CalendarDays, Users, MapPin, Clock, ChevronLeft, CheckCircle2, ExternalLink, Plus, Trash2, UserCircle, X, ZoomIn } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const Route = createFileRoute("/app/tournaments/$tournamentId")({
  head: () => ({ meta: [{ title: "Event · Rhapsody App" }] }),
  component: AppEventDetail,
});

const playerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
});
const formSchema = z.object({ players: z.array(playerSchema).min(1) });
type FormValues = z.infer<typeof formSchema>;


function AppEventDetail() {
  const { tournamentId } = Route.useParams();
  const { isAuthenticated, requireAuth, user } = useApp();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const { data: event, loading } = useEvent(tournamentId);
  const { data: myReg, refetch: refetchReg } = useMyEventRegistration(tournamentId);

  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      players: [{ name: user?.name ?? "", phone: (user as any)?.phone ?? "", email: user?.email ?? "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "players" });
  const players = watch("players");

  const slotsAvailable = event ? (event.slots_available ?? (event.quota - (event.slots_used ?? 0))) : 0;
  const totalFee = event ? event.entry_fee * players.length : 0;
  const canAddPlayer = players.length < slotsAvailable;

  if (loading) {
    return (
      <MobileShell>
        <div className="space-y-0">
          <Skeleton className="w-full h-48" />
          <div className="px-4 py-4 space-y-3">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          </div>
        </div>
      </MobileShell>
    );
  }

  if (!event) {
    return (
      <MobileShell>
        <div className="px-4 py-10 text-center text-muted-foreground">Event not found.</div>
      </MobileShell>
    );
  }

  const isFull = slotsAvailable <= 0;
  const deadlinePast = isPast(parseISO(event.registration_deadline));
  const isOpen = event.status === "Open";
  const isRegistered = myReg && ["Confirmed", "CheckedIn", "PendingPayment"].includes(myReg.status);
  const canRegister = isOpen && !deadlinePast && !isFull && !isRegistered;
  const canCancel = isRegistered && !deadlinePast && myReg.status !== "CheckedIn";

  const ctaLabel = isFull ? "Quota Full"
    : deadlinePast ? "Registration Closed"
    : !isOpen ? `Registration ${event.status}`
    : "Register";

  function openRegister() {
    const open = () => {
      reset({ players: [{ name: user?.name ?? "", phone: (user as any)?.phone ?? "", email: user?.email ?? "" }] });
      setSheetOpen(true);
    };
    if (!isAuthenticated) {
      requireAuth({
        title: "Sign up to register",
        description: `Join ${event!.title} — one Rhapsody ID across every club.`,
        onSuccess: open,
      });
      return;
    }
    open();
  }

  async function onSubmit(values: FormValues) {
    if (!event) return;
    setSubmitting(true);
    try {
      const result = await api.events.register(tournamentId, { players: values.players });

      if (result.status === "Confirmed") {
        toast.success("Registration successful!");
        setSheetOpen(false);
        refetchReg();
        return;
      }

      if (result.snapToken) {
        openSnap(result.snapToken, {
          onSuccess: () => {
            toast.success("Payment successful! Registration confirmed.");
            setSheetOpen(false);
            refetchReg();
          },
          onPending: () => {
            toast.info("Payment pending, registration will be confirmed automatically.");
            setSheetOpen(false);
            refetchReg();
          },
          onError: () => { toast.error("Payment failed."); setSubmitting(false); },
          onClose: () => { setSubmitting(false); },
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    try {
      await api.events.cancelRegistration(tournamentId);
      toast.success("Registration cancelled.");
      refetchReg();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    }
  }

  return (
    <MobileShell>
      {/* Hero image — tap to preview */}
      {event.hero_image_url && (
        <button
          type="button"
          className="w-full relative block"
          onClick={() => setLightboxOpen(true)}
        >
          <img src={event.hero_image_url} alt={event.title} className="w-full h-64 object-cover" />
          {/* Always-visible tap hint */}
          <div className="absolute bottom-2 right-2 bg-black/50 rounded-full p-1.5">
            <ZoomIn className="h-4 w-4 text-white" />
          </div>
        </button>
      )}

      {/* Lightbox */}
      {lightboxOpen && event.hero_image_url && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          style={{ touchAction: "none" }}
          onClick={() => setLightboxOpen(false)}
        >
          <div className="flex justify-end p-4 shrink-0">
            <button
              type="button"
              className="bg-white/10 rounded-full p-2"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden px-2 pb-8">
            <img
              src={event.hero_image_url}
              alt={event.title}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div className="px-4 py-4 space-y-5">
        {/* Back */}
        <Link to="/app/tournaments" className="flex items-center gap-1 text-sm text-muted-foreground -ml-1">
          <ChevronLeft className="h-4 w-4" /> Events
        </Link>

        {/* Header */}
        <div>
          <Badge className={isOpen && !deadlinePast ? "bg-primary text-primary-foreground hover:bg-primary" : "bg-muted text-muted-foreground hover:bg-muted"}>
            {deadlinePast && isOpen ? "Closed" : event.status}
          </Badge>
          <h1 className="font-display text-2xl mt-1">{event.title}</h1>
          <p className="text-sm text-muted-foreground">{event.clubs?.name}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard icon={<CalendarDays className="h-3.5 w-3.5" />} label="Date">
            {format(parseISO(event.date), "d MMM yyyy")}
          </StatCard>
          <StatCard icon={<Clock className="h-3.5 w-3.5" />} label="Starting time">
            {event.starting_time}
          </StatCard>
          <StatCard icon={<Users className="h-3.5 w-3.5" />} label="Quota">
            {event.slots_used ?? 0} / {event.quota} registered
          </StatCard>
          <StatCard icon={<CalendarDays className="h-3.5 w-3.5" />} label="Deadline">
            {format(parseISO(event.registration_deadline), "d MMM yyyy")}
          </StatCard>
        </div>

        {/* Venue */}
        {event.venue && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{event.venue}</span>
            </div>
            <div className="rounded-xl overflow-hidden border h-40">
              <iframe
                title="Location map"
                width="100%"
                height="100%"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(event.venue)}&output=embed`}
                className="border-0"
              />
            </div>
            <a
              href={event.maps_url ?? `https://maps.google.com?q=${encodeURIComponent(event.venue)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl border bg-card py-3 text-sm font-medium hover:bg-muted transition"
            >
              <ExternalLink className="h-4 w-4 text-primary" />
              Open in Google Maps
            </a>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {event.description}
          </p>
        )}

        {/* Registered badge */}
        {isRegistered && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <p className="font-semibold text-sm">You're registered</p>
              </div>
              <Badge className={
                myReg!.status === "Confirmed" ? "bg-primary text-primary-foreground hover:bg-primary text-xs" :
                myReg!.status === "CheckedIn" ? "bg-emerald-500 text-white hover:bg-emerald-500 text-xs" :
                "bg-amber-500 text-white hover:bg-amber-500 text-xs"
              }>
                {myReg!.status}
              </Badge>
            </div>

            {/* Players */}
            {myReg!.event_participants && myReg!.event_participants.length > 0 && (
              <>
                <Separator className="opacity-30" />
                <div className="space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Players ({myReg!.event_participants.length})
                  </p>
                  {myReg!.event_participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm">{p.name}</span>
                      {p.is_registrant && (
                        <span className="text-[10px] text-muted-foreground ml-auto">you</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Entry fee */}
        <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
          <span className="text-sm text-muted-foreground">Registration fee</span>
          <span className="font-semibold">
            {event.entry_fee === 0 ? "Free" : formatIDR(event.entry_fee)}
            <span className="text-xs font-normal text-muted-foreground"> / person</span>
          </span>
        </div>

        {/* CTA */}
        {canRegister && (
          <Button className="w-full" onClick={openRegister}>{ctaLabel}</Button>
        )}
        {!canRegister && !isRegistered && (
          <Button className="w-full" disabled>{ctaLabel}</Button>
        )}
        {canCancel && (
          <Button variant="outline" className="w-full text-destructive border-destructive/30" onClick={handleCancel}>
            Cancel Registration
          </Button>
        )}
      </div>

      {/* Register Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-2xl max-w-md mx-auto left-0 right-0 px-5">
          <SheetHeader className="mb-4">
            <SheetTitle className="font-display text-xl">Register for Event</SheetTitle>
            <p className="text-sm text-muted-foreground">{event.title}</p>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Player list */}
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <UserCircle className="h-3.5 w-3.5" />
                      {index === 0 ? "You (Registrant)" : `Player ${index + 1}`}
                    </p>
                    {index > 0 && (
                      <button type="button" onClick={() => remove(index)}
                        className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Name *</Label>
                      <Controller control={control} name={`players.${index}.name`}
                        render={({ field }) => (
                          <Input {...field} placeholder="Full name"
                            className={errors.players?.[index]?.name ? "border-destructive" : ""} />
                        )} />
                      {errors.players?.[index]?.name && (
                        <p className="text-xs text-destructive mt-1">{errors.players[index]?.name?.message}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Phone</Label>
                        <Controller control={control} name={`players.${index}.phone`}
                          render={({ field }) => <Input {...field} placeholder="08xx" type="tel" />} />
                      </div>
                      <div>
                        <Label className="text-xs">Email</Label>
                        <Controller control={control} name={`players.${index}.email`}
                          render={({ field }) => <Input {...field} placeholder="email@..." type="email" />} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {canAddPlayer && (
              <Button type="button" variant="outline" className="w-full gap-2"
                onClick={() => append({ name: "", phone: "", email: "" })}>
                <Plus className="h-4 w-4" /> Add Player
              </Button>
            )}

            <Separator />

            {/* Summary */}
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Summary</p>
              <div className="flex justify-between text-sm">
                <span>{players.length} player{players.length !== 1 ? "s" : ""} × {event.entry_fee === 0 ? "Free" : formatIDR(event.entry_fee)}</span>
                <span className="font-semibold">{totalFee === 0 ? "Free" : formatIDR(totalFee)}</span>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Processing..." : totalFee === 0 ? "Confirm Registration" : `Pay ${formatIDR(totalFee)}`}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </MobileShell>
  );
}

function StatCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
        {icon}{label}
      </p>
      <p className="font-medium text-sm mt-1">{children}</p>
    </div>
  );
}
