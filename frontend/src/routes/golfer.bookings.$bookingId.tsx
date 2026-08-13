import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatIDR } from "@/lib/mockData";
import { useBooking, useClub } from "@/lib/useApi";
import { useApp } from "@/lib/appContext";
import { useState } from "react";
import { Check, QrCode, CalendarX, CalendarClock, Users, MapPin, CreditCard, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { differenceInHours, format, parseISO } from "date-fns";

export const Route = createFileRoute("/golfer/bookings/$bookingId")({
  head: () => ({ meta: [{ title: "Booking Detail · Rhapsody" }] }),
  component: BookingDetail,
});

const STATUS_STEPS = ["Confirmed", "Checked-in", "Completed"] as const;
const STATUS_LABELS: Record<string, string> = {
  "Confirmed": "Confirmed",
  "Checked-in": "Checked in",
  "Completed": "Played",
  "Cancelled": "Cancelled",
  "No-Show": "No-show",
};

function refundPolicy(hoursOut: number): { label: string; pct: number; color: string } {
  if (hoursOut > 72) return { label: "> 72 hours — full refund", pct: 100, color: "text-emerald-600 dark:text-emerald-400" };
  if (hoursOut > 24) return { label: "24–72 hours — 50% refund", pct: 50, color: "text-amber-500" };
  return { label: "< 24 hours — no refund", pct: 0, color: "text-destructive" };
}

function BookingDetail() {
  const { bookingId } = Route.useParams();
  const { cancelBooking, topUpGHV } = useApp();
  const navigate = useNavigate();
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: booking, loading: bookingLoading } = useBooking(bookingId);

  const { data: club, loading: clubLoading } = useClub(booking?.club_id ?? "");

  if (bookingLoading || clubLoading) {
    return (
      <AppShell>
        <div className="space-y-4 max-w-xl mx-auto py-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!booking) throw notFound();

  const teeDate = parseISO(booking.tee_time);
  const hoursOut = differenceInHours(teeDate, new Date());
  const isFuture = hoursOut > 0;
  const canCancel = isFuture && booking.status === "Confirmed";
  const canReschedule = hoursOut > 48 && booking.status === "Confirmed";
  const policy = refundPolicy(hoursOut);
  const refundAmount = Math.round(booking.amount * policy.pct / 100);

  const activeSteps = STATUS_STEPS.filter((s) =>
    s === "Confirmed" ||
    (s === "Checked-in" && ["Checked-in", "Completed"].includes(booking.status)) ||
    (s === "Completed" && booking.status === "Completed")
  );

  function handleCancel() {
    cancelBooking(booking!.id);
    if (refundAmount > 0) topUpGHV(refundAmount);
    setCancelOpen(false);
    toast.success("Booking cancelled", {
      description: refundAmount > 0
        ? `${formatIDR(refundAmount)} refunded to your GHV balance.`
        : "No refund applicable (< 24h cancellation).",
    });
    navigate({ to: "/golfer" });
  }

  const clubName = clubLoading ? "Loading…" : (club?.name ?? booking.club_id);
  const isCancelledOrNoShow = booking.status === "Cancelled" || booking.status === "No-Show";

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          {clubLoading
            ? <Skeleton className="h-9 w-64" />
            : <h1 className="font-display text-3xl">{clubName}</h1>
          }
          <p className="text-muted-foreground mt-1">
            {format(teeDate, "EEEE, d MMMM yyyy")} · {format(teeDate, "HH:mm")} WIB
          </p>
        </div>

        {/* Status lifecycle */}
        {!isCancelledOrNoShow ? (
          <Card className="shadow-elegant">
            <CardContent className="pt-6 pb-5">
              <div className="flex items-center gap-0">
                {STATUS_STEPS.map((step, i) => {
                  const done = activeSteps.includes(step);
                  const isLast = i === STATUS_STEPS.length - 1;
                  return (
                    <div key={step} className="flex items-center flex-1">
                      <div className="flex flex-col items-center gap-1.5 flex-1">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          <Check className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-center leading-tight">
                          {STATUS_LABELS[step]}
                        </span>
                      </div>
                      {!isLast && (
                        <div className={`h-0.5 flex-1 mx-1 rounded-full ${activeSteps.includes(STATUS_STEPS[i + 1]) ? "bg-primary" : "bg-muted"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-elegant border-destructive/30">
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-medium text-sm">{STATUS_LABELS[booking.status]}</p>
                <p className="text-xs text-muted-foreground">This booking is no longer active.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* QR Pass */}
        {booking.status === "Confirmed" && (
          <Card className="shadow-elegant">
            <CardContent className="p-6 text-center">
              <div className="text-[10px] uppercase tracking-widest text-primary mb-3">Mobile pass</div>
              <QrCode className="h-36 w-36 mx-auto text-primary" />
              <p className="font-mono text-sm mt-3">BK-{booking.id.toUpperCase()}</p>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">GH_APP</p>
            </CardContent>
          </Card>
        )}

        {/* Booking details */}
        <Card className="shadow-elegant">
          <CardHeader><CardTitle>Booking details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Detail icon={<MapPin className="h-4 w-4" />} label="Club" value={clubName} />
            <Detail icon={<Clock className="h-4 w-4" />} label="Tee time" value={`${format(teeDate, "EEEE, d MMM yyyy")} · ${format(teeDate, "HH:mm")} WIB`} />
            <Detail icon={<Users className="h-4 w-4" />} label="Players" value={`${booking.players} player${booking.players > 1 ? "s" : ""}`} />
            {(booking.partners ?? []).length > 0 && (
              <Detail icon={<Users className="h-4 w-4 opacity-0" />} label="Partners" value={(booking.partners ?? []).join(", ")} />
            )}
            <Detail icon={<CreditCard className="h-4 w-4" />} label="Amount" value={formatIDR(booking.amount)} />
            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground">Status</span>
              <div className="flex gap-2">
                <Badge variant={booking.status === "Confirmed" ? "default" : "secondary"}>
                  {STATUS_LABELS[booking.status]}
                </Badge>
                <Badge variant="outline">{booking.payment_status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {canCancel && (
          <Card className="shadow-elegant">
            <CardHeader><CardTitle>Manage booking</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {canReschedule && (
                <Button variant="outline" className="w-full" onClick={() => toast.info("Reschedule flow coming in a future update.")}>
                  <CalendarClock className="h-4 w-4 mr-2" /> Reschedule (free · rate preserved)
                </Button>
              )}
              <Button variant="destructive" className="w-full" onClick={() => setCancelOpen(true)}>
                <CalendarX className="h-4 w-4 mr-2" /> Cancel booking
              </Button>
              {!canReschedule && isFuture && (
                <p className="text-xs text-muted-foreground text-center">
                  Free reschedule only available &gt; 48 hours before tee time.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  {clubName} · {format(teeDate, "d MMM yyyy")} · {format(teeDate, "HH:mm")}
                </p>
                <div className={`rounded-lg border p-3 text-sm font-medium ${policy.color}`}>
                  {policy.label}
                </div>
                {refundAmount > 0 ? (
                  <p className="text-sm">
                    <span className="font-medium">{formatIDR(refundAmount)}</span> will be refunded to your GHV balance immediately.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No refund will be issued for this cancellation.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep booking</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex items-center gap-2 text-muted-foreground shrink-0">
        {icon} {label}
      </span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
