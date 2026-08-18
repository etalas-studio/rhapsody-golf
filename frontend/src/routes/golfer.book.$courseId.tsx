import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
// ponytail: currentUser is auth stub — replace with supabase.auth.getSession() in Phase 1
import { currentUser, formatIDR } from "@/lib/mockData";
import { useApp } from "@/lib/appContext";
import { useClub, useTeeSlots, useVouchers } from "@/lib/useApi";
import { api } from "@/lib/api";
import { useState } from "react";
import { isBefore, isAfter, parseISO } from "date-fns";
import { toast } from "sonner";
import { Check, QrCode, Users, Wallet, Coins, Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/golfer/book/$courseId")({
  head: () => ({ meta: [{ title: "Book Tee Time · Rhapsody" }] }),
  component: BookPage,
});

function BookPage() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const { isAuthenticated, requireAuth, wallet, topUpGHV } = useApp();

  const { data: club, loading: clubLoading } = useClub(courseId);

  const todayDate = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayDate); d.setDate(todayDate.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const [date, setDate] = useState(dates[1]);
  const [slot, setSlot] = useState<string | null>(null);
  const [players, setPlayers] = useState(2);
  const [voucher, setVoucher] = useState("none");
  const [guests, setGuests] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState<null | { ref: string; ghvUsed: number; ghpUsed: number }>(null);
  const [confirming, setConfirming] = useState(false);

  const { data: slots, loading: slotsLoading } = useTeeSlots(courseId, date);
  const { data: myVouchers } = useVouchers(courseId);

  // ponytail: member status not in golfer API v1 — always treat as visitor; real check in Phase 3
  const isMember = false;

  const selectedSlot = (slots ?? []).find((s) => s.time === slot);
  const subtotal = selectedSlot ? selectedSlot.price * players * (isMember ? 0.75 : 1) : 0;
  const today = new Date().toISOString().slice(0, 10);
  const activeVouchers = (myVouchers ?? []).filter((v) => {
    if (v.status !== "Active") return false;
    if (v.type !== "Green Fee") return false;
    if (v.used_count >= v.quota) return false;
    if (v.min_booking_amount && subtotal < v.min_booking_amount) return false;
    try {
      if (isBefore(parseISO(v.expiry_date), parseISO(today))) return false;
      if (isAfter(parseISO(v.starts_at), parseISO(today))) return false;
    } catch { return false; }
    return true;
  });
  const selectedVoucher = activeVouchers.find((v) => v.id === voucher);
  const voucherDiscount = (() => {
    if (!selectedVoucher || !subtotal) return 0;
    const base = selectedVoucher.discount_type === "Percentage"
      ? Math.round(subtotal * (selectedVoucher.discount_value / 100))
      : selectedVoucher.discount_value;
    return selectedVoucher.max_discount_cap ? Math.min(base, selectedVoucher.max_discount_cap) : base;
  })();
  const afterVoucher = Math.max(0, subtotal - voucherDiscount);

  const maxGHV = Math.min(wallet.ghv, afterVoucher);
  const [ghvApply, setGhvApply] = useState(0);
  const ghvUsed = Math.min(ghvApply, maxGHV);
  const afterGHV = afterVoucher - ghvUsed;

  const maxGHPValue = Math.round(afterGHV * 0.2);
  const maxGHPPts = Math.min(wallet.ghp, Math.floor(maxGHPValue / 100));
  const [ghpApplyPts, setGhpApplyPts] = useState(0);
  const ghpUsedPts = Math.min(ghpApplyPts, maxGHPPts);
  const ghpUsedValue = ghpUsedPts * 100;
  const gateway = Math.max(0, afterGHV - ghpUsedValue);
  const total = gateway;

  function confirm() {
    if (!slot) return toast.error("Please select a tee time");
    if (!club) return;
    const doConfirm = async () => {
      setConfirming(true);
      try {
        const result = await api.bookings.create({
          club_id: club.id,
          tee_time: `${date}T${slot}:00`,
          players,
          voucher_id: voucher !== "none" ? voucher : undefined,
        });
        const booking = result.booking;
        if (ghvUsed > 0) topUpGHV(-ghvUsed);
        setConfirmed({ ref: booking.ref_code ?? booking.id, ghvUsed, ghpUsed: ghpUsedPts });
        toast.success("Booking confirmed", { description: `Reference ${booking.ref_code ?? booking.id}` });
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Booking gagal. Coba lagi.");
      } finally {
        setConfirming(false);
      }
    };
    if (!isAuthenticated) {
      requireAuth({
        title: "Sign up to confirm your tee time",
        description: `${club?.name ?? courseId} · ${date} · ${slot} · ${players} player${players > 1 ? "s" : ""}. One Rhapsody ID works across every club — 10 seconds to create.`,
        onSuccess: doConfirm,
      });
      return;
    }
    doConfirm();
  }

  if (clubLoading) {
    return (
      <AppShell>
        <Skeleton className="h-10 w-64 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
          <Skeleton className="hidden lg:block h-80 rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!club) {
    notFound();
    return null;
  }

  if (confirmed) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto">
          <Card className="shadow-glow">
            <CardContent className="p-8 text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-success/15 text-success grid place-items-center mx-auto">
                <Check className="h-7 w-7" />
              </div>
              <h2 className="font-display text-3xl">Tee time confirmed</h2>
              <p className="text-sm text-muted-foreground">{club.name} · {date} · {slot} · {players} player{players > 1 ? "s" : ""}</p>
              <div className="rounded-xl border-2 border-dashed border-primary/40 p-5 bg-primary/5">
                <div className="text-[10px] uppercase tracking-widest text-primary mb-2">Mobile pass</div>
                <QrCode className="h-32 w-32 mx-auto text-primary" />
                <div className="mt-3 font-mono text-sm">{confirmed.ref}</div>
                <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">GH_APP</div>
              </div>
              {(confirmed.ghvUsed > 0 || confirmed.ghpUsed > 0) && (
                <div className="rounded-lg bg-muted/50 px-4 py-3 text-xs text-left space-y-1">
                  {confirmed.ghvUsed > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GHV used</span>
                      <span className="font-medium text-primary">− {formatIDR(confirmed.ghvUsed)}</span>
                    </div>
                  )}
                  {confirmed.ghpUsed > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GHP used</span>
                      <span className="font-medium text-gold">− {confirmed.ghpUsed.toLocaleString("id-ID")} pts</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => navigate({ to: "/golfer" })}>Home</Button>
                <Button onClick={() => navigate({ to: "/golfer/courses" })}>Browse more</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 pb-24 lg:pb-0">
        <div className="min-w-0 lg:col-span-2 space-y-4 md:space-y-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl">Book at {club.name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isMember ? "Member pricing applied automatically." : "Visitor pricing — become a member for up to 25% off."}
            </p>
          </div>

          <Card className="shadow-elegant">
            <CardHeader><CardTitle>1. Choose date</CardTitle></CardHeader>
            <CardContent className="flex gap-2 overflow-x-auto pb-1">
              {dates.map((d) => {
                const dt = new Date(d);
                const active = d === date;
                return (
                  <button key={d} onClick={() => { setDate(d); setSlot(null); }}
                    className={`min-w-[78px] rounded-xl border p-3 text-center transition ${active ? "bg-primary text-primary-foreground border-primary shadow-elegant" : "bg-card hover:border-primary/40"}`}>
                    <div className="text-[10px] uppercase opacity-80">{dt.toLocaleDateString("en-GB", { weekday: "short" })}</div>
                    <div className="font-display text-xl">{dt.getDate()}</div>
                    <div className="text-[10px] opacity-80">{dt.toLocaleDateString("en-GB", { month: "short" })}</div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader><CardTitle>2. Choose tee time</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {slotsLoading ? (
                [...Array(12)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
              ) : (slots ?? []).length === 0 ? (
                <div className="col-span-6 text-sm text-muted-foreground py-4">No slots available for this date.</div>
              ) : (
                (slots ?? []).map((s) => (
                  <button key={s.time} disabled={!s.available} onClick={() => setSlot(s.time)}
                    className={`min-w-0 rounded-lg border px-1.5 py-2 text-center transition ${
                      slot === s.time ? "bg-primary text-primary-foreground border-primary shadow-elegant" :
                      s.available ? "bg-card hover:border-primary/40" : "opacity-40 cursor-not-allowed bg-muted"
                    }`}>
                    <div className="font-semibold text-sm tabular-nums">{s.time}</div>
                    <div className="text-[9px] opacity-80 truncate">{formatIDR(s.price)}</div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader><CardTitle>3. Players & preferences</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Number of players</Label>
                <div className="flex gap-2 mt-1.5">
                  {[1, 2, 3, 4].map((n) => (
                    <Button key={n} variant={players === n ? "default" : "outline"} size="sm"
                      onClick={() => { setPlayers(n); setGuests(Array(n - 1).fill("")); }}>
                      <Users className="h-3.5 w-3.5 mr-1" /> {n}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <Label>Players in this booking</Label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  You're player 1. Verified via your Rhapsody ID — name can't be edited here. {players > 1 && "Add your guests below."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded-lg border bg-muted/40 px-3 py-2 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Player 1 · You</div>
                      <div className="text-sm font-medium truncate">{currentUser.name}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">Rhapsody ID</Badge>
                  </div>
                  {Array.from({ length: players - 1 }).map((_, i) => (
                    <div key={i} className="rounded-lg border bg-card px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Player {i + 2} · Guest</div>
                      <Input
                        placeholder={`Guest ${i + 1} name`}
                        value={guests[i] || ""}
                        onChange={(e) => { const g = [...guests]; g[i] = e.target.value; setGuests(g); }}
                        className="h-8"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader><CardTitle>4. Apply voucher</CardTitle></CardHeader>
            <CardContent>
              <Select value={voucher} onValueChange={setVoucher}>
                <SelectTrigger><SelectValue placeholder="Select voucher" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No voucher</SelectItem>
                  {activeVouchers.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.voucher_code} · {v.discount_type === "Percentage" ? `${v.discount_value}% off` : formatIDR(v.discount_value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeVouchers.length === 0 && <div className="text-xs text-muted-foreground mt-2">No active vouchers for this club.</div>}
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" /> 5. Use GHV balance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Available GHV</span>
                <span className="font-medium">{formatIDR(wallet.ghv)}</span>
              </div>
              {afterVoucher > 0 && maxGHV > 0 ? (
                <>
                  <Slider min={0} max={maxGHV} step={50000} value={[ghvUsed]} onValueChange={([v]) => setGhvApply(v)} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Rp 0</span>
                    <span className="text-primary font-medium">Using {formatIDR(ghvUsed)}</span>
                    <span>{formatIDR(maxGHV)}</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {wallet.ghv === 0 ? "No GHV balance — top-up in Wallet." : "Select a tee time first."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-gold" /> 6. Use GHP points
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Available GHP</span>
                <span className="font-medium">{wallet.ghp.toLocaleString("id-ID")} pts</span>
              </div>
              {afterGHV > 0 && maxGHPPts > 0 ? (
                <>
                  <Slider min={0} max={maxGHPPts} step={1} value={[ghpUsedPts]} onValueChange={([v]) => setGhpApplyPts(v)} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0 pts</span>
                    <span className="text-gold font-medium">
                      {ghpUsedPts.toLocaleString("id-ID")} pts = {formatIDR(ghpUsedValue)}
                    </span>
                    <span>{maxGHPPts.toLocaleString("id-ID")} pts</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Max 20% of remaining balance · 1 pt = Rp 100</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {wallet.ghp === 0 ? "No GHP points — earn by completing bookings." : "Select a tee time first."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="hidden lg:block">
          <Card className="shadow-glow sticky top-24">
            <CardHeader><CardTitle>Price summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label={`Green fee × ${players}`} value={formatIDR(selectedSlot ? selectedSlot.price * players : 0)} strike={isMember} />
              {isMember && selectedSlot && (
                <Row label="Member discount (25%)" value={`− ${formatIDR(selectedSlot.price * players * 0.25)}`} accent />
              )}
              {voucherDiscount > 0 && <Row label="Voucher" value={`− ${formatIDR(voucherDiscount)}`} accent />}
              {ghvUsed > 0 && <Row label="GHV applied" value={`− ${formatIDR(ghvUsed)}`} accent />}
              {ghpUsedValue > 0 && <Row label={`GHP (${ghpUsedPts.toLocaleString()} pts)`} value={`− ${formatIDR(ghpUsedValue)}`} accent />}
              <div className="border-t pt-3 flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {gateway > 0 ? "To gateway" : "Total"}
                </div>
                <div className="font-display text-2xl">{formatIDR(total)}</div>
              </div>
              {gateway > 0 && (
                <p className="text-[10px] text-muted-foreground text-center">Remainder charged via saved payment method</p>
              )}
              <Badge variant="secondary" className="w-full justify-center py-1.5">Tokenised payment — no card data stored</Badge>
              <Button className="w-full h-11" onClick={confirm} disabled={confirming}>
                {confirming ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Confirming…</> : "Confirm booking"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:hidden fixed left-0 right-0 bottom-[64px] z-40 pb-[env(safe-area-inset-bottom)] bg-card/85 backdrop-blur-xl border-t border-border shadow-glow">
          <div className="px-4 pt-3 pb-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {selectedSlot ? `${date.slice(5)} · ${slot} · ${players}P` : "Select a tee time"}
              </div>
              <div className="font-display text-xl leading-tight truncate">{formatIDR(total)}</div>
              {isMember && selectedSlot && (
                <div className="text-[10px] text-success">Member 25% applied</div>
              )}
            </div>
            <Button className="h-11 px-5 shrink-0" onClick={confirm} disabled={!slot || confirming}>
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value, strike, accent }: { label: string; value: string; strike?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${strike ? "line-through opacity-60" : ""} ${accent ? "text-success" : ""}`}>{value}</span>
    </div>
  );
}

