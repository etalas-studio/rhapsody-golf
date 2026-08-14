import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatIDR } from "@/lib/mockData";
import { useApp } from "@/lib/appContext";
import { useClub, useVouchers } from "@/lib/useApi";
import type { ApiVoucher } from "@/lib/api";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Check, QrCode, ChevronLeft, Loader2, FileText, Clock, Tag } from "lucide-react";
import { api } from "@/lib/api";
import { isAfter, isBefore, parseISO } from "date-fns";

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: {
        onSuccess?: (result: unknown) => void;
        onPending?: (result: unknown) => void;
        onError?: (result: unknown) => void;
        onClose?: () => void;
      }) => void;
    };
  }
}

const searchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.string().regex(/^\d{2}:\d{2}$/),
  price: z.coerce.number().optional(),
});

export const Route = createFileRoute("/app/book/$courseId")({
  head: () => ({ meta: [{ title: "Book Tee Time · Rhapsody App" }] }),
  validateSearch: searchSchema,
  component: AppBookPage,
});

function slotEnd(time: string) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + 30;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function teeLabel(slot: string) {
  const mins = slot.split(":").map(Number).reduce((h, m) => h * 60 + m);
  if (mins <= 10 * 60 + 30) return "Early";
  if (mins <= 13 * 60 + 30) return "Prime";
  return "Twilight";
}

