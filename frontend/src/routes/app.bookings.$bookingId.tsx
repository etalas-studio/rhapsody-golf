import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { MobileShell } from "@/components/MobileShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatIDR } from "@/lib/mockData";
import { useBooking, useClub } from "@/lib/useApi";
import { api } from "@/lib/api";
import { useState } from "react";
import { Check, QrCode, AlertCircle, MapPin, Clock, Users, CreditCard, CalendarX, ChevronLeft, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { differenceInHours, format, parseISO } from "date-fns";
import { openSnap } from "@/lib/snap";


export const Route = createFileRoute("/app/bookings/$bookingId")({
  head: () => ({ meta: [{ title: "Booking · Rhapsody App" }] }),
  component: AppBookingDetail,
});

const STATUS_STEPS = ["PendingPayment", "Confirmed", "CheckedIn", "Completed"] as const;
const STATUS_LABELS: Record<string, string> = {
  "PendingPayment": "Payment",
  "Confirmed": "Confirmed",
  "CheckedIn": "Checked in",
  "Completed": "Played",
  "Cancelled": "Cancelled",
  "NoShow": "No-show",
};

function refundPolicy(hoursOut: number) {
  if (hoursOut > 72) return { label: "> 72h — full refund", pct: 100, color: "text-emerald-400" };
  if (hoursOut > 24) return { label: "24–72h — 50% refund", pct: 50, color: "text-amber-400" };
  return { label: "< 24h — no refund", pct: 0, color: "text-destructive" };
}

function AppBookingDetail() {
  const { bookingId } = Route.useParams();
  const navigate = useNavigate();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const { data: booking, loading: bookingLoading, refetch } = useBooking(bookingId);
  const { data: club } = useClub(booking?.club_id ?? "");

  if (bookingLoading) return (
    <MobileShell><div className="px-4 py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></MobileShell>
  );
  if (!booking) throw notFound();

  const teeDate = parseISO(booking.tee_time);
  const hoursOut = differenceInHours(teeDate, new Date());
  const canCancel = ["PendingPayment", "Confirmed"].includes(booking.status);
  const policy = refundPolicy(hoursOut);
  const refundAmount = booking.status === "PendingPayment" ? 0 : Math.round(booking.amount * policy.pct / 100);

  const isCancelledOrNoShow = booking.status === "Cancelled" || booking.status === "NoShow";
  const STEP_ORDER = ["PendingPayment", "Confirmed", "CheckedIn", "Completed"];
  // For Completed, push index past all steps so every step renders as "past" (checkmark).
  const currentIdx = booking.status === "Completed" ? STEP_ORDER.length : STEP_ORDER.indexOf(booking.status);
  const activeSteps = STATUS_STEPS.filter((s) => STEP_ORDER.indexOf(s) < currentIdx);

  async function handleCancel() {
    setCancelLoading(true);
    try {
      await api.bookings.updateStatus(bookingId, "Cancelled");
      setCancelOpen(false);
      toast.success("Booking dibatalkan", {
        description: refundAmount > 0 ? `${formatIDR(refundAmount)} dikembalikan ke GHV.` : undefined,
      });
      navigate({ to: "/app/bookings" });
    } catch {
      toast.error("Gagal membatalkan booking. Coba lagi.");
    } finally {
      setCancelLoading(false);
    }
  }

  async function handlePay() {
    setPayLoading(true);
    try {
      const { snap_token } = await api.bookings.snapToken(bookingId);
      openSnap(snap_token, {
        onSuccess: () => {
          toast.success("Pembayaran berhasil!");
          refetch();
        },
        onPending: () => toast.info("Menunggu konfirmasi pembayaran."),
        onClose: () => toast("Pembayaran belum selesai."),
        onError: () => toast.error("Pembayaran gagal. Coba lagi."),
      });
    } catch {
      toast.error("Gagal memuat halaman pembayaran. Coba lagi.");
    } finally {
      setPayLoading(false);
    }
  }

  const clubName = club?.name ?? booking.club_id;

  return (
    <MobileShell>
      <div className="px-4 py-5 space-y-4">
        {/* Back */}
        <Link to="/app/bookings" className="flex items-center gap-1 text-sm text-muted-foreground -ml-1">
          <ChevronLeft className="h-4 w-4" /> Bookings
        </Link>

        {/* Header */}
        <div>
          <h1 className="font-display text-2xl">{clubName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(teeDate, "EEE, d MMM yyyy · HH:mm")} WIB
          </p>
        </div>

        {/* Status stepper */}
        {!isCancelledOrNoShow ? (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center">
              {STATUS_STEPS.map((step, i) => {
                const stepIdx = STEP_ORDER.indexOf(step);
                const past = stepIdx < currentIdx;
                const current = stepIdx === currentIdx && currentIdx < STEP_ORDER.length;
                const isLast = i === STATUS_STEPS.length - 1;
                const nextPast = !isLast && STEP_ORDER.indexOf(STATUS_STEPS[i + 1]) < currentIdx;
                return (
                  <Fragment key={step}>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center",
                        past    ? "bg-primary text-primary-foreground"
                        : current ? "border-2 border-primary bg-background"
                        :           "bg-muted text-muted-foreground"
                      )}>
                        {past && <Check className="h-3.5 w-3.5" />}
                        {current && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <span className={cn(
                        "text-[9px] uppercase tracking-wider text-center leading-tight w-16",
                        current && "text-primary font-semibold"
                      )}>
                        {STATUS_LABELS[step]}
                      </span>
                    </div>
                    {!isLast && (
                      <div className={`h-0.5 flex-1 mx-2 mb-4 rounded-full ${nextPast ? "bg-primary" : "bg-muted"}`} />
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-destructive/30 bg-card p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-sm">{STATUS_LABELS[booking.status]}</p>
              <p className="text-xs text-muted-foreground">This booking is no longer active.</p>
            </div>
          </div>
        )}

        {/* QR pass */}
        {booking.status === "Confirmed" && (
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-[10px] uppercase tracking-widest text-primary mb-3">Mobile pass</p>
            <QrCode className="h-28 w-28 mx-auto text-primary" />
            <p className="font-mono text-sm mt-3">BK-{booking.id.toUpperCase()}</p>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">GH_APP</p>
          </div>
        )}

        {/* Details */}
        <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-3 text-sm">
          <Detail icon={<MapPin className="h-4 w-4" />} label="Club" value={clubName} />
          <Detail
            icon={<Clock className="h-4 w-4" />}
            label="Tee time"
            value={
              format(teeDate, "EEE, d MMM · HH:mm") +
              (booking.tee_end_time ? `–${booking.tee_end_time}` : "") +
              " WIB"
            }
          />
          <Detail icon={<Users className="h-4 w-4" />} label="Players" value={`${booking.players} player${booking.players > 1 ? "s" : ""}`} />
          {booking.voucher ? (
            <>
              <Detail icon={<CreditCard className="h-4 w-4" />} label="Green fee" value={formatIDR(booking.subtotal ?? booking.amount)} />
              <Detail
                icon={<Tag className="h-4 w-4 text-primary" />}
                label={`Voucher · ${booking.voucher.voucher_code}`}
                value={`-${formatIDR(booking.discount_amount ?? 0)}`}
                valueClass="text-primary"
              />
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-sm font-semibold">Total</span>
                <span className="font-display text-base font-semibold">{formatIDR(booking.amount)}</span>
              </div>
            </>
          ) : (
            <Detail icon={<CreditCard className="h-4 w-4" />} label="Amount" value={formatIDR(booking.amount)} />
          )}
          <div className="flex items-center justify-between pt-1 border-t">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={booking.status === "Confirmed" ? "default" : "secondary"}>
              {STATUS_LABELS[booking.status] ?? booking.status}
            </Badge>
          </div>
        </div>

        {/* Pay */}
        {booking.status === "PendingPayment" && (
          <Button className="w-full" onClick={handlePay} disabled={payLoading}>
            {payLoading
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <CreditCard className="h-4 w-4 mr-2" />}
            Bayar Sekarang
          </Button>
        )}

        {/* Cancel */}
        {canCancel && (
          <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setCancelOpen(true)}>
            <CalendarX className="h-4 w-4 mr-2" /> Batalkan Booking
          </Button>
        )}
      </div>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent className="max-w-[360px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan booking ini?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>{clubName} · {format(teeDate, "d MMM · HH:mm")}</p>
                {booking.status === "PendingPayment"
                  ? <p className="text-sm text-muted-foreground">Pembayaran belum dilakukan — slot akan tersedia kembali.</p>
                  : refundAmount > 0
                    ? <><p className={`text-sm font-medium ${policy.color}`}>{policy.label}</p><p className="text-sm">{formatIDR(refundAmount)} dikembalikan ke GHV.</p></>
                    : <p className="text-sm text-muted-foreground">Tidak ada refund (kurang dari 24 jam).</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelLoading}>Kembali</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelLoading}
              onClick={(e) => { e.preventDefault(); handleCancel(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Batalkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileShell>
  );
}

function Detail({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-muted-foreground shrink-0">{icon} {label}</span>
      <span className={`font-medium text-right ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}
