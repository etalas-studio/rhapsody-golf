import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/appContext";
import { useLoyaltyHistory } from "@/lib/useApi";
import { api, type ApiLoyaltyRule } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/club/loyalty")({
  head: () => ({ meta: [{ title: "Loyalty Rules · Club Admin" }] }),
  component: LoyaltyRules,
});

const DEFAULT_RULE: ApiLoyaltyRule = {
  club_id: "",
  pts_per_spending: 1,
  weekday_multiplier: 1.5,
  visit_bonus: 100,
  min_spend: 50000,
  active: true,
};

function LoyaltyRules() {
  const { selectedClubId } = useApp();
  const { data: history, loading: histLoading } = useLoyaltyHistory({ clubId: selectedClubId });
  const [rule, setRule] = useState<ApiLoyaltyRule>({ ...DEFAULT_RULE, club_id: selectedClubId });
  const [saving, setSaving] = useState(false);
  const [ruleLoading, setRuleLoading] = useState(true);

  useEffect(() => {
    if (!selectedClubId) return;
    api.admin.loyaltyRules.get(selectedClubId)
      .then((r) => setRule(r))
      .catch(() => { /* fallback to defaults */ })
      .finally(() => setRuleLoading(false));
  }, [selectedClubId]);

  async function saveRules() {
    setSaving(true);
    try {
      const updated = await api.admin.loyaltyRules.upsert(selectedClubId, rule);
      setRule(updated);
      toast.success("Loyalty rules saved.");
    } catch {
      toast.error("Failed to save rules. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const ledger = history?.entries ?? [];

  return (
    <AppShell>
      <PageHeader title="Loyalty Rules" subtitle="Set how members earn and redeem at your club." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-elegant">
          <CardHeader><CardTitle>Earn rules</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {ruleLoading ? (
              <div className="space-y-3">{[0,1,2].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
            ) : (
              <>
                <RuleRow
                  label="Active"
                  suffix="Enable loyalty program"
                  value={rule.active ? "On" : "Off"}
                  enabled={rule.active}
                  onToggle={(v) => setRule((r) => ({ ...r, active: v }))}
                />
                <RuleField
                  label="Points per Rp 10,000 spent"
                  suffix="pts"
                  value={String(rule.pts_per_spending)}
                  onChange={(v) => setRule((r) => ({ ...r, pts_per_spending: Number(v) || 0 }))}
                />
                <RuleField
                  label="Visit bonus"
                  suffix="pts per visit"
                  value={String(rule.visit_bonus)}
                  onChange={(v) => setRule((r) => ({ ...r, visit_bonus: Number(v) || 0 }))}
                />
                <RuleField
                  label="Weekday multiplier"
                  suffix="× on weekdays"
                  value={String(rule.weekday_multiplier)}
                  onChange={(v) => setRule((r) => ({ ...r, weekday_multiplier: Number(v) || 1 }))}
                />
                <RuleField
                  label="Minimum spend to earn"
                  suffix="Rp"
                  value={String(rule.min_spend)}
                  onChange={(v) => setRule((r) => ({ ...r, min_spend: Number(v) || 0 }))}
                />
                <Button className="w-full" onClick={saveRules} disabled={saving}>
                  {saving ? "Saving…" : "Save rules"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader><CardTitle>Loyalty ledger</CardTitle></CardHeader>
          <CardContent className="p-0">
            {histLoading ? (
              <div className="p-4 space-y-2">{[0,1,2,3].map((i) => <Skeleton key={i} className="h-10 rounded" />)}</div>
            ) : ledger.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">No loyalty activity yet for this club.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{l.created_at.slice(0, 10)}</TableCell>
                      <TableCell className="text-sm">{l.club_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{l.type}</Badge>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{l.description}</div>
                      </TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${l.points > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                        {l.points > 0 ? "+" : ""}{l.points.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function RuleRow({ label, suffix, value, enabled, onToggle }: {
  label: string; suffix: string; value: string; enabled: boolean; onToggle: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Switch checked={enabled} onCheckedChange={onToggle} />
      <div className="flex-1">
        <Label className="text-sm">{label}</Label>
        <div className="text-xs text-muted-foreground">{suffix}</div>
      </div>
      <div className="w-20 text-right text-sm font-medium">{value}</div>
    </div>
  );
}

function RuleField({ label, suffix, value, onChange }: {
  label: string; suffix: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="flex-1">
        <Label className="text-sm">{label}</Label>
        <div className="text-xs text-muted-foreground">{suffix}</div>
      </div>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="w-28 text-right" />
    </div>
  );
}
