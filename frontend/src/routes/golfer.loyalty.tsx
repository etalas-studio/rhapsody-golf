import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatIDR } from "@/lib/mockData";
import { useLoyaltyBalances, useVouchers } from "@/lib/useApi";
import { useApp } from "@/lib/appContext";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/golfer/loyalty")({
  head: () => ({ meta: [{ title: "Loyalty & Vouchers · Rhapsody" }] }),
  component: Loyalty,
});

function Loyalty() {
  const { appMode, selectedClubId } = useApp();
  const branded = appMode === "club_branded";
  const { data: balances, loading: bLoading } = useLoyaltyBalances();
  const { data: vouchers, loading: vLoading } = useVouchers(
    branded ? selectedClubId : undefined
  );

  const filteredBalances = branded
    ? (balances ?? []).filter((b) => b.club_id === selectedClubId)
    : (balances ?? []);

  const active = (vouchers ?? []).filter((v) => v.status === "Active");
  const redeemed = (vouchers ?? []).filter((v) => v.status === "Redeemed");
  const expired = (vouchers ?? []).filter((v) => v.status === "Expired");

  return (
    <AppShell>
      <PageHeader
        title="Loyalty & Vouchers"
        subtitle="Points and vouchers are tracked separately per golf course. Network points are shared."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {bLoading
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : filteredBalances.map((b) => (
              <Card key={b.club_id} className="shadow-elegant">
                <CardContent className="p-5">
                  <div className="text-2xl">⛳</div>
                  <div className="mt-2 text-xs text-muted-foreground">{b.club_name}</div>
                  <div className="font-display text-2xl mt-0.5">
                    {b.points.toLocaleString()}
                    <span className="text-sm text-muted-foreground"> pts</span>
                  </div>
                </CardContent>
              </Card>
            ))}
        {!branded && !bLoading && (
          <Card className="shadow-elegant ring-gold">
            <CardContent className="p-5">
              <div className="text-2xl">
                <Sparkles className="h-6 w-6 text-gold" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Rhapsody Network</div>
              <div className="font-display text-2xl mt-0.5">
                {(balances ?? []).reduce((s, b) => s + b.points, 0).toLocaleString()}
                <span className="text-sm text-muted-foreground"> pts</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="redeemed">Redeemed ({redeemed.length})</TabsTrigger>
          <TabsTrigger value="expired">Expired ({expired.length})</TabsTrigger>
        </TabsList>
        {[
          { v: "active", list: active },
          { v: "redeemed", list: redeemed },
          { v: "expired", list: expired },
        ].map(({ v, list }) => (
          <TabsContent key={v} value={v} className="mt-4">
            {vLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-36 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((vc) => {
                  const discountLabel =
                    vc.discount_type === "Percentage"
                      ? `${vc.discount_value}% OFF${vc.max_discount_cap ? ` (max ${formatIDR(vc.max_discount_cap)})` : ""}`
                      : formatIDR(vc.discount_value);
                  const expiry = (() => {
                    try {
                      return format(parseISO(vc.expiry_date), "d MMM yyyy");
                    } catch {
                      return vc.expiry_date;
                    }
                  })();
                  return (
                    <Card key={vc.id} className="shadow-elegant overflow-hidden">
                      <div className="h-1.5 bg-gradient-to-r from-primary to-primary-glow" />
                      <CardContent className="p-5 space-y-2">
                        <div className="flex gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">{vc.type}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{vc.discount_type === "Percentage" ? "%" : "IDR"}</Badge>
                        </div>
                        <div className="font-display text-xl">{discountLabel}</div>
                        <div className="font-mono text-xs text-muted-foreground">{vc.voucher_code}</div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-xs text-muted-foreground">
                            {vc.club_name ?? vc.club_id}
                          </div>
                          <Badge
                            variant={vc.status === "Active" ? "default" : "secondary"}
                            className={
                              vc.status === "Active" ? "bg-success text-success-foreground" : ""
                            }
                          >
                            {vc.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">Expires {expiry}</div>
                        {vc.status === "Active" && (
                          <Button
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => toast.success("Voucher redeemed (mock)")}
                          >
                            Redeem
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {list.length === 0 && (
                  <div className="text-sm text-muted-foreground col-span-full p-8 text-center">
                    No vouchers here.
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </AppShell>
  );
}
