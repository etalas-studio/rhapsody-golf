import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoyaltyBalances, useVouchers } from "@/lib/useApi";
import { formatIDR } from "@/lib/mockData";
import { Gift, Sparkles, Tag, CalendarClock, MapPin } from "lucide-react";

const TYPE_DISPLAY: Record<string, string> = {
  GreenFee: "Green Fee", FAndB: "F&B", Cart: "Cart", ProShop: "Pro Shop",
};
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/loyalty")({
  head: () => ({ meta: [{ title: "Rewards · Rhapsody App" }] }),
  component: AppLoyalty,
});

type VoucherTab = "active" | "redeemed" | "expired";

function AppLoyalty() {
  const { data: balances, loading: bLoading } = useLoyaltyBalances();
  const { data: vouchers, loading: vLoading } = useVouchers(undefined, true);
  const [tab, setTab] = useState<VoucherTab>("active");
  const navigate = useNavigate();

  const totalPts = balances?.reduce((sum, b) => sum + b.points, 0) ?? 0;
  const all = vouchers ?? [];
  const active = all.filter((v) => v.status === "Active");
  const redeemed = all.filter((v) => v.status === "Redeemed");
  const expired = all.filter((v) => v.status === "Expired");

  const TAB_LIST: { key: VoucherTab; label: string; count: number }[] = [
    { key: "active", label: "Active", count: active.length },
    { key: "redeemed", label: "Redeemed", count: redeemed.length },
    { key: "expired", label: "Expired", count: expired.length },
  ];

  const current = tab === "active" ? active : tab === "redeemed" ? redeemed : expired;

  function VoucherCard({ v, showRedeem }: { v: typeof all[number]; showRedeem?: boolean }) {
    const isPercent = v.discount_type === "Percentage";
    const discountLabel = isPercent
      ? `${v.discount_value}% OFF`
      : formatIDR(v.discount_value);
    const capLabel = isPercent && v.max_discount_cap
      ? `Max ${formatIDR(v.max_discount_cap)}`
      : null;
    const expiry = (() => {
      try { return format(parseISO(v.expiry_date), "d MMM yyyy"); } catch { return v.expiry_date; }
    })();
    const isExpiredOrRedeemed = tab === "redeemed" || tab === "expired";

    return (
      <div className={`rounded-2xl overflow-hidden shadow-elegant border border-border/60 ${isExpiredOrRedeemed ? "opacity-60" : ""}`}>
        {/* Club header strip */}
        <div className="bg-gradient-to-r from-primary to-primary/70 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-primary-foreground/80" />
            <span className="text-xs font-medium text-primary-foreground truncate max-w-[180px]">
              {v.clubs?.name ?? v.club_name ?? "Rhapsody Golf"}
            </span>
          </div>
          <Badge className="bg-white/20 text-white border-0 text-[10px] shrink-0">
            {TYPE_DISPLAY[v.type] ?? v.type}
          </Badge>
        </div>

        {/* Ticket body */}
        <div className="bg-card px-4 pt-3 pb-3">
          {/* Discount headline */}
          <div className="flex items-end justify-between gap-2 mb-2">
            <div>
              <p className="font-display text-3xl font-semibold text-primary leading-none">
                {discountLabel}
              </p>
              {capLabel && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{capLabel}</p>
              )}
              {v.title && (
                <p className="text-xs text-muted-foreground mt-1 leading-tight">{v.title}</p>
              )}
            </div>
            <Tag className="h-8 w-8 text-primary/20 shrink-0" />
          </div>

          {/* Dashed divider */}
          <div className="border-t border-dashed border-border my-2.5" />

          {/* Footer row */}
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <p className="font-mono text-xs font-bold tracking-wider text-foreground">{v.voucher_code}</p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <CalendarClock className="h-3 w-3" />
                <span>
                  {tab === "redeemed" ? "Redeemed" : tab === "expired" ? "Expired" : "Valid until"} {expiry}
                </span>
              </div>
            </div>
            {showRedeem && (
              <Button size="sm" className="h-7 text-xs px-3 shrink-0 shadow-glow"
                onClick={() => {
                  if (v.type === "Green Fee" && v.club_id) {
                    navigate({ to: "/app/courses/$courseId", params: { courseId: v.club_id } });
                  } else {
                    toast.success("Voucher redeemed (mock)");
                  }
                }}>
                Use Now
              </Button>
            )}
            {tab === "redeemed" && (
              <Badge variant="secondary" className="text-[10px]">Used</Badge>
            )}
            {tab === "expired" && (
              <Badge variant="destructive" className="text-[10px]">Expired</Badge>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <MobileShell>
      <div className="px-4 py-5 space-y-5">
        <h1 className="font-display text-2xl">Rewards</h1>

        {/* Total points */}
        <Card className="bg-gradient-card shadow-elegant">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gold/20 grid place-items-center shrink-0">
              <Sparkles className="h-5 w-5 text-gold" />
            </div>
            {bLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div>
                <p className="text-2xl font-display">{totalPts.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total loyalty points</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Points by club */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">By club</h2>
          {bLoading ? (
            <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : (balances ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No points yet. Book a round to start earning!</p>
          ) : (
            <div className="space-y-2">
              {(balances ?? []).map((b) => (
                <Card key={b.club_id} className="shadow-sm">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">{b.club_name}</p>
                    </div>
                    <span className="text-sm font-semibold text-gold">{b.points.toLocaleString()} pts</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Vouchers with tabs */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Vouchers</h2>

          {/* Tab bar */}
          <div className="flex border-b border-border mb-3">
            {TAB_LIST.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  tab === key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>

          {vLoading ? (
            <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : current.length === 0 ? (
            <p className="text-sm text-muted-foreground">No {tab} vouchers.</p>
          ) : (
            <div className="space-y-2">
              {current.map((v) => (
                <VoucherCard key={v.id} v={v} showRedeem={tab === "active"} />
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileShell>
  );
}
