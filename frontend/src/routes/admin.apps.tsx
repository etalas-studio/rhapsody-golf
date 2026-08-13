import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSuperAdminClubs } from "@/lib/useApi";
import { useState } from "react";

export const Route = createFileRoute("/admin/apps")({
  head: () => ({ meta: [{ title: "App Management · Superadmin" }] }),
  component: Apps,
});

const features = ["Booking", "Payment", "Loyalty", "Voucher", "Tournament", "Shopping"];

function Apps() {
  const { data: clubs, loading } = useSuperAdminClubs();
  const [selId, setSelId] = useState<string | null>(null);

  const sel = selId ?? clubs?.[0]?.id ?? null;
  const club = clubs?.find((c) => c.id === sel);

  return (
    <AppShell>
      <PageHeader title="App Management" subtitle="Manage the Rhapsody App and white-label club-branded apps." />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <Card className="shadow-elegant h-fit">
          <CardHeader><CardTitle className="text-sm">Apps</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <div className="rounded-md p-2 bg-accent text-accent-foreground text-sm flex items-center gap-2">
              ⛳ Rhapsody App <Badge variant="outline" className="ml-auto text-[10px]">Network</Badge>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground pt-3 pb-1 px-2">Club-Branded</div>
            {loading ? (
              <div className="space-y-1">{[0,1,2].map((i) => <Skeleton key={i} className="h-9 rounded-md" />)}</div>
            ) : (clubs ?? []).map((c) => (
              <button key={c.id} onClick={() => setSelId(c.id)}
                className={`w-full text-left rounded-md p-2 text-sm flex items-center gap-2 ${sel === c.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                {/* ponytail: logo not in ApiSuperAdminClub v1 — use initial */}
                <span className="h-5 w-5 rounded grid place-items-center text-xs font-bold"
                  style={{ background: sel === c.id ? "rgba(255,255,255,0.2)" : (c.theme_color ?? "var(--primary)"), color: "white" }}>
                  {c.name.charAt(0)}
                </span>
                {c.name}
              </button>
            ))}
          </CardContent>
        </Card>

        {club ? (
          <div className="space-y-6">
            <Card className="shadow-elegant overflow-hidden">
              {/* ponytail: banner not in ApiSuperAdminClub v1 — use theme_color gradient */}
              <div className="h-32 relative" style={{ background: `linear-gradient(135deg, ${club.theme_color ?? "var(--primary)"}, ${club.theme_color ?? "var(--primary)"}aa)` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-3 left-5 text-white">
                  <div className="font-display text-2xl">{club.name}</div>
                  <div className="text-xs opacity-80">{club.location}, {club.region} · powered by Rhapsody</div>
                </div>
              </div>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5">
                <div><Label>App display name</Label><Input defaultValue={`${club.name} Club`} /></div>
                <div>
                  <Label>Theme color</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input defaultValue={club.theme_color ?? ""} />
                    <div className="h-10 w-10 rounded-md border" style={{ background: club.theme_color ?? "var(--primary)" }} />
                  </div>
                </div>
                <div><Label>Website URL</Label><Input defaultValue={club.website_url ?? ""} /></div>
                <div className="sm:col-span-2">
                  <Label>Club-specific terms (URL)</Label>
                  <Input defaultValue={`https://${club.name.toLowerCase().replace(/\s+/g, "")}.rhapsody.app/terms`} />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-elegant">
              <CardHeader><CardTitle>Enabled features</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-3">
                {features.map((f, i) => (
                  <div key={f} className="flex items-center justify-between rounded-lg border p-3">
                    <Label className="text-sm">{f}</Label>
                    <Switch defaultChecked={i < 5} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ) : (
          <div className="text-sm text-muted-foreground p-6">Select a club to manage its app settings.</div>
        )}
      </div>
    </AppShell>
  );
}
