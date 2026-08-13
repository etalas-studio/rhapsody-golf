import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/mockData";
import { useApp } from "@/lib/appContext";
import { useLoyaltyBalances } from "@/lib/useApi";
import { Wallet, Coins, Plus, Shield, Sparkles } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/wallet")({
  head: () => ({ meta: [{ title: "Wallet · Rhapsody App" }] }),
  component: AppWallet,
});

const TOP_UP_AMOUNTS = [500_000, 1_000_000, 2_000_000, 5_000_000];
const TOP_UP_METHODS = ["Bank Transfer", "QRIS", "GoPay", "OVO", "Dana"];

function AppWallet() {
  const { wallet, topUpGHV } = useApp();
  const { data: balances, loading } = useLoyaltyBalances();

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(1_000_000);
  const [topUpMethod, setTopUpMethod] = useState(TOP_UP_METHODS[0]);
  const [topUpDone, setTopUpDone] = useState(false);
  const [tab, setTab] = useState<"ghv" | "ghp">("ghv");

  function handleTopUp() {
    topUpGHV(topUpAmount);
    setTopUpDone(true);
  }

  function closeTopUp() {
    setTopUpOpen(false);
    setTopUpDone(false);
    setTopUpAmount(1_000_000);
    setTopUpMethod(TOP_UP_METHODS[0]);
  }

  const totalPts = balances?.reduce((sum, b) => sum + b.points, 0) ?? 0;

  return (
    <MobileShell>
      {/* Balance header */}
      <div className="bg-gradient-hero px-4 pt-4 pb-6">
        <p className="text-xs text-white/60 uppercase tracking-widest mb-4">My Wallet</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 backdrop-blur p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-white/70" />
              <span className="text-[11px] text-white/60 uppercase tracking-widest">GHV</span>
            </div>
            <p className="font-display text-xl text-white tabular-nums leading-tight">{formatIDR(wallet.ghv)}</p>
            <p className="text-[10px] text-white/50 mt-0.5">Cash equivalent</p>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur p-4">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-4 w-4 text-gold/80" />
              <span className="text-[11px] text-white/60 uppercase tracking-widest">GHP</span>
            </div>
            {loading ? (
              <Skeleton className="h-7 w-20 bg-white/10" />
            ) : (
              <p className="font-display text-xl text-white tabular-nums leading-tight">
                {totalPts.toLocaleString("id-ID")}
                <span className="text-sm font-sans text-white/60"> pts</span>
              </p>
            )}
            <p className="text-[10px] text-white/50 mt-0.5">1 pt ≈ Rp 100</p>
          </div>
        </div>
        <Button size="sm" className="w-full mt-4 shadow-glow" onClick={() => setTopUpOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Top-up GHV
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card sticky top-14 z-10">
        {(["ghv", "ghp"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-medium uppercase tracking-widest transition-colors ${tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* GHP breakdown by club (real data) */}
      {tab === "ghp" && (
        <div className="p-4 space-y-3">
          {loading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)
          ) : (balances ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No points yet. Complete a booking to start earning.</p>
          ) : (
            (balances ?? []).map((b) => (
              <div key={b.club_id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-gold" />
                  <p className="text-sm font-medium">{b.club_name}</p>
                </div>
                <span className="text-sm font-semibold text-gold">{b.points.toLocaleString()} pts</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* GHV — no transaction history endpoint yet */}
      {tab === "ghv" && (
        <div className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            GHV balance is redeemable at checkout across all partner clubs.
          </p>
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Transaction history coming soon.</p>
          </div>
        </div>
      )}

      {/* Top-up dialog */}
      <Dialog open={topUpOpen} onOpenChange={(v) => { if (!v) closeTopUp(); }}>
        <DialogContent className="max-w-[360px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Top-up GHV</DialogTitle>
            <DialogDescription>Mock flow — no real transaction.</DialogDescription>
          </DialogHeader>

          {topUpDone ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold">Top-up successful</p>
              <p className="text-sm text-muted-foreground mt-1">{formatIDR(topUpAmount)} added to GHV.</p>
              <Button className="mt-6 w-full" onClick={closeTopUp}>Done</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Amount</p>
                <div className="grid grid-cols-2 gap-2">
                  {TOP_UP_AMOUNTS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setTopUpAmount(a)}
                      className={`rounded-xl border px-3 py-3 text-sm text-center transition-colors ${topUpAmount === a ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:border-primary/50"}`}
                    >
                      {formatIDR(a)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Payment method</p>
                <Select value={topUpMethod} onValueChange={setTopUpMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TOP_UP_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full h-11" onClick={handleTopUp}>
                Top-up {formatIDR(topUpAmount)}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MobileShell>
  );
}
