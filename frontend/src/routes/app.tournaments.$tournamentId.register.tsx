import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatIDR } from "@/lib/mockData";
import { useApp } from "@/lib/appContext";
import { useEvent } from "@/lib/useApi";
import { api } from "@/lib/api";
import { ChevronLeft, Plus, Trash2, UserCircle } from "lucide-react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/app/tournaments/$tournamentId/register")({
  head: () => ({ meta: [{ title: "Register · Rhapsody App" }] }),
  component: AppEventRegister,
});

const playerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
});

const formSchema = z.object({
  players: z.array(playerSchema).min(1),
});

type FormValues = z.infer<typeof formSchema>;

declare const window: Window & { snap?: { pay: (token: string, opts: object) => void } };

function AppEventRegister() {
  const { tournamentId } = Route.useParams();
  const { user } = useApp();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const { data: event, loading } = useEvent(tournamentId);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
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

  async function onSubmit(values: FormValues) {
    if (!event) return;
    setSubmitting(true);
    try {
      const result = await api.events.register(tournamentId, { players: values.players });

      if (result.status === "Confirmed") {
        // Free event — already confirmed
        toast.success("Registration successful!");
        navigate({ to: "/app/tournaments/$tournamentId", params: { tournamentId } });
        return;
      }

      if (result.snapToken) {
        // Paid event — open Midtrans Snap
        if (!window.snap) {
          toast.error("Payment gateway belum siap, coba lagi.");
          setSubmitting(false);
          return;
        }
        window.snap.pay(result.snapToken, {
          onSuccess: () => {
            toast.success("Payment successful! Registration confirmed.");
            navigate({ to: "/app/tournaments/$tournamentId", params: { tournamentId } });
          },
          onPending: () => {
            toast.info("Pembayaran pending, registrasi akan dikonfirmasi otomatis.");
            navigate({ to: "/app/tournaments/$tournamentId", params: { tournamentId } });
          },
          onError: () => {
            toast.error("Payment failed.");
            setSubmitting(false);
          },
          onClose: () => {
            setSubmitting(false);
          },
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <MobileShell>
        <div className="px-4 py-5 space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-20 rounded-xl" />
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

  return (
    <MobileShell>
      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-5 space-y-5">
        {/* Back */}
        <Link
          to="/app/tournaments/$tournamentId"
          params={{ tournamentId }}
          className="flex items-center gap-1 text-sm text-muted-foreground -ml-1"
        >
          <ChevronLeft className="h-4 w-4" /> {event.title}
        </Link>

        <h1 className="font-display text-xl">Register for Event</h1>

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
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Name *</Label>
                  <Controller
                    control={control}
                    name={`players.${index}.name`}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="Full name"
                        className={errors.players?.[index]?.name ? "border-destructive" : ""}
                      />
                    )}
                  />
                  {errors.players?.[index]?.name && (
                    <p className="text-xs text-destructive mt-1">{errors.players[index]?.name?.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">No. HP</Label>
                    <Controller
                      control={control}
                      name={`players.${index}.phone`}
                      render={({ field }) => (
                        <Input {...field} placeholder="08xx" type="tel" />
                      )}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Controller
                      control={control}
                      name={`players.${index}.email`}
                      render={({ field }) => (
                        <Input {...field} placeholder="email@..." type="email" />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add player */}
        {canAddPlayer && (
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() => append({ name: "", phone: "", email: "" })}
          >
            <Plus className="h-4 w-4" /> Add Player
          </Button>
        )}

        {!canAddPlayer && players.length < event.quota && (
          <p className="text-xs text-muted-foreground text-center">
            Sisa slot tidak cukup untuk menambah player
          </p>
        )}

        <Separator />

        {/* Summary */}
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ringkasan</p>
          <div className="flex justify-between text-sm">
            <span>{players.length} player{players.length !== 1 ? "s" : ""} × {event.entry_fee === 0 ? "Free" : formatIDR(event.entry_fee)}</span>
            <span className="font-semibold">{totalFee === 0 ? "Free" : formatIDR(totalFee)}</span>
          </div>
        </div>

        {/* Submit */}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Processing..." : totalFee === 0 ? "Confirm Registration" : `Pay ${formatIDR(totalFee)}`}
        </Button>
      </form>
    </MobileShell>
  );
}
