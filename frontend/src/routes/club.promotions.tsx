import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/appContext";
import { useAdminCampaigns } from "@/lib/useApi";
import { api, type ApiCampaign } from "@/lib/api";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/club/promotions")({
  head: () => ({ meta: [{ title: "Promotions · Club Admin" }] }),
  component: Promotions,
});

const SEGMENTS = ["Paid members", "Inactive members", "Weekday players", "High spenders", "Birthday month members", "Visitors who played in last 90 days"];
const TYPES = ["Voucher", "Discount", "Bonus Points", "Tournament Invitation", "F&B Promo"];

function Promotions() {
  const { selectedClubId } = useApp();
  const { data: campaigns, loading } = useAdminCampaigns(selectedClubId);
  const [localCampaigns, setLocalCampaigns] = useState<ApiCampaign[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", segment: SEGMENTS[0], type: TYPES[0], start: "", end: "" });

  const list = [...localCampaigns, ...(campaigns ?? [])];

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const created = await api.admin.campaigns.create({
        club_id: selectedClubId,
        title: form.title,
        description: null,
        status: "Active",
        start_date: form.start || null,
        end_date: form.end || null,
      });
      setLocalCampaigns((prev) => [created, ...prev]);
      setOpen(false);
      setForm({ title: "", segment: SEGMENTS[0], type: TYPES[0], start: "", end: "" });
      toast.success("Campaign created.");
    } catch {
      toast.error("Failed to create campaign. Try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell>
      <PageHeader title="Promotions" subtitle="Build segmented campaigns for members and visitors of your club." action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" /> New campaign</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create campaign</DialogTitle></DialogHeader>
            <form className="space-y-3" onSubmit={createCampaign}>
              <div>
                <Label>Title</Label>
                <Input placeholder="e.g. June Weekday Member Boost" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Target segment</Label>
                  <Select value={form.segment} onValueChange={(v) => setForm((f) => ({ ...f, segment: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Campaign type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Starts</Label><Input type="date" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} /></div>
                <div><Label>Ends</Label><Input type="date" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating}>{creating ? "Creating…" : "Launch"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      } />

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0,1,2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : list.length === 0 ? (
        <Card className="shadow-elegant">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No campaigns yet. Create your first one to engage members.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {list.map((c) => (
            <Card key={c.id} className="shadow-elegant">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{c.title}</CardTitle>
                  {c.start_date && c.end_date && (
                    <div className="text-xs text-muted-foreground mt-1">{c.start_date} → {c.end_date}</div>
                  )}
                </div>
                <Badge variant={c.status === "Active" ? "default" : c.status === "Ended" ? "secondary" : "outline"}>{c.status}</Badge>
              </CardHeader>
              <CardContent>
                {c.description && <p className="text-sm text-muted-foreground mb-3">{c.description}</p>}
                <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  {c.start_date && <span>Starts {c.start_date}</span>}
                  {c.end_date && <span>· Ends {c.end_date}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
