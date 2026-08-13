import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
// ponytail: paymentMethods stays static until saved-payment-methods endpoint is added
import { formatIDR, paymentMethods } from "@/lib/mockData";
import { useLoyaltyBalances, useLoyaltyHistory } from "@/lib/useApi";
import { useApp } from "@/lib/appContext";
import { Shield, Plus, ArrowDownLeft, ArrowUpRight, Wallet, Coins } from "lucide-react";
import { useState } from "react";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/golfer/wallet")({
  head: () => ({ meta: [{ title: "Wallet · Rhapsody" }] }),
  component: WalletPage,
});

const TOP_UP_AMOUNTS = [500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000];
const TOP_UP_METHODS = ["Bank Transfer", "QRIS", "GoPay", "OVO", "Dana"];

function WalletPage() {
  const { wallet, topUpGHV } = useApp();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(1_000_000);
  const [topUpMethod, setTopUpMethod] = useState(TOP_UP_METHODS[0]);
  const [topUpDone, setTopUpDone] = useState(false);

  const { data: balances } = useLoyaltyBalances();
  const { data: history, loading: hLoading } = useLoyaltyHistory();

  const totalGhp = (balances ?? []).reduce((sum, b) => sum + b.points, 0);

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

  return (
    <AppShell>
      <PageHeader title="Wallet & Payments" subtitle="Manage your GolfHub Value, Points, and saved payment methods." />

      {/* Balance cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="shadow-elegant bg-gradient-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">GHV Balance</p>
                <p className="text-[10px] text-muted-foreground">Golf Hub Value · IDR cash equivalent</p>
              </div>
            </div>
            <p className="font-display text-3xl text-foreground tabular-nums">{formatIDR(wallet.ghv)}</p>
            <Button size="sm" className="mt-4" onClick={() => setTopUpOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Top-up GHV
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-elegant bg-gradient-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-gold/10 grid place-items-center">
                <Coins className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">GHP Balance</p>
                <p className="text-[10px] text-muted-foreground">Golf Hub Points · earn on every booking</p>
              </div>
            </div>
            <p className="font-display text-3xl text-foreground tabular-nums">
              {totalGhp.toLocaleString("id-ID")} <span className="text-base font-sans text-muted-foreground">pts</span>
            </p>
            <p className="text-xs text-muted-foreground mt-4">Redeem at checkout · 1 pt ≈ Rp 100</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction history */}
      <Card className="shadow-elegant mb-6">
        <CardHeader><CardTitle>Transaction history</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="ghp">
            <div className="px-6 pt-2">
              <TabsList>
                <TabsTrigger value="ghv">GHV</TabsTrigger>
                <TabsTrigger value="ghp">GHP</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="ghv" className="mt-0">
              {/* ponytail: GHV transaction ledger has no dedicated API endpoint yet — add when payment history endpoint is built */}
              <div className="p-8 text-center text-sm text-muted-foreground">
                GHV transaction history will appear here once the payment history API is connected.
              </div>
            </TabsContent>

            <TabsContent value="ghp" className="mt-0">
              {hLoading ? (
                <div className="p-4 space-y-2">
                  {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 rounded" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Club</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(history?.entries ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No loyalty transactions yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (history?.entries ?? []).map((h) => {
                        const isEarn = h.type === "Earn";
                        const dateStr = (() => {
                          try { return format(parseISO(h.created_at), "d MMM yyyy"); } catch { return h.created_at; }
                        })();
                        return (
                          <TableRow key={h.id}>
                            <TableCell className="text-sm">{h.club_name ?? h.club_id}</TableCell>
                            <TableCell className="text-sm">
                              <span className="inline-flex items-center gap-1.5">
                                {isEarn
                                  ? <ArrowDownLeft className="h-3.5 w-3.5 text-success shrink-0" />
                                  : <ArrowUpRight className="h-3.5 w-3.5 text-destructive shrink-0" />}
                                {h.description}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{dateStr}</TableCell>
                            <TableCell className={`text-right tabular-nums font-medium ${isEarn ? "text-success" : ""}`}>
                              {isEarn ? "+" : "−"}{Math.abs(h.points).toLocaleString()} pts
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Saved payment methods */}
      <Card className="shadow-elegant">
        <CardHeader><CardTitle>Saved payment methods</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" /> Raw card data is never stored — all methods are tokenised.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paymentMethods.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border p-4">
                <span className="text-2xl">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.type}</p>
                </div>
                {m.id === "pm-1" && <Badge variant="outline">Default</Badge>}
              </div>
            ))}
            <button className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              <Plus className="h-4 w-4" /> Add method
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Top-up dialog */}
      <Dialog open={topUpOpen} onOpenChange={(v) => { if (!v) closeTopUp(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Top-up GHV</DialogTitle>
            <DialogDescription>Choose an amount and payment method. This is a mock flow — no real transaction occurs.</DialogDescription>
          </DialogHeader>

          {topUpDone ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold">Top-up successful</p>
              <p className="text-sm text-muted-foreground mt-1">{formatIDR(topUpAmount)} added to your GHV balance.</p>
              <Button className="mt-6 w-full" onClick={closeTopUp}>Done</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Amount</p>
                <div className="grid grid-cols-3 gap-2">
                  {TOP_UP_AMOUNTS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setTopUpAmount(a)}
                      className={`rounded-lg border px-2 py-2.5 text-sm text-center transition-colors ${topUpAmount === a ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:border-primary/50"}`}
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
                    {TOP_UP_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
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
    </AppShell>
  );
}