function AppBookPage() {
  const { courseId } = Route.useParams();
  const { date, slot, price: searchPrice } = Route.useSearch();
  const navigate = useNavigate();
  const { isAuthenticated, requireAuth } = useApp();
  const { data: club, loading: clubLoading } = useClub(courseId);

  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState<{ ref: string; orderId?: string; pending?: boolean } | null>(null);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>("__none__");

  const { data: allVouchers } = useVouchers(club?.id);

  const today = new Date().toISOString().slice(0, 10);
  // slotPrice for min_booking_amount check — use searchPrice here (club guard is below)
  const bookingPrice = searchPrice ?? club?.starting_price ?? 0;
  const validVouchers = useMemo((): ApiVoucher[] => {
    if (!allVouchers) return [];
    return allVouchers.filter((v) => {
      if (v.status !== "Active") return false;
      if (v.type !== "Green Fee") return false;
      if (v.used_count >= v.quota) return false;
      if (v.min_booking_amount && bookingPrice < v.min_booking_amount) return false;
      try {
        if (isBefore(parseISO(v.expiry_date), parseISO(today))) return false;
        if (isAfter(parseISO(v.starts_at), parseISO(today))) return false;
      } catch { return false; }
      return true;
    });
  }, [allVouchers, today, bookingPrice]);

  const selectedVoucher = validVouchers.find((v) => v.id === selectedVoucherId && selectedVoucherId !== "__none__") ?? null;

  // Load Midtrans Snap.js client-side only
  useEffect(() => {
    if (document.getElementById("midtrans-snap")) return;
    const script = document.createElement("script");
    script.id = "midtrans-snap";
    script.src = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === "true"
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", import.meta.env.VITE_MIDTRANS_CLIENT_KEY ?? "");
    document.body.appendChild(script);
  }, []);

  if (clubLoading) {
    return (
      <MobileShell>
        <div className="px-4 py-5 space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      </MobileShell>
    );
  }

  if (!club) {
    return (
      <MobileShell>
        <div className="px-4 py-10 text-center text-muted-foreground">Course not found.</div>
      </MobileShell>
    );
  }

  const slotPrice = searchPrice ?? club.starting_price ?? 0;

  function calcDiscount(voucher: ApiVoucher | null): number {
    if (!voucher) return 0;
    if (voucher.discount_type === "FixedAmount") return Math.min(voucher.discount_value, slotPrice);
    const raw = Math.floor(slotPrice * (voucher.discount_value / 100));
    return voucher.max_discount_cap ? Math.min(raw, voucher.max_discount_cap) : raw;
  }

  const discountAmount = calcDiscount(selectedVoucher);
  const totalAfterVoucher = slotPrice - discountAmount;

  async function confirm() {
    const doConfirm = async () => {
      if (!club) return;
      setConfirming(true);
      try {
        const result = await api.bookings.create({
          club_id: club.id,
          tee_time: `${date}T${slot}:00`,
          players: 1,
          voucher_id: selectedVoucher?.voucher_code ?? undefined,
          notes: notes.trim() || undefined,
        });

        if (!window.snap) {
          toast.error("Payment system not loaded. Please refresh and try again.");
          setConfirming(false);
          return;
        }

        window.snap.pay(result.snapToken, {
          onSuccess: () => {
            let attempts = 0;
            const poll = async (): Promise<void> => {
              try {
                const status = await api.payments.status(result.orderId);
                if (status.status === "Confirmed") {
                  setConfirmed({ ref: result.booking.id, orderId: result.orderId });
                  return;
                }
              } catch (_) { /* keep polling */ }
              if (++attempts < 10) setTimeout(poll, 1500);
              else setConfirmed({ ref: result.booking.id, orderId: result.orderId });
            };
            poll();
          },
          onPending: () => {
            toast("Pembayaran pending — kami konfirmasi setelah pembayaran diterima.");
            setConfirmed({ ref: result.booking.id, orderId: result.orderId, pending: true });
          },
          onError: () => {
            toast.error("Pembayaran gagal. Silakan coba lagi.");
            setConfirming(false);
          },
          onClose: () => {
            toast("Popup ditutup. Klik bayar untuk melanjutkan.");
            setConfirming(false);
          },
        });
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Booking gagal. Coba lagi.");
        setConfirming(false);
      }
    };

    if (!isAuthenticated) {
      requireAuth({
        title: "Sign up to confirm",
        description: `${club?.name} · ${date} · ${slot}`,
        onSuccess: doConfirm,
      });
      return;
    }
    await doConfirm();
  }

  // ── Success / Pending screen ──
  if (confirmed) {
    return (
      <MobileShell>
        <div className="px-4 py-10 text-center space-y-5">
          <div className={`h-16 w-16 rounded-full grid place-items-center mx-auto ${
            confirmed.pending
              ? "bg-amber-500/15 text-amber-500"
              : "bg-emerald-500/15 text-emerald-400"
          }`}>
            <Check className="h-8 w-8" />
          </div>

          <div>
            <h2 className="font-display text-2xl">
              {confirmed.pending ? "Pembayaran Pending" : "Booking Confirmed!"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {confirmed.pending
                ? "Kami akan konfirmasi setelah pembayaran diterima."
                : `${club.name} · ${formatDate(date)} · ${slot}–${slotEnd(slot)}`}
            </p>
          </div>

          {!confirmed.pending && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mx-auto max-w-xs">
              <p className="text-[10px] uppercase tracking-widest text-primary mb-3">Mobile pass</p>
              <QrCode className="h-28 w-28 mx-auto text-primary" />
              <p className="font-mono text-sm mt-3 break-all">{confirmed.orderId ?? confirmed.ref}</p>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">GH_APP</p>
            </div>
          )}

          <div className="flex gap-2 justify-center pt-2">
            <Button variant="outline" onClick={() => navigate({ to: "/app" })}>Home</Button>
            <Button onClick={() => navigate({ to: "/app/bookings" })}>My Bookings</Button>
          </div>
        </div>
      </MobileShell>
    );
  }

  // ── Booking form ──
  return (
    <MobileShell>
      <div className="pb-24">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => navigate({ to: "/app/courses/$courseId", params: { courseId }, search: {} })}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-display text-lg truncate">{club.name}</h1>
            <p className="text-xs text-muted-foreground">{formatDate(date)}</p>
          </div>
        </div>

        <div className="px-4 py-5 space-y-4">
          {/* Tee time summary card */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-semibold">{slot} – {slotEnd(slot)}</span>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {teeLabel(slot)}
              </span>
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Green fee · 1 pax</span>
              <span className="font-semibold font-display text-base">{formatIDR(slotPrice)}</span>
            </div>
          </div>

          {/* Voucher selection — only shown if valid vouchers exist */}
          {validVouchers.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                <Tag className="inline h-3 w-3 mr-1" />Voucher
              </label>
              <Select value={selectedVoucherId} onValueChange={setSelectedVoucherId}>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="Select voucher (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No voucher</SelectItem>
                  {validVouchers.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <span className="font-mono text-xs mr-1.5">{v.voucher_code}</span>
                      {v.discount_type === "Percentage"
                        ? `${v.discount_value}% off`
                        : formatIDR(v.discount_value)}
                      {v.max_discount_cap ? ` (max ${formatIDR(v.max_discount_cap)})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedVoucher && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                  <Badge variant="outline" className="text-[10px]">{selectedVoucher.type}</Badge>
                  <span className="text-xs text-muted-foreground flex-1">{selectedVoucher.title}</span>
                  <span className="text-xs font-semibold text-primary">-{formatIDR(discountAmount)}</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Note for the club <span className="font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special requests, dietary needs, etc."
              rows={3}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>

          {/* T&C */}
          {club.terms_and_conditions && (
            <Accordion type="single" collapsible className="rounded-xl border bg-card">
              <AccordionItem value="tc" className="border-0">
                <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Terms &amp; conditions
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 text-xs text-muted-foreground">
                  <p className="whitespace-pre-line leading-relaxed">{club.terms_and_conditions}</p>
                  <p className="mt-3 italic">With confirming, you agree to the club's terms &amp; conditions.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      </div>

      {/* Sticky pay button */}
      <div className="fixed bottom-16 left-0 right-0 max-w-lg mx-auto px-4 pb-3 pt-2 bg-background/95 backdrop-blur border-t border-border">
        <div className="space-y-0.5 mb-2 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Green fee</span>
            <span>{formatIDR(slotPrice)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex items-center justify-between text-primary">
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />{selectedVoucher?.voucher_code}
              </span>
              <span>-{formatIDR(discountAmount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between font-semibold pt-0.5 border-t border-border mt-0.5">
            <span>Total</span>
            <span className="font-display text-lg">{formatIDR(totalAfterVoucher)}</span>
          </div>
        </div>
        <Button
          size="lg"
          className="w-full shadow-glow"
          disabled={confirming}
          onClick={confirm}
        >
          {confirming
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : "Bayar Sekarang"}
        </Button>
      </div>
    </MobileShell>
  );
}
